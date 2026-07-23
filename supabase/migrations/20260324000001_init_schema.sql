-- ============================================================
-- VietGo Japan — Initial schema
-- Licensed transport dispatch + document support platform
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE public.app_role AS ENUM (
  'customer',
  'support_agent',
  'dispatcher',
  'driver',
  'admin',
  'super_admin'
);

CREATE TYPE public.verification_status AS ENUM (
  'pending',
  'verified',
  'suspended',
  'rejected'
);

CREATE TYPE public.booking_status AS ENUM (
  'draft',
  'requested',
  'reviewing',
  'quoted',
  'awaiting_customer_confirmation',
  'confirmed',
  'assigned',
  'driver_en_route',
  'picked_up',
  'in_transit',
  'completed',
  'cancelled_by_customer',
  'cancelled_by_operator',
  'rejected',
  'no_show'
);

CREATE TYPE public.service_type AS ENUM (
  'airport_transfer',
  'shared_ride',
  'intercity',
  'factory_shuttle',
  'shift_shuttle',
  'private_charter',
  'other'
);

CREATE TYPE public.trip_status AS ENUM (
  'draft',
  'scheduled',
  'boarding',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE public.payment_method AS ENUM (
  'cash',
  'bank_transfer',
  'office',
  'other'
);

CREATE TYPE public.payment_status AS ENUM (
  'unpaid',
  'pending_verification',
  'paid',
  'refunded',
  'partial',
  'cancelled'
);

CREATE TYPE public.support_request_status AS ENUM (
  'submitted',
  'reviewing',
  'waiting_for_documents',
  'documents_received',
  'in_progress',
  'appointment_scheduled',
  'completed',
  'cancelled',
  'rejected'
);

CREATE TYPE public.priority_level AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

CREATE TYPE public.ride_preference AS ENUM (
  'shared',
  'private',
  'either'
);

CREATE TYPE public.terminal_type AS ENUM (
  'international',
  'domestic',
  'unknown'
);

-- ============================================================
-- HELPERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_booking_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'VG-';
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Role helpers (SECURITY DEFINER, no client-writable role source)
CREATE OR REPLACE FUNCTION public.has_role(check_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = check_role
      AND ur.revoked_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(VARIADIC roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = ANY (roles)
      AND ur.revoked_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_role(
    'support_agent'::public.app_role,
    'dispatcher'::public.app_role,
    'admin'::public.app_role,
    'super_admin'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_role('admin'::public.app_role, 'super_admin'::public.app_role);
$$;

-- ============================================================
-- TABLES
-- ============================================================

-- profiles (1:1 with auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  phone text,
  email text,
  line_id text,
  preferred_language text NOT NULL DEFAULT 'vi' CHECK (preferred_language IN ('vi', 'ja', 'en')),
  avatar_url text,
  notes_internal text,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- user_roles — roles NEVER stored only in JWT metadata for authorization
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_by uuid REFERENCES public.profiles (id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX idx_user_roles_user ON public.user_roles (user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_roles_role ON public.user_roles (role) WHERE revoked_at IS NULL;

CREATE TRIGGER user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- transport_operators (licensed carriers)
CREATE TABLE public.transport_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  trade_name text,
  business_registration_number text,
  license_type text,
  license_number text,
  license_expires_on date,
  operating_areas text[],
  verification_status public.verification_status NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  verified_by uuid REFERENCES public.profiles (id),
  contact_email text,
  contact_phone text,
  address text,
  notes_internal text,
  is_publicly_listed boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operator_public_requires_verified CHECK (
    is_publicly_listed = false OR verification_status = 'verified'
  )
);

CREATE INDEX idx_operators_status ON public.transport_operators (verification_status)
  WHERE deleted_at IS NULL;

CREATE TRIGGER transport_operators_updated_at
  BEFORE UPDATE ON public.transport_operators
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.operator_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.transport_operators (id) ON DELETE CASCADE,
  document_type text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes integer NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
  expires_on date,
  uploaded_by uuid REFERENCES public.profiles (id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER operator_documents_updated_at
  BEFORE UPDATE ON public.operator_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- drivers (must belong to a verified operator path)
CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles (id),
  operator_id uuid NOT NULL REFERENCES public.transport_operators (id),
  full_name text NOT NULL,
  phone text,
  license_number text,
  license_expires_on date,
  verification_status public.verification_status NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  verified_by uuid REFERENCES public.profiles (id),
  is_active boolean NOT NULL DEFAULT true,
  notes_internal text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_drivers_operator ON public.drivers (operator_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_drivers_user ON public.drivers (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_drivers_status ON public.drivers (verification_status) WHERE deleted_at IS NULL;

CREATE TRIGGER drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.driver_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers (id) ON DELETE CASCADE,
  document_type text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes integer NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
  expires_on date,
  uploaded_by uuid REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER driver_documents_updated_at
  BEFORE UPDATE ON public.driver_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- vehicles
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.transport_operators (id),
  plate_number text NOT NULL,
  make text,
  model text,
  year integer CHECK (year IS NULL OR (year >= 1990 AND year <= 2100)),
  color text,
  seat_capacity integer NOT NULL CHECK (seat_capacity > 0 AND seat_capacity <= 60),
  luggage_capacity integer CHECK (luggage_capacity IS NULL OR luggage_capacity >= 0),
  has_wheelchair_access boolean NOT NULL DEFAULT false,
  has_child_seat boolean NOT NULL DEFAULT false,
  verification_status public.verification_status NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  verified_by uuid REFERENCES public.profiles (id),
  is_active boolean NOT NULL DEFAULT true,
  notes_internal text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operator_id, plate_number)
);

CREATE INDEX idx_vehicles_operator ON public.vehicles (operator_id) WHERE deleted_at IS NULL;

CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.vehicle_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles (id) ON DELETE CASCADE,
  document_type text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes integer NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
  expires_on date,
  uploaded_by uuid REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER vehicle_documents_updated_at
  BEFORE UPDATE ON public.vehicle_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- geography reference
CREATE TABLE public.prefectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ja text NOT NULL,
  name_vi text NOT NULL,
  name_en text,
  region text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER prefectures_updated_at
  BEFORE UPDATE ON public.prefectures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.airports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iata_code text NOT NULL UNIQUE,
  name_ja text NOT NULL,
  name_vi text NOT NULL,
  name_en text,
  prefecture_id uuid REFERENCES public.prefectures (id),
  is_priority boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_airports_priority ON public.airports (is_priority, sort_order) WHERE is_active;

CREATE TRIGGER airports_updated_at
  BEFORE UPDATE ON public.airports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefecture_id uuid NOT NULL REFERENCES public.prefectures (id),
  name_vi text NOT NULL,
  name_ja text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER service_areas_updated_at
  BEFORE UPDATE ON public.service_areas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- routes & trips (shared rides)
CREATE TABLE public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name_vi text NOT NULL,
  name_ja text,
  name_en text,
  description_vi text,
  description_ja text,
  origin_prefecture_id uuid REFERENCES public.prefectures (id),
  destination_prefecture_id uuid REFERENCES public.prefectures (id),
  origin_label text,
  destination_label text,
  estimated_duration_minutes integer CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0),
  base_price_jpy integer CHECK (base_price_jpy IS NULL OR base_price_jpy >= 0),
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_routes_public ON public.routes (is_public, is_active) WHERE deleted_at IS NULL;

CREATE TRIGGER routes_updated_at
  BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes (id) ON DELETE CASCADE,
  stop_order integer NOT NULL CHECK (stop_order >= 0),
  name_vi text NOT NULL,
  name_ja text,
  address text,
  prefecture_id uuid REFERENCES public.prefectures (id),
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, stop_order)
);

CREATE TRIGGER route_stops_updated_at
  BEFORE UPDATE ON public.route_stops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes (id),
  operator_id uuid NOT NULL REFERENCES public.transport_operators (id),
  driver_id uuid REFERENCES public.drivers (id),
  vehicle_id uuid REFERENCES public.vehicles (id),
  departure_date date NOT NULL,
  pickup_window_start time,
  pickup_window_end time,
  total_seats integer NOT NULL CHECK (total_seats > 0),
  seats_available integer NOT NULL CHECK (seats_available >= 0),
  max_luggage integer CHECK (max_luggage IS NULL OR max_luggage >= 0),
  estimated_price_jpy integer CHECK (estimated_price_jpy IS NULL OR estimated_price_jpy >= 0),
  status public.trip_status NOT NULL DEFAULT 'draft',
  operations_notes text,
  is_public boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seats_available_lte_total CHECK (seats_available <= total_seats)
);

CREATE INDEX idx_trips_date ON public.trips (departure_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_trips_route ON public.trips (route_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_trips_driver ON public.trips (driver_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_trips_status ON public.trips (status) WHERE deleted_at IS NULL;

CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.trip_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  stop_order integer NOT NULL CHECK (stop_order >= 0),
  name text NOT NULL,
  address text,
  planned_time time,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, stop_order)
);

CREATE TRIGGER trip_stops_updated_at
  BEFORE UPDATE ON public.trip_stops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- bookings
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code text NOT NULL UNIQUE DEFAULT public.generate_booking_code(),
  user_id uuid REFERENCES public.profiles (id),
  service_type public.service_type NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'requested',
  ride_preference public.ride_preference NOT NULL DEFAULT 'either',
  pickup_address text NOT NULL,
  pickup_prefecture_id uuid REFERENCES public.prefectures (id),
  pickup_postal_code text,
  pickup_latitude numeric(10, 7),
  pickup_longitude numeric(10, 7),
  dropoff_address text NOT NULL,
  dropoff_prefecture_id uuid REFERENCES public.prefectures (id),
  dropoff_postal_code text,
  dropoff_latitude numeric(10, 7),
  dropoff_longitude numeric(10, 7),
  airport_id uuid REFERENCES public.airports (id),
  pickup_date date NOT NULL,
  pickup_time time,
  flight_number text,
  flight_arrival_time time,
  terminal public.terminal_type DEFAULT 'unknown',
  passenger_count integer NOT NULL DEFAULT 1 CHECK (passenger_count > 0 AND passenger_count <= 50),
  adults_count integer NOT NULL DEFAULT 1 CHECK (adults_count >= 0),
  children_count integer NOT NULL DEFAULT 0 CHECK (children_count >= 0),
  child_seats_needed integer NOT NULL DEFAULT 0 CHECK (child_seats_needed >= 0),
  large_luggage integer NOT NULL DEFAULT 0 CHECK (large_luggage >= 0),
  cabin_luggage integer NOT NULL DEFAULT 0 CHECK (cabin_luggage >= 0),
  wheelchair_needed boolean NOT NULL DEFAULT false,
  special_assistance text,
  time_flexible boolean NOT NULL DEFAULT false,
  flexible_window_minutes integer CHECK (flexible_window_minutes IS NULL OR flexible_window_minutes >= 0),
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  contact_email text NOT NULL,
  contact_line_id text,
  customer_notes text,
  internal_notes text,
  privacy_accepted boolean NOT NULL DEFAULT false,
  terms_accepted boolean NOT NULL DEFAULT false,
  quoted_price_jpy integer CHECK (quoted_price_jpy IS NULL OR quoted_price_jpy >= 0),
  payment_method public.payment_method,
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  assigned_driver_id uuid REFERENCES public.drivers (id),
  assigned_vehicle_id uuid REFERENCES public.vehicles (id),
  assigned_operator_id uuid REFERENCES public.transport_operators (id),
  lookup_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  cancelled_at timestamptz,
  cancellation_reason text,
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_privacy_terms CHECK (
    status = 'draft' OR (privacy_accepted = true AND terms_accepted = true)
  ),
  CONSTRAINT bookings_passengers_sum CHECK (adults_count + children_count = passenger_count)
);

CREATE INDEX idx_bookings_code ON public.bookings (booking_code);
CREATE INDEX idx_bookings_user ON public.bookings (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_status ON public.bookings (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_date ON public.bookings (pickup_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_email ON public.bookings (lower(contact_email));
CREATE INDEX idx_bookings_phone ON public.bookings (contact_phone);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.booking_passengers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  age_group text CHECK (age_group IN ('adult', 'child', 'infant')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER booking_passengers_updated_at
  BEFORE UPDATE ON public.booking_passengers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  from_status public.booking_status,
  to_status public.booking_status NOT NULL,
  changed_by uuid REFERENCES public.profiles (id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_status_history_booking ON public.booking_status_history (booking_id, created_at DESC);

-- trip_bookings: seat allocation with concurrency safety
CREATE TABLE public.trip_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips (id),
  booking_id uuid NOT NULL REFERENCES public.bookings (id),
  seats_reserved integer NOT NULL CHECK (seats_reserved > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  confirmed_by uuid REFERENCES public.profiles (id),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, booking_id)
);

CREATE INDEX idx_trip_bookings_trip ON public.trip_bookings (trip_id);
CREATE INDEX idx_trip_bookings_booking ON public.trip_bookings (booking_id);

CREATE TRIGGER trip_bookings_updated_at
  BEFORE UPDATE ON public.trip_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Safe seat reservation (race-condition safe)
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
  v_row public.trip_bookings%ROWTYPE;
BEGIN
  IF p_seats IS NULL OR p_seats <= 0 THEN
    RAISE EXCEPTION 'invalid_seat_count';
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

  IF v_trip.seats_available < p_seats THEN
    RAISE EXCEPTION 'insufficient_seats';
  END IF;

  INSERT INTO public.trip_bookings (trip_id, booking_id, seats_reserved, status, confirmed_by, confirmed_at)
  VALUES (p_trip_id, p_booking_id, p_seats, 'confirmed', p_actor, now())
  ON CONFLICT (trip_id, booking_id) DO UPDATE
    SET seats_reserved = EXCLUDED.seats_reserved,
        status = 'confirmed',
        confirmed_by = EXCLUDED.confirmed_by,
        confirmed_at = now(),
        updated_at = now()
  RETURNING * INTO v_row;

  UPDATE public.trips
  SET seats_available = seats_available - p_seats,
      updated_at = now()
  WHERE id = p_trip_id;

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
  SET seats_available = seats_available + v_row.seats_reserved,
      updated_at = now()
  WHERE id = v_row.trip_id;
END;
$$;

-- pricing & quotes
CREATE TABLE public.pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  service_type public.service_type,
  route_id uuid REFERENCES public.routes (id),
  airport_id uuid REFERENCES public.airports (id),
  origin_prefecture_id uuid REFERENCES public.prefectures (id),
  destination_prefecture_id uuid REFERENCES public.prefectures (id),
  base_price_jpy integer NOT NULL CHECK (base_price_jpy >= 0),
  per_passenger_jpy integer NOT NULL DEFAULT 0 CHECK (per_passenger_jpy >= 0),
  currency text NOT NULL DEFAULT 'JPY',
  is_active boolean NOT NULL DEFAULT true,
  valid_from date,
  valid_to date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER pricing_rules_updated_at
  BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  amount_jpy integer NOT NULL CHECK (amount_jpy >= 0),
  currency text NOT NULL DEFAULT 'JPY',
  valid_until timestamptz,
  notes text,
  created_by uuid REFERENCES public.profiles (id),
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  method public.payment_method NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'unpaid',
  amount_jpy integer NOT NULL CHECK (amount_jpy >= 0),
  currency text NOT NULL DEFAULT 'JPY',
  reference_note text,
  recorded_by uuid REFERENCES public.profiles (id),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_records_booking ON public.payment_records (booking_id);

CREATE TRIGGER payment_records_updated_at
  BEFORE UPDATE ON public.payment_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- support services
CREATE TABLE public.support_service_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_vi text NOT NULL,
  name_ja text,
  name_en text,
  description_vi text,
  description_ja text,
  disclaimer_vi text,
  disclaimer_ja text,
  is_active boolean NOT NULL DEFAULT true,
  requires_license_note boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER support_service_types_updated_at
  BEFORE UPDATE ON public.support_service_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code text NOT NULL UNIQUE DEFAULT ('SR-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))),
  user_id uuid REFERENCES public.profiles (id),
  service_type_id uuid NOT NULL REFERENCES public.support_service_types (id),
  title text NOT NULL,
  description text NOT NULL,
  priority public.priority_level NOT NULL DEFAULT 'normal',
  status public.support_request_status NOT NULL DEFAULT 'submitted',
  assignee_id uuid REFERENCES public.profiles (id),
  deadline date,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  contact_email text NOT NULL,
  internal_notes text,
  privacy_accepted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_requests_user ON public.support_requests (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_support_requests_assignee ON public.support_requests (assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_support_requests_status ON public.support_requests (status) WHERE deleted_at IS NULL;

CREATE TRIGGER support_requests_updated_at
  BEFORE UPDATE ON public.support_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  support_request_id uuid NOT NULL REFERENCES public.support_requests (id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles (id),
  sender_name text,
  is_internal boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_messages_request ON public.support_messages (support_request_id, created_at);

CREATE TRIGGER support_messages_updated_at
  BEFORE UPDATE ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.support_required_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  support_request_id uuid NOT NULL REFERENCES public.support_requests (id) ON DELETE CASCADE,
  document_label text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  is_received boolean NOT NULL DEFAULT false,
  private_file_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER support_required_documents_updated_at
  BEFORE UPDATE ON public.support_required_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- private files metadata (actual bytes in private-documents bucket)
CREATE TABLE public.private_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES public.profiles (id),
  related_type text NOT NULL CHECK (related_type IN (
    'booking', 'support_request', 'driver', 'vehicle', 'operator', 'other'
  )),
  related_id uuid,
  storage_path text NOT NULL UNIQUE,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes integer NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
  retain_until date,
  deletion_requested_at timestamptz,
  deleted_at timestamptz,
  uploaded_by uuid REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_private_files_owner ON public.private_files (owner_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_private_files_related ON public.private_files (related_type, related_id) WHERE deleted_at IS NULL;

CREATE TRIGGER private_files_updated_at
  BEFORE UPDATE ON public.private_files
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.support_required_documents
  ADD CONSTRAINT support_required_documents_file_fk
  FOREIGN KEY (private_file_id) REFERENCES public.private_files (id);

-- notifications & contact
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications (user_id, is_read, created_at DESC);

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'spam')),
  handled_by uuid REFERENCES public.profiles (id),
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER contact_messages_updated_at
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CMS
CREATE TABLE public.content_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title_vi text NOT NULL,
  title_ja text,
  body_vi text NOT NULL,
  body_ja text,
  meta_description_vi text,
  meta_description_ja text,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid REFERENCES public.profiles (id),
  updated_by uuid REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER content_pages_updated_at
  BEFORE UPDATE ON public.content_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_vi text NOT NULL,
  question_ja text,
  answer_vi text NOT NULL,
  answer_ja text,
  category text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT false,
  description text,
  updated_by uuid REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- audit logs (append-only; no delete for super_admin via policy)
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles (id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_created ON public.audit_logs (created_at DESC);

CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- booking status history trigger
CREATE OR REPLACE FUNCTION public.track_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER booking_status_history_trg
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.track_booking_status_change();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Guest booking lookup (code + email/phone verification)
CREATE OR REPLACE FUNCTION public.lookup_booking(
  p_booking_code text,
  p_contact text
)
RETURNS TABLE (
  id uuid,
  booking_code text,
  status public.booking_status,
  service_type public.service_type,
  pickup_address text,
  dropoff_address text,
  pickup_date date,
  pickup_time time,
  passenger_count integer,
  payment_status public.payment_status,
  quoted_price_jpy integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.booking_code,
    b.status,
    b.service_type,
    b.pickup_address,
    b.dropoff_address,
    b.pickup_date,
    b.pickup_time,
    b.passenger_count,
    b.payment_status,
    b.quoted_price_jpy,
    b.created_at
  FROM public.bookings b
  WHERE b.booking_code = upper(trim(p_booking_code))
    AND b.deleted_at IS NULL
    AND (
      lower(b.contact_email) = lower(trim(p_contact))
      OR b.contact_phone = trim(p_contact)
    )
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_booking(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text, text, uuid, jsonb) TO authenticated;
