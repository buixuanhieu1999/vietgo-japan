-- ============================================================
-- VietGo Japan — Row Level Security policies
-- Principle: deny by default; least privilege; no using(true) on private data
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prefectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_required_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ---------- profiles ----------
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------- user_roles ----------
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY user_roles_admin_manage ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role('super_admin') OR public.has_role('admin'))
  WITH CHECK (public.has_role('super_admin') OR public.has_role('admin'));

-- ---------- transport operators ----------
CREATE POLICY operators_public_read ON public.transport_operators
  FOR SELECT TO anon, authenticated
  USING (
    deleted_at IS NULL
    AND is_publicly_listed = true
    AND verification_status = 'verified'
  );

CREATE POLICY operators_staff_read ON public.transport_operators
  FOR SELECT TO authenticated
  USING (public.has_any_role('dispatcher', 'admin', 'super_admin'));

CREATE POLICY operators_admin_write ON public.transport_operators
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY operator_docs_admin ON public.operator_documents
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------- drivers ----------
CREATE POLICY drivers_self_select ON public.drivers
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_any_role('dispatcher', 'admin', 'super_admin')
  );

CREATE POLICY drivers_admin_write ON public.drivers
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.has_role('dispatcher'))
  WITH CHECK (public.is_admin() OR public.has_role('dispatcher'));

CREATE POLICY driver_docs_staff ON public.driver_documents
  FOR ALL TO authenticated
  USING (public.has_any_role('dispatcher', 'admin', 'super_admin'))
  WITH CHECK (public.has_any_role('dispatcher', 'admin', 'super_admin'));

-- ---------- vehicles ----------
CREATE POLICY vehicles_staff_select ON public.vehicles
  FOR SELECT TO authenticated
  USING (
    public.has_any_role('dispatcher', 'driver', 'admin', 'super_admin')
  );

CREATE POLICY vehicles_admin_write ON public.vehicles
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.has_role('dispatcher'))
  WITH CHECK (public.is_admin() OR public.has_role('dispatcher'));

CREATE POLICY vehicle_docs_staff ON public.vehicle_documents
  FOR ALL TO authenticated
  USING (public.has_any_role('dispatcher', 'admin', 'super_admin'))
  WITH CHECK (public.has_any_role('dispatcher', 'admin', 'super_admin'));

-- ---------- public reference data ----------
CREATE POLICY prefectures_public_read ON public.prefectures
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY prefectures_admin_write ON public.prefectures
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY airports_public_read ON public.airports
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY airports_admin_write ON public.airports
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY service_areas_public_read ON public.service_areas
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY service_areas_admin_write ON public.service_areas
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY routes_public_read ON public.routes
  FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL AND is_public = true AND is_active = true);

CREATE POLICY routes_staff_all ON public.routes
  FOR ALL TO authenticated
  USING (public.has_any_role('dispatcher', 'admin', 'super_admin'))
  WITH CHECK (public.has_any_role('dispatcher', 'admin', 'super_admin'));

CREATE POLICY route_stops_public_read ON public.route_stops
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = route_id AND r.deleted_at IS NULL AND r.is_public AND r.is_active
    )
  );

CREATE POLICY route_stops_staff_all ON public.route_stops
  FOR ALL TO authenticated
  USING (public.has_any_role('dispatcher', 'admin', 'super_admin'))
  WITH CHECK (public.has_any_role('dispatcher', 'admin', 'super_admin'));

-- ---------- trips ----------
CREATE POLICY trips_public_read ON public.trips
  FOR SELECT TO anon, authenticated
  USING (
    deleted_at IS NULL
    AND is_public = true
    AND status IN ('scheduled', 'boarding')
  );

CREATE POLICY trips_driver_select ON public.trips
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_id AND d.user_id = auth.uid()
    )
    OR public.has_any_role('dispatcher', 'admin', 'super_admin')
  );

CREATE POLICY trips_staff_write ON public.trips
  FOR ALL TO authenticated
  USING (public.has_any_role('dispatcher', 'admin', 'super_admin'))
  WITH CHECK (public.has_any_role('dispatcher', 'admin', 'super_admin'));

CREATE POLICY trip_stops_public_read ON public.trip_stops
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_id AND t.deleted_at IS NULL AND t.is_public
        AND t.status IN ('scheduled', 'boarding')
    )
  );

CREATE POLICY trip_stops_staff ON public.trip_stops
  FOR ALL TO authenticated
  USING (public.has_any_role('dispatcher', 'admin', 'super_admin'))
  WITH CHECK (public.has_any_role('dispatcher', 'admin', 'super_admin'));

-- ---------- bookings ----------
-- Inserts for guests go through Edge Function (service role).
-- Authenticated customers can insert their own bookings.
CREATE POLICY bookings_customer_select ON public.bookings
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_any_role('dispatcher', 'admin', 'super_admin', 'support_agent')
    OR (
      public.has_role('driver')
      AND assigned_driver_id IN (
        SELECT d.id FROM public.drivers d WHERE d.user_id = auth.uid()
      )
    )
  );

CREATE POLICY bookings_customer_insert ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY bookings_customer_update ON public.bookings
  FOR UPDATE TO authenticated
  USING (
    (user_id = auth.uid() AND status IN (
      'requested', 'quoted', 'awaiting_customer_confirmation', 'confirmed'
    ))
    OR public.has_any_role('dispatcher', 'admin', 'super_admin')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_any_role('dispatcher', 'admin', 'super_admin')
  );

CREATE POLICY booking_passengers_access ON public.booking_passengers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (
          b.user_id = auth.uid()
          OR public.has_any_role('dispatcher', 'admin', 'super_admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (
          b.user_id = auth.uid()
          OR public.has_any_role('dispatcher', 'admin', 'super_admin')
        )
    )
  );

CREATE POLICY booking_status_history_select ON public.booking_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (
          b.user_id = auth.uid()
          OR public.has_any_role('dispatcher', 'admin', 'super_admin', 'support_agent')
        )
    )
  );

CREATE POLICY trip_bookings_staff ON public.trip_bookings
  FOR ALL TO authenticated
  USING (public.has_any_role('dispatcher', 'admin', 'super_admin'))
  WITH CHECK (public.has_any_role('dispatcher', 'admin', 'super_admin'));

CREATE POLICY trip_bookings_customer_select ON public.trip_bookings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.user_id = auth.uid()
    )
  );

-- ---------- pricing / quotes / payments ----------
CREATE POLICY pricing_public_read ON public.pricing_rules
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY pricing_admin_write ON public.pricing_rules
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY quotes_access ON public.quotes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (b.user_id = auth.uid() OR public.is_staff())
    )
  );

CREATE POLICY quotes_staff_write ON public.quotes
  FOR ALL TO authenticated
  USING (public.has_any_role('dispatcher', 'admin', 'super_admin'))
  WITH CHECK (public.has_any_role('dispatcher', 'admin', 'super_admin'));

CREATE POLICY payment_records_select ON public.payment_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (b.user_id = auth.uid() OR public.is_admin() OR public.has_role('dispatcher'))
    )
  );

CREATE POLICY payment_records_staff_write ON public.payment_records
  FOR ALL TO authenticated
  USING (public.has_any_role('dispatcher', 'admin', 'super_admin'))
  WITH CHECK (public.has_any_role('dispatcher', 'admin', 'super_admin'));

-- ---------- support ----------
CREATE POLICY support_types_public_read ON public.support_service_types
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY support_types_admin_write ON public.support_service_types
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY support_requests_customer_select ON public.support_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR assignee_id = auth.uid()
    OR public.has_any_role('support_agent', 'admin', 'super_admin')
  );

CREATE POLICY support_requests_customer_insert ON public.support_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY support_requests_customer_update ON public.support_requests
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR assignee_id = auth.uid()
    OR public.has_any_role('support_agent', 'admin', 'super_admin')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR assignee_id = auth.uid()
    OR public.has_any_role('support_agent', 'admin', 'super_admin')
  );

CREATE POLICY support_messages_access ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_requests sr
      WHERE sr.id = support_request_id
        AND (
          sr.user_id = auth.uid()
          OR sr.assignee_id = auth.uid()
          OR public.has_any_role('support_agent', 'admin', 'super_admin')
        )
    )
    AND (
      is_internal = false
      OR public.has_any_role('support_agent', 'admin', 'super_admin')
    )
  );

CREATE POLICY support_messages_insert ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_requests sr
      WHERE sr.id = support_request_id
        AND (
          sr.user_id = auth.uid()
          OR sr.assignee_id = auth.uid()
          OR public.has_any_role('support_agent', 'admin', 'super_admin')
        )
    )
    AND (
      is_internal = false
      OR public.has_any_role('support_agent', 'admin', 'super_admin')
    )
  );

CREATE POLICY support_required_docs_access ON public.support_required_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_requests sr
      WHERE sr.id = support_request_id
        AND (
          sr.user_id = auth.uid()
          OR sr.assignee_id = auth.uid()
          OR public.has_any_role('support_agent', 'admin', 'super_admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_requests sr
      WHERE sr.id = support_request_id
        AND (
          sr.user_id = auth.uid()
          OR sr.assignee_id = auth.uid()
          OR public.has_any_role('support_agent', 'admin', 'super_admin')
        )
    )
  );

-- ---------- private files ----------
CREATE POLICY private_files_owner_select ON public.private_files
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      owner_user_id = auth.uid()
      OR uploaded_by = auth.uid()
      OR public.has_any_role('support_agent', 'admin', 'super_admin')
    )
  );

CREATE POLICY private_files_insert ON public.private_files
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    OR public.is_staff()
  );

CREATE POLICY private_files_update ON public.private_files
  FOR UPDATE TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR public.has_any_role('support_agent', 'admin', 'super_admin')
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    OR public.has_any_role('support_agent', 'admin', 'super_admin')
  );

-- ---------- notifications ----------
CREATE POLICY notifications_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notifications_staff_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff() OR user_id = auth.uid());

-- ---------- contact (insert via edge function preferred; staff read) ----------
CREATE POLICY contact_staff_select ON public.contact_messages
  FOR SELECT TO authenticated
  USING (public.has_any_role('support_agent', 'admin', 'super_admin'));

CREATE POLICY contact_staff_update ON public.contact_messages
  FOR UPDATE TO authenticated
  USING (public.has_any_role('support_agent', 'admin', 'super_admin'))
  WITH CHECK (public.has_any_role('support_agent', 'admin', 'super_admin'));

-- ---------- CMS ----------
CREATE POLICY content_pages_public_read ON public.content_pages
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY content_pages_admin ON public.content_pages
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY faqs_public_read ON public.faqs
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE POLICY faqs_admin ON public.faqs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY site_settings_public_read ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (is_public = true);

CREATE POLICY site_settings_admin ON public.site_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------- audit logs ----------
CREATE POLICY audit_logs_admin_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Explicitly no UPDATE/DELETE policies for audit_logs
-- Super admin cannot delete audit logs via RLS

-- Restrict reserve/release seat functions
REVOKE ALL ON FUNCTION public.reserve_trip_seats(uuid, uuid, integer, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_trip_seats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_trip_seats(uuid, uuid, integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_trip_seats(uuid) TO authenticated, service_role;
