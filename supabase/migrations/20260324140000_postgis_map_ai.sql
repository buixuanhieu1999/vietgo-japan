-- ============================================================
-- P1: PostGIS geography + matching
-- P2 scaffold: pgvector content chunks for FAQ RAG
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Geography columns on bookings (nullable — filled when geocoded)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pickup_location extensions.geography(Point, 4326),
  ADD COLUMN IF NOT EXISTS dropoff_location extensions.geography(Point, 4326);

CREATE INDEX IF NOT EXISTS idx_bookings_pickup_location
  ON public.bookings USING gist (pickup_location)
  WHERE pickup_location IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_dropoff_location
  ON public.bookings USING gist (dropoff_location)
  WHERE dropoff_location IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS route_path extensions.geography(LineString, 4326);

CREATE INDEX IF NOT EXISTS idx_routes_path
  ON public.routes USING gist (route_path)
  WHERE route_path IS NOT NULL;

ALTER TABLE public.airports
  ADD COLUMN IF NOT EXISTS location extensions.geography(Point, 4326);

-- Sync lat/lng ↔ geography helpers
CREATE OR REPLACE FUNCTION public.set_booking_locations_from_coords()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pickup_latitude IS NOT NULL AND NEW.pickup_longitude IS NOT NULL THEN
    NEW.pickup_location := extensions.ST_SetSRID(
      extensions.ST_MakePoint(NEW.pickup_longitude, NEW.pickup_latitude),
      4326
    )::extensions.geography;
  END IF;
  IF NEW.dropoff_latitude IS NOT NULL AND NEW.dropoff_longitude IS NOT NULL THEN
    NEW.dropoff_location := extensions.ST_SetSRID(
      extensions.ST_MakePoint(NEW.dropoff_longitude, NEW.dropoff_latitude),
      4326
    )::extensions.geography;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_set_locations ON public.bookings;
CREATE TRIGGER bookings_set_locations
  BEFORE INSERT OR UPDATE OF pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude
  ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_booking_locations_from_coords();

-- Backfill airport locations when lat/lng present
UPDATE public.airports
SET location = extensions.ST_SetSRID(
  extensions.ST_MakePoint(longitude, latitude), 4326
)::extensions.geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;

-- Deterministic trip suggestions (NO LLM)
-- Hard constraints: date, seats, luggage, verified driver/vehicle/operator, status
CREATE OR REPLACE FUNCTION public.suggest_trips_for_booking(
  p_booking_id uuid,
  p_max_distance_m double precision DEFAULT 50000,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  trip_id uuid,
  route_id uuid,
  departure_date date,
  seats_available integer,
  estimated_price_jpy integer,
  distance_to_pickup_m double precision,
  operator_verified boolean,
  driver_verified boolean,
  vehicle_verified boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF NOT public.has_any_role(
    'dispatcher'::public.app_role,
    'admin'::public.app_role,
    'super_admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.route_id,
    t.departure_date,
    t.seats_available,
    t.estimated_price_jpy,
    CASE
      WHEN v_booking.pickup_location IS NOT NULL AND a.location IS NOT NULL
        THEN extensions.ST_Distance(v_booking.pickup_location, a.location)
      ELSE NULL
    END AS distance_to_pickup_m,
    (op.verification_status = 'verified') AS operator_verified,
    (d.verification_status = 'verified' OR t.driver_id IS NULL) AS driver_verified,
    (v.verification_status = 'verified' OR t.vehicle_id IS NULL) AS vehicle_verified
  FROM public.trips t
  JOIN public.transport_operators op ON op.id = t.operator_id AND op.deleted_at IS NULL
  LEFT JOIN public.drivers d ON d.id = t.driver_id AND d.deleted_at IS NULL
  LEFT JOIN public.vehicles v ON v.id = t.vehicle_id AND v.deleted_at IS NULL
  LEFT JOIN public.routes r ON r.id = t.route_id
  LEFT JOIN public.airports a ON a.id = v_booking.airport_id
  WHERE t.deleted_at IS NULL
    AND t.status IN ('scheduled', 'boarding', 'draft')
    AND t.seats_available >= v_booking.passenger_count
    AND (t.max_luggage IS NULL OR t.max_luggage >= v_booking.large_luggage)
    AND t.departure_date = v_booking.pickup_date
    AND op.verification_status = 'verified'
    AND (t.driver_id IS NULL OR d.verification_status = 'verified')
    AND (t.vehicle_id IS NULL OR v.verification_status = 'verified')
    AND (
      v_booking.pickup_location IS NULL
      OR a.location IS NULL
      OR extensions.ST_DWithin(v_booking.pickup_location, a.location, p_max_distance_m)
      OR r.route_path IS NULL
      OR extensions.ST_DWithin(v_booking.pickup_location, r.route_path, p_max_distance_m)
    )
  ORDER BY
    distance_to_pickup_m NULLS LAST,
    t.seats_available DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
END;
$$;

REVOKE ALL ON FUNCTION public.suggest_trips_for_booking(uuid, double precision, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suggest_trips_for_booking(uuid, double precision, integer) TO authenticated;

-- Service area polygons (optional display)
CREATE TABLE IF NOT EXISTS public.map_service_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_vi text NOT NULL,
  name_ja text,
  boundary extensions.geography(Polygon, 4326),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_map_service_zones_boundary
  ON public.map_service_zones USING gist (boundary);

ALTER TABLE public.map_service_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY map_zones_public_read ON public.map_service_zones
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY map_zones_admin ON public.map_service_zones
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------- AI / RAG scaffold (content only — no auto-actions) ----------
CREATE TABLE IF NOT EXISTS public.content_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('faq', 'content_page', 'policy', 'manual')),
  source_id uuid,
  locale text NOT NULL DEFAULT 'vi' CHECK (locale IN ('vi', 'ja', 'en')),
  title text,
  body text NOT NULL,
  -- 384-dim placeholder for mini embeddings; fill via worker later
  embedding extensions.vector(384),
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_chunks_source
  ON public.content_chunks (source_type, source_id)
  WHERE is_approved;

ALTER TABLE public.content_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_chunks_public_read ON public.content_chunks
  FOR SELECT TO anon, authenticated
  USING (is_approved = true);

CREATE POLICY content_chunks_admin ON public.content_chunks
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Feature flags (public read for non-secret flags)
INSERT INTO public.site_settings (key, value, is_public, description) VALUES
  ('features.maplibre', '{"enabled":true,"tileStyle":"https://tiles.openfreemap.org/styles/liberty"}', true, 'MapLibre style URL'),
  ('features.geoapify', '{"enabled":false,"note":"Set GEOAPIFY_API_KEY on Edge Functions"}', true, 'Server geocode/routing'),
  ('features.ai_faq', '{"enabled":true,"provider":"heuristic"}', true, 'FAQ assistant — approved content only'),
  ('features.ai_nl_booking', '{"enabled":true,"provider":"heuristic"}', true, 'NL draft only — user must confirm'),
  ('features.ai_message_draft', '{"enabled":false}', false, 'Staff VI-JA draft — review before send'),
  ('features.ai_ocr', '{"enabled":false,"mode":"browser_only"}', false, 'Browser OCR candidates only'),
  ('features.gemini', '{"enabled":false,"forbidden_pii":true}', false, 'Never send PII to Gemini Free')
ON CONFLICT (key) DO NOTHING;

-- Keyword FAQ retrieve (deterministic; embeddings optional later)
CREATE OR REPLACE FUNCTION public.search_content_chunks(
  p_query text,
  p_locale text DEFAULT 'vi',
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  source_type text,
  title text,
  body text,
  rank real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.source_type,
    c.title,
    c.body,
    ts_rank(
      to_tsvector('simple', coalesce(c.title, '') || ' ' || c.body),
      plainto_tsquery('simple', p_query)
    ) AS rank
  FROM public.content_chunks c
  WHERE c.is_approved = true
    AND c.locale = p_locale
    AND (
      to_tsvector('simple', coalesce(c.title, '') || ' ' || c.body)
      @@ plainto_tsquery('simple', p_query)
      OR c.body ILIKE '%' || p_query || '%'
      OR c.title ILIKE '%' || p_query || '%'
    )
  ORDER BY rank DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(p_limit, 20));
$$;

GRANT EXECUTE ON FUNCTION public.search_content_chunks(text, text, integer) TO anon, authenticated;

-- Seed chunks from published FAQs (approved content only)
INSERT INTO public.content_chunks (source_type, source_id, locale, title, body, is_approved)
SELECT 'faq', f.id, 'vi', f.question_vi, f.answer_vi, true
FROM public.faqs f
WHERE f.is_published = true
  AND NOT EXISTS (
    SELECT 1 FROM public.content_chunks c
    WHERE c.source_type = 'faq' AND c.source_id = f.id AND c.locale = 'vi'
  );

INSERT INTO public.content_chunks (source_type, source_id, locale, title, body, is_approved)
SELECT
  'faq', f.id, 'ja',
  coalesce(f.question_ja, f.question_vi),
  coalesce(f.answer_ja, f.answer_vi),
  true
FROM public.faqs f
WHERE f.is_published = true
  AND f.question_ja IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.content_chunks c
    WHERE c.source_type = 'faq' AND c.source_id = f.id AND c.locale = 'ja'
  );
