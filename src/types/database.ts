export type AppRole =
  | 'customer'
  | 'support_agent'
  | 'dispatcher'
  | 'driver'
  | 'admin'
  | 'super_admin'

export type VerificationStatus = 'pending' | 'verified' | 'suspended' | 'rejected'

export type BookingStatus =
  | 'draft'
  | 'requested'
  | 'reviewing'
  | 'quoted'
  | 'awaiting_customer_confirmation'
  | 'confirmed'
  | 'assigned'
  | 'driver_en_route'
  | 'picked_up'
  | 'in_transit'
  | 'completed'
  | 'cancelled_by_customer'
  | 'cancelled_by_operator'
  | 'rejected'
  | 'no_show'

export type ServiceType =
  | 'airport_transfer'
  | 'shared_ride'
  | 'intercity'
  | 'factory_shuttle'
  | 'shift_shuttle'
  | 'private_charter'
  | 'other'

export type PaymentMethod = 'cash' | 'bank_transfer' | 'office' | 'other'
export type PaymentStatus =
  | 'unpaid'
  | 'pending_verification'
  | 'paid'
  | 'refunded'
  | 'partial'
  | 'cancelled'

export type SupportRequestStatus =
  | 'submitted'
  | 'reviewing'
  | 'waiting_for_documents'
  | 'documents_received'
  | 'in_progress'
  | 'appointment_scheduled'
  | 'completed'
  | 'cancelled'
  | 'rejected'

export type RidePreference = 'shared' | 'private' | 'either'
export type TripStatus =
  | 'draft'
  | 'scheduled'
  | 'boarding'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface Prefecture {
  id: string
  code: string
  name_ja: string
  name_vi: string
  name_en: string | null
  region: string | null
  sort_order: number
  is_active: boolean
}

export interface Airport {
  id: string
  iata_code: string
  name_ja: string
  name_vi: string
  name_en: string | null
  prefecture_id: string | null
  is_priority: boolean
  is_active: boolean
  sort_order: number
}

export interface Route {
  id: string
  code: string | null
  name_vi: string
  name_ja: string | null
  description_vi: string | null
  description_ja: string | null
  origin_label: string | null
  destination_label: string | null
  estimated_duration_minutes: number | null
  base_price_jpy: number | null
  is_active: boolean
  is_public: boolean
  sort_order: number
}

export interface Booking {
  id: string
  booking_code: string
  user_id: string | null
  service_type: ServiceType
  status: BookingStatus
  ride_preference: RidePreference
  pickup_address: string
  dropoff_address: string
  pickup_date: string
  pickup_time: string | null
  passenger_count: number
  adults_count: number
  children_count: number
  contact_name: string
  contact_phone: string
  contact_email: string
  payment_status: PaymentStatus
  quoted_price_jpy: number | null
  created_at: string
  updated_at: string
}

export interface Trip {
  id: string
  route_id: string
  departure_date: string
  total_seats: number
  seats_available: number
  estimated_price_jpy: number | null
  status: TripStatus
  is_public: boolean
}

export interface SupportServiceType {
  id: string
  code: string
  name_vi: string
  name_ja: string | null
  description_vi: string | null
  disclaimer_vi: string | null
  is_active: boolean
  sort_order: number
}

export interface Faq {
  id: string
  question_vi: string
  question_ja: string | null
  answer_vi: string
  answer_ja: string | null
  category: string | null
  sort_order: number
  is_published: boolean
}

export interface ContentPage {
  id: string
  slug: string
  title_vi: string
  title_ja: string | null
  body_vi: string
  body_ja: string | null
  meta_description_vi: string | null
  is_published: boolean
}

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  line_id: string | null
  preferred_language: string
}

export interface UserRole {
  id: string
  user_id: string
  role: AppRole
  revoked_at: string | null
}

/** Minimal Database typing for Supabase client */
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      user_roles: { Row: UserRole; Insert: Partial<UserRole>; Update: Partial<UserRole> }
      prefectures: { Row: Prefecture; Insert: Partial<Prefecture>; Update: Partial<Prefecture> }
      airports: { Row: Airport; Insert: Partial<Airport>; Update: Partial<Airport> }
      routes: { Row: Route; Insert: Partial<Route>; Update: Partial<Route> }
      bookings: { Row: Booking; Insert: Partial<Booking>; Update: Partial<Booking> }
      trips: { Row: Trip; Insert: Partial<Trip>; Update: Partial<Trip> }
      support_service_types: {
        Row: SupportServiceType
        Insert: Partial<SupportServiceType>
        Update: Partial<SupportServiceType>
      }
      support_requests: {
        Row: {
          id: string
          request_code: string
          user_id: string | null
          service_type_id: string
          title: string
          description: string
          status: SupportRequestStatus
          contact_name: string
          contact_phone: string
          contact_email: string
          created_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      faqs: { Row: Faq; Insert: Partial<Faq>; Update: Partial<Faq> }
      content_pages: { Row: ContentPage; Insert: Partial<ContentPage>; Update: Partial<ContentPage> }
      site_settings: {
        Row: { key: string; value: Record<string, unknown>; is_public: boolean }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          is_read: boolean
          created_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          created_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      drivers: {
        Row: {
          id: string
          user_id: string | null
          operator_id: string
          full_name: string
          verification_status: VerificationStatus
          is_active: boolean
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      vehicles: {
        Row: {
          id: string
          operator_id: string
          plate_number: string
          seat_capacity: number
          verification_status: VerificationStatus
          is_active: boolean
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      transport_operators: {
        Row: {
          id: string
          legal_name: string
          verification_status: VerificationStatus
          is_publicly_listed: boolean
          license_expires_on: string | null
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
    Functions: {
      lookup_booking: {
        Args: { p_booking_code: string; p_contact: string }
        Returns: Booking[]
      }
      has_role: { Args: { check_role: AppRole }; Returns: boolean }
      is_admin: { Args: Record<string, never>; Returns: boolean }
      is_staff: { Args: Record<string, never>; Returns: boolean }
      reserve_trip_seats: {
        Args: {
          p_trip_id: string
          p_booking_id: string
          p_seats: number
          p_actor?: string
        }
        Returns: unknown
      }
      write_audit_log: {
        Args: {
          p_action: string
          p_entity_type: string
          p_entity_id?: string
          p_metadata?: Record<string, unknown>
        }
        Returns: string
      }
    }
  }
}
