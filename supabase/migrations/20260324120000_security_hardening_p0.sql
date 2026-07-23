-- ============================================================
-- P0 Security hardening: seats, RLS, audit, rate limit,
-- idempotency, outbox, trusted RPCs
-- ============================================================

-- ---------- Rate limit (durable) ----------
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket text NOT NULL,
  subject text NOT NULL,
  window_start timestamptz NOT NULL,
  hit_count integer NOT NULL DEFAULT 0 CHECK (hit_count >= 0),
  PRIMARY KEY (bucket, subject, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_window
  ON public.rate_limit_buckets (window_start);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated — service role / SECURITY DEFINER only

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket text,
  p_subject text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE (allowed boolean, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_count integer;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 10;
  END IF;
  IF p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    p_window_seconds := 60;
  END IF;

  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.rate_limit_buckets (bucket, subject, window_start, hit_count)
  VALUES (p_bucket, p_subject, v_window_start, 1)
  ON CONFLICT (bucket, subject, window_start)
  DO UPDATE SET hit_count = public.rate_limit_buckets.hit_count + 1
  RETURNING rate_limit_buckets.hit_count INTO v_count;

  allowed := v_count <= p_limit;
  remaining := GREATEST(p_limit - v_count, 0);
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;

-- ---------- Idempotency + outbox ----------
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key text NOT NULL,
  endpoint text NOT NULL,
  payload_hash text NOT NULL,
  resource_id uuid,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  PRIMARY KEY (key, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON public.idempotency_keys (expires_at);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending
  ON public.outbox_events (status, next_attempt_at)
  WHERE status IN ('pending', 'failed');

ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;

-- ---------- Trusted audit writer (no client forge) ----------
CREATE OR REPLACE FUNCTION public.write_audit_log_trusted(
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_actor_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_actor uuid;
BEGIN
  v_actor := coalesce(auth.uid(), p_actor_id);
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (v_actor, p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.write_audit_log_trusted(text, text, uuid, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.write_audit_log_trusted(text, text, uuid, jsonb, uuid) TO service_role;

-- Drop forgeable insert policy on audit_logs
DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
-- Keep admin select only; no insert/update/delete for authenticated

-- Revoke old write_audit_log from broad roles if it allowed client forge
REVOKE ALL ON FUNCTION public.write_audit_log(text, text, uuid, jsonb) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text, text, uuid, jsonb) TO service_role;

-- ---------- Fix seat reservation (delta + authz) ----------
CREATE OR REPLACE FUNCTION public.reserve_trip_seats(
  p_trip_id uuid,
  p_booking_id uuid,
  p_seats integer,
  p_actor uuid DEFAULT NULL
)
RETURNS public.trip_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip public.trips%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_existing public.trip_bookings%ROWTYPE;
  v_row public.trip_bookings%ROWTYPE;
  v_delta integer;
  v_actor uuid;
BEGIN
  v_actor := coalesce(auth.uid(), p_actor);

  -- Only staff (or service role without auth.uid) may reserve
  IF auth.uid() IS NOT NULL AND NOT public.has_any_role(
    'dispatcher'::public.app_role,
    'admin'::public.app_role,
    'super_admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_seats IS NULL OR p_seats <= 0 THEN
    RAISE EXCEPTION 'invalid_seat_count';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_booking.status IN (
    'cancelled_by_customer', 'cancelled_by_operator', 'rejected', 'no_show', 'completed'
  ) THEN
    RAISE EXCEPTION 'booking_not_reservable';
  END IF;

  IF p_seats > v_booking.passenger_count THEN
    RAISE EXCEPTION 'seats_exceed_passengers';
  END IF;

  SELECT * INTO v_trip
  FROM public.trips
  WHERE id = p_trip_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'trip_not_found';
  END IF;

  IF v_trip.status NOT IN ('draft', 'scheduled', 'boarding') THEN
    RAISE EXCEPTION 'trip_not_bookable';
  END IF;

  SELECT * INTO v_existing
  FROM public.trip_bookings
  WHERE trip_id = p_trip_id AND booking_id = p_booking_id
  FOR UPDATE;

  IF FOUND AND v_existing.status = 'confirmed' THEN
    v_delta := p_seats - v_existing.seats_reserved;
  ELSIF FOUND AND v_existing.status = 'cancelled' THEN
    v_delta := p_seats;
  ELSE
    v_delta := p_seats;
  END IF;

  IF v_delta > 0 AND v_trip.seats_available < v_delta THEN
    RAISE EXCEPTION 'insufficient_seats';
  END IF;

  INSERT INTO public.trip_bookings (
    trip_id, booking_id, seats_reserved, status, confirmed_by, confirmed_at
  )
  VALUES (
    p_trip_id, p_booking_id, p_seats, 'confirmed', v_actor, now()
  )
  ON CONFLICT (trip_id, booking_id) DO UPDATE
    SET seats_reserved = EXCLUDED.seats_reserved,
        status = 'confirmed',
        confirmed_by = EXCLUDED.confirmed_by,
        confirmed_at = now(),
        updated_at = now()
  RETURNING * INTO v_row;

  UPDATE public.trips
  SET seats_available = seats_available - v_delta,
      updated_at = now()
  WHERE id = p_trip_id
    AND seats_available - v_delta >= 0
    AND seats_available - v_delta <= total_seats;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'seat_update_failed';
  END IF;

  PERFORM public.write_audit_log_trusted(
    'trip.seats_reserved',
    'trip',
    p_trip_id,
    jsonb_build_object(
      'booking_id', p_booking_id,
      'seats', p_seats,
      'delta', v_delta
    ),
    v_actor
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_trip_seats(
  p_trip_booking_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.trip_bookings%ROWTYPE;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_any_role(
    'dispatcher'::public.app_role,
    'admin'::public.app_role,
    'super_admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_row
  FROM public.trip_bookings
  WHERE id = p_trip_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'trip_booking_not_found';
  END IF;

  IF v_row.status = 'cancelled' THEN
    RETURN;
  END IF;

  UPDATE public.trip_bookings
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_trip_booking_id;

  UPDATE public.trips
  SET seats_available = LEAST(total_seats, seats_available + v_row.seats_reserved),
      updated_at = now()
  WHERE id = v_row.trip_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_trip_seats(uuid, uuid, integer, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_trip_seats(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_trip_seats(uuid, uuid, integer, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_trip_seats(uuid) TO service_role;
-- Staff may call via authenticated only if they pass role check inside function
GRANT EXECUTE ON FUNCTION public.reserve_trip_seats(uuid, uuid, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_trip_seats(uuid) TO authenticated;

-- ---------- Customer cancel booking (narrow RPC) ----------
CREATE OR REPLACE FUNCTION public.customer_cancel_booking(
  p_booking_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_booking.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  IF v_booking.status NOT IN (
    'requested', 'reviewing', 'quoted', 'awaiting_customer_confirmation', 'confirmed'
  ) THEN
    RAISE EXCEPTION 'cancel_not_allowed';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled_by_customer',
      cancelled_at = now(),
      cancellation_reason = left(coalesce(p_reason, ''), 500),
      updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  PERFORM public.write_audit_log_trusted(
    'booking.cancelled_by_customer',
    'booking',
    p_booking_id,
    jsonb_build_object('reason', left(coalesce(p_reason, ''), 200)),
    auth.uid()
  );

  RETURN v_booking;
END;
$$;

REVOKE ALL ON FUNCTION public.customer_cancel_booking(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_cancel_booking(uuid, text) TO authenticated;

-- ---------- Staff status transition (whitelist) ----------
CREATE OR REPLACE FUNCTION public.staff_transition_booking(
  p_booking_id uuid,
  p_to_status public.booking_status,
  p_note text DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_from public.booking_status;
  v_ok boolean := false;
BEGIN
  IF NOT public.has_any_role(
    'dispatcher'::public.app_role,
    'admin'::public.app_role,
    'super_admin'::public.app_role,
    'support_agent'::public.app_role
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  v_from := v_booking.status;

  -- Allowed transitions (whitelist)
  IF v_from = 'requested' AND p_to_status IN ('reviewing', 'quoted', 'rejected', 'cancelled_by_operator') THEN
    v_ok := true;
  ELSIF v_from = 'reviewing' AND p_to_status IN ('quoted', 'rejected', 'cancelled_by_operator') THEN
    v_ok := true;
  ELSIF v_from = 'quoted' AND p_to_status IN ('awaiting_customer_confirmation', 'confirmed', 'rejected', 'cancelled_by_operator') THEN
    v_ok := true;
  ELSIF v_from = 'awaiting_customer_confirmation' AND p_to_status IN ('confirmed', 'cancelled_by_operator', 'rejected') THEN
    v_ok := true;
  ELSIF v_from = 'confirmed' AND p_to_status IN ('assigned', 'cancelled_by_operator', 'no_show') THEN
    v_ok := true;
  ELSIF v_from = 'assigned' AND p_to_status IN ('driver_en_route', 'cancelled_by_operator', 'no_show') THEN
    v_ok := true;
  ELSIF v_from = 'driver_en_route' AND p_to_status IN ('picked_up', 'no_show', 'cancelled_by_operator') THEN
    v_ok := true;
  ELSIF v_from = 'picked_up' AND p_to_status IN ('in_transit', 'completed') THEN
    v_ok := true;
  ELSIF v_from = 'in_transit' AND p_to_status IN ('completed') THEN
    v_ok := true;
  END IF;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'invalid_transition';
  END IF;

  UPDATE public.bookings
  SET status = p_to_status,
      completed_at = CASE WHEN p_to_status = 'completed' THEN now() ELSE completed_at END,
      cancelled_at = CASE WHEN p_to_status::text LIKE 'cancelled%' THEN now() ELSE cancelled_at END,
      internal_notes = CASE
        WHEN p_note IS NOT NULL AND length(trim(p_note)) > 0
          THEN coalesce(internal_notes || E'\n', '') || left(trim(p_note), 500)
        ELSE internal_notes
      END,
      updated_at = now()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  PERFORM public.write_audit_log_trusted(
    'booking.status_transition',
    'booking',
    p_booking_id,
    jsonb_build_object('from', v_from, 'to', p_to_status, 'note', left(coalesce(p_note, ''), 200)),
    auth.uid()
  );

  RETURN v_booking;
END;
$$;

REVOKE ALL ON FUNCTION public.staff_transition_booking(uuid, public.booking_status, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_transition_booking(uuid, public.booking_status, text) TO authenticated;

-- ---------- Tighten booking RLS: no broad customer UPDATE ----------
DROP POLICY IF EXISTS bookings_customer_update ON public.bookings;

-- Customers cannot direct-update bookings (use customer_cancel_booking RPC)
-- Staff retain write via policy:
CREATE POLICY bookings_staff_update ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.has_any_role('dispatcher', 'admin', 'super_admin', 'support_agent'))
  WITH CHECK (public.has_any_role('dispatcher', 'admin', 'super_admin', 'support_agent'));

-- Customers insert only when user_id matches self (or null for rare cases — prefer Edge Function)
DROP POLICY IF EXISTS bookings_customer_insert ON public.bookings;
CREATE POLICY bookings_customer_insert ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Support requests: customer update only non-terminal own tickets → restrict to cancel-like fields via no open update
DROP POLICY IF EXISTS support_requests_customer_update ON public.support_requests;
CREATE POLICY support_requests_staff_update ON public.support_requests
  FOR UPDATE TO authenticated
  USING (
    public.has_any_role('support_agent', 'admin', 'super_admin')
    OR assignee_id = auth.uid()
  )
  WITH CHECK (
    public.has_any_role('support_agent', 'admin', 'super_admin')
    OR assignee_id = auth.uid()
  );

-- Private files: owner can only update deletion_requested_at / soft fields — still allow owner update
-- but staff write remains

-- Notifications: no open staff insert for any user without staff check already present

-- Trip bookings: only staff (already)
