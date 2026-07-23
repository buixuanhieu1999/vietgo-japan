import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { verifyTurnstile } from '../_shared/turnstile.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { bookingConfirmationEmail, getEmailProvider } from '../_shared/email.ts'

const SERVICE_TYPES = new Set([
  'airport_transfer',
  'shared_ride',
  'intercity',
  'factory_shuttle',
  'shift_shuttle',
  'private_charter',
  'other',
])

const RIDE_PREFS = new Set(['shared', 'private', 'either'])

interface BookingPayload {
  service_type: string
  ride_preference?: string
  pickup_address: string
  pickup_prefecture_id?: string | null
  pickup_postal_code?: string | null
  dropoff_address: string
  dropoff_prefecture_id?: string | null
  dropoff_postal_code?: string | null
  airport_id?: string | null
  pickup_date: string
  pickup_time?: string | null
  flight_number?: string | null
  flight_arrival_time?: string | null
  terminal?: string | null
  passenger_count: number
  adults_count: number
  children_count: number
  child_seats_needed?: number
  large_luggage?: number
  cabin_luggage?: number
  wheelchair_needed?: boolean
  special_assistance?: string | null
  time_flexible?: boolean
  flexible_window_minutes?: number | null
  contact_name: string
  contact_phone: string
  contact_email: string
  contact_line_id?: string | null
  customer_notes?: string | null
  privacy_accepted: boolean
  terms_accepted: boolean
  payment_method?: string | null
  turnstile_token?: string
  user_id?: string | null
}

function validate(payload: BookingPayload): string | null {
  if (!SERVICE_TYPES.has(payload.service_type)) return 'invalid_service_type'
  if (payload.ride_preference && !RIDE_PREFS.has(payload.ride_preference)) {
    return 'invalid_ride_preference'
  }
  if (!payload.pickup_address?.trim() || !payload.dropoff_address?.trim()) {
    return 'address_required'
  }
  if (!payload.pickup_date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.pickup_date)) {
    return 'invalid_pickup_date'
  }
  if (!payload.contact_name?.trim()) return 'contact_name_required'
  if (!payload.contact_phone?.trim()) return 'contact_phone_required'
  if (!payload.contact_email?.trim() || !payload.contact_email.includes('@')) {
    return 'contact_email_required'
  }
  if (!payload.privacy_accepted || !payload.terms_accepted) {
    return 'policies_not_accepted'
  }
  const adults = Number(payload.adults_count)
  const children = Number(payload.children_count)
  const total = Number(payload.passenger_count)
  if (!Number.isFinite(total) || total < 1 || total > 50) return 'invalid_passenger_count'
  if (adults + children !== total) return 'passenger_sum_mismatch'
  // Basic JP phone: digits, +, spaces, dashes
  if (!/^[0-9+\-\s()]{8,20}$/.test(payload.contact_phone.trim())) {
    return 'invalid_phone'
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return errorResponse('method_not_allowed', 405)
  }

  try {
    const payload = (await req.json()) as BookingPayload
    const validationError = validate(payload)
    if (validationError) {
      return errorResponse(validationError, 400, validationError)
    }

    const turnstile = await verifyTurnstile(
      payload.turnstile_token,
      req.headers.get('cf-connecting-ip'),
    )
    if (!turnstile.success) {
      return errorResponse('turnstile_verification_failed', 403, turnstile.error)
    }

    const supabase = createServiceClient()

    const insertRow = {
      service_type: payload.service_type,
      status: 'requested',
      ride_preference: payload.ride_preference ?? 'either',
      pickup_address: payload.pickup_address.trim(),
      pickup_prefecture_id: payload.pickup_prefecture_id || null,
      pickup_postal_code: payload.pickup_postal_code || null,
      dropoff_address: payload.dropoff_address.trim(),
      dropoff_prefecture_id: payload.dropoff_prefecture_id || null,
      dropoff_postal_code: payload.dropoff_postal_code || null,
      airport_id: payload.airport_id || null,
      pickup_date: payload.pickup_date,
      pickup_time: payload.pickup_time || null,
      flight_number: payload.flight_number || null,
      flight_arrival_time: payload.flight_arrival_time || null,
      terminal: payload.terminal || 'unknown',
      passenger_count: payload.passenger_count,
      adults_count: payload.adults_count,
      children_count: payload.children_count,
      child_seats_needed: payload.child_seats_needed ?? 0,
      large_luggage: payload.large_luggage ?? 0,
      cabin_luggage: payload.cabin_luggage ?? 0,
      wheelchair_needed: payload.wheelchair_needed ?? false,
      special_assistance: payload.special_assistance || null,
      time_flexible: payload.time_flexible ?? false,
      flexible_window_minutes: payload.flexible_window_minutes ?? null,
      contact_name: payload.contact_name.trim(),
      contact_phone: payload.contact_phone.trim(),
      contact_email: payload.contact_email.trim().toLowerCase(),
      contact_line_id: payload.contact_line_id || null,
      customer_notes: payload.customer_notes || null,
      privacy_accepted: true,
      terms_accepted: true,
      payment_method: payload.payment_method || 'cash',
      payment_status: 'unpaid',
      user_id: payload.user_id || null,
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert(insertRow)
      .select('id, booking_code, status, pickup_date, created_at')
      .single()

    if (error || !data) {
      console.error('booking_insert_failed', error?.code ?? 'unknown')
      return errorResponse('booking_create_failed', 500, 'booking_create_failed')
    }

    // Emails — non-fatal if provider fails
    try {
      const provider = getEmailProvider()
      const appUrl = Deno.env.get('APP_URL') ?? Deno.env.get('VITE_APP_URL') ?? 'https://example.com'
      const mail = bookingConfirmationEmail({
        bookingCode: data.booking_code,
        contactName: insertRow.contact_name,
        pickupDate: insertRow.pickup_date,
        pickupAddress: insertRow.pickup_address,
        dropoffAddress: insertRow.dropoff_address,
        appUrl,
      })
      mail.to = insertRow.contact_email
      await provider.send(mail)

      const adminEmail = Deno.env.get('ADMIN_NOTIFICATION_EMAIL')
      if (adminEmail) {
        await provider.send({
          to: adminEmail,
          subject: `[VietGo] Booking mới ${data.booking_code}`,
          html: `<p>Booking mới: <strong>${data.booking_code}</strong></p>
                 <p>Dịch vụ: ${insertRow.service_type}</p>
                 <p>Ngày: ${insertRow.pickup_date}</p>`,
          text: `Booking mới ${data.booking_code} — ${insertRow.service_type} — ${insertRow.pickup_date}`,
        })
      }
    } catch (e) {
      console.error('email_send_failed', e instanceof Error ? e.message : 'unknown')
    }

    await supabase.rpc('write_audit_log', {
      p_action: 'booking.created',
      p_entity_type: 'booking',
      p_entity_id: data.id,
      p_metadata: { booking_code: data.booking_code, source: 'edge_create_booking' },
    })

    return jsonResponse({
      ok: true,
      booking: {
        id: data.id,
        booking_code: data.booking_code,
        status: data.status,
        pickup_date: data.pickup_date,
        created_at: data.created_at,
      },
    })
  } catch (e) {
    console.error('create_booking_error', e instanceof Error ? e.message : 'unknown')
    return errorResponse('internal_error', 500, 'internal_error')
  }
})
