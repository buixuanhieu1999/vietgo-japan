import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { bookingFormSchema, type BookingFormValues } from '@/schemas/booking'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { TurnstileWidget } from '@/components/turnstile/TurnstileWidget'
import { usePrefectures } from '@/hooks/usePrefectures'
import { useAirports } from '@/hooks/useAirports'
import { invokeFunction, tryGetSupabase } from '@/lib/supabase'
import { mapProvider } from '@/services/map-provider'
import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

const defaultValues: BookingFormValues = {
  service_type: 'airport_transfer',
  ride_preference: 'either',
  pickup_address: '',
  pickup_prefecture_id: '',
  pickup_postal_code: '',
  dropoff_address: '',
  dropoff_prefecture_id: '',
  dropoff_postal_code: '',
  airport_id: '',
  pickup_date: '',
  pickup_time: '',
  flight_number: '',
  flight_arrival_time: '',
  terminal: 'unknown',
  passenger_count: 1,
  adults_count: 1,
  children_count: 0,
  child_seats_needed: 0,
  large_luggage: 0,
  cabin_luggage: 0,
  wheelchair_needed: false,
  special_assistance: '',
  time_flexible: false,
  flexible_window_minutes: undefined,
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  contact_line_id: '',
  customer_notes: '',
  payment_method: 'cash',
  privacy_accepted: true as unknown as true,
  terms_accepted: true as unknown as true,
  turnstile_token: '',
}

interface BookingFormProps {
  compact?: boolean
  defaultServiceType?: BookingFormValues['service_type']
}

export function BookingForm({ compact = false, defaultServiceType }: BookingFormProps) {
  const { t, i18n } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const { data: prefectures = [] } = usePrefectures()
  const { data: airports = [] } = useAirports()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<BookingFormValues>({
    // zod v4 + resolver typing can be strict; cast is safe for runtime validation
    resolver: zodResolver(bookingFormSchema) as never,
    defaultValues: {
      ...defaultValues,
      service_type: defaultServiceType ?? 'airport_transfer',
      privacy_accepted: undefined as unknown as true,
      terms_accepted: undefined as unknown as true,
    },
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form

  const pickupAddress = watch('pickup_address')
  const dropoffAddress = watch('dropoff_address')
  const lang = i18n.language?.startsWith('ja') ? 'ja' : 'vi'

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    if (!tryGetSupabase()) {
      setServerError(t('status.notConfigured', { ns: 'common' }))
      return
    }
    try {
      // Never send user_id — Edge Function binds identity from JWT only
      const payload = {
        ...values,
        pickup_prefecture_id: values.pickup_prefecture_id || null,
        dropoff_prefecture_id: values.dropoff_prefecture_id || null,
        airport_id: values.airport_id || null,
        idempotency_key: crypto.randomUUID(),
      }
      const res = await invokeFunction<{
        ok: boolean
        booking: { booking_code: string; id: string; lookup_token?: string }
      }>('create-booking', payload)
      navigate('/dat-xe/thanh-cong', {
        replace: true,
        state: {
          bookingCode: res.booking.booking_code,
          lookupToken: res.booking.lookup_token,
        },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'generic'
      if (msg.includes('turnstile')) {
        setServerError(t('errors.turnstile'))
      } else {
        setServerError(t('errors.generic'))
      }
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {serverError ? <Alert variant="error">{serverError}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="service_type">{t('booking.serviceType')}</Label>
          <Select id="service_type" {...register('service_type')}>
            <option value="">{t('booking.selectService')}</option>
            {(
              [
                'airport_transfer',
                'shared_ride',
                'intercity',
                'factory_shuttle',
                'shift_shuttle',
                'private_charter',
                'other',
              ] as const
            ).map((s) => (
              <option key={s} value={s}>
                {t(`serviceTypes.${s}`, { ns: 'common' })}
              </option>
            ))}
          </Select>
          {errors.service_type ? (
            <p className="mt-1 text-sm text-red-700">{t('errors.required')}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="pickup_address">{t('booking.pickupAddress')}</Label>
          <Input id="pickup_address" {...register('pickup_address')} autoComplete="street-address" />
          {pickupAddress ? (
            <a
              href={mapProvider.searchUrl(pickupAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t('cta.openMaps', { ns: 'common' })}
            </a>
          ) : null}
          {errors.pickup_address ? (
            <p className="mt-1 text-sm text-red-700">{t('errors.required')}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="pickup_prefecture_id">{t('booking.pickupPrefecture')}</Label>
          <Select id="pickup_prefecture_id" {...register('pickup_prefecture_id')}>
            <option value="">{t('booking.selectPrefecture')}</option>
            {prefectures.map((p) => (
              <option key={p.id} value={p.id.startsWith('local-') ? '' : p.id}>
                {lang === 'ja' ? p.name_ja : p.name_vi}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="pickup_postal_code">{t('booking.pickupPostal')}</Label>
          <Input id="pickup_postal_code" {...register('pickup_postal_code')} inputMode="numeric" />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="dropoff_address">{t('booking.dropoffAddress')}</Label>
          <Input id="dropoff_address" {...register('dropoff_address')} />
          {dropoffAddress ? (
            <a
              href={mapProvider.searchUrl(dropoffAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t('cta.openMaps', { ns: 'common' })}
            </a>
          ) : null}
          {errors.dropoff_address ? (
            <p className="mt-1 text-sm text-red-700">{t('errors.required')}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="dropoff_prefecture_id">{t('booking.dropoffPrefecture')}</Label>
          <Select id="dropoff_prefecture_id" {...register('dropoff_prefecture_id')}>
            <option value="">{t('booking.selectPrefecture')}</option>
            {prefectures.map((p) => (
              <option key={p.id} value={p.id.startsWith('local-') ? '' : p.id}>
                {lang === 'ja' ? p.name_ja : p.name_vi}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="airport_id">{t('booking.airport')}</Label>
          <Select id="airport_id" {...register('airport_id')}>
            <option value="">{t('booking.selectAirport')}</option>
            {airports.map((a) => (
              <option key={a.id} value={a.id.startsWith('local-') ? '' : a.id}>
                {a.iata_code} — {lang === 'ja' ? a.name_ja : a.name_vi}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="pickup_date">{t('booking.pickupDate')}</Label>
          <Input id="pickup_date" type="date" {...register('pickup_date')} />
          {errors.pickup_date ? (
            <p className="mt-1 text-sm text-red-700">{t('errors.required')}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="pickup_time">{t('booking.pickupTime')}</Label>
          <Input id="pickup_time" type="time" {...register('pickup_time')} />
        </div>

        {!compact ? (
          <>
            <div>
              <Label htmlFor="flight_number">{t('booking.flightNumber')}</Label>
              <Input id="flight_number" {...register('flight_number')} />
            </div>
            <div>
              <Label htmlFor="flight_arrival_time">{t('booking.flightArrival')}</Label>
              <Input id="flight_arrival_time" type="time" {...register('flight_arrival_time')} />
            </div>
            <div>
              <Label htmlFor="terminal">{t('booking.terminal')}</Label>
              <Select id="terminal" {...register('terminal')}>
                <option value="unknown">{t('booking.terminalUnknown')}</option>
                <option value="international">{t('booking.terminalInternational')}</option>
                <option value="domestic">{t('booking.terminalDomestic')}</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="ride_preference">{t('booking.ridePreference')}</Label>
              <Select id="ride_preference" {...register('ride_preference')}>
                <option value="either">{t('booking.either')}</option>
                <option value="shared">{t('booking.shared')}</option>
                <option value="private">{t('booking.private')}</option>
              </Select>
            </div>
          </>
        ) : null}

        <div>
          <Label htmlFor="adults_count">{t('booking.adults')}</Label>
          <Input
            id="adults_count"
            type="number"
            min={0}
            {...register('adults_count', {
              onChange: (e) => {
                const adults = Number(e.target.value) || 0
                const children = Number(watch('children_count')) || 0
                setValue('passenger_count', adults + children)
              },
            })}
          />
        </div>
        <div>
          <Label htmlFor="children_count">{t('booking.children')}</Label>
          <Input
            id="children_count"
            type="number"
            min={0}
            {...register('children_count', {
              onChange: (e) => {
                const children = Number(e.target.value) || 0
                const adults = Number(watch('adults_count')) || 0
                setValue('passenger_count', adults + children)
              },
            })}
          />
        </div>
        <div>
          <Label htmlFor="passenger_count">{t('booking.passengers')}</Label>
          <Input id="passenger_count" type="number" min={1} {...register('passenger_count')} />
          {errors.passenger_count ? (
            <p className="mt-1 text-sm text-red-700">{t('errors.passengerSum')}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="child_seats_needed">{t('booking.childSeats')}</Label>
          <Input id="child_seats_needed" type="number" min={0} {...register('child_seats_needed')} />
        </div>

        {!compact ? (
          <>
            <div>
              <Label htmlFor="large_luggage">{t('booking.largeLuggage')}</Label>
              <Input id="large_luggage" type="number" min={0} {...register('large_luggage')} />
            </div>
            <div>
              <Label htmlFor="cabin_luggage">{t('booking.cabinLuggage')}</Label>
              <Input id="cabin_luggage" type="number" min={0} {...register('cabin_luggage')} />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="wheelchair_needed"
                type="checkbox"
                className="h-5 w-5 rounded border-navy-300"
                {...register('wheelchair_needed')}
              />
              <Label htmlFor="wheelchair_needed" className="mb-0">
                {t('booking.wheelchair')}
              </Label>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="special_assistance">{t('booking.specialAssistance')}</Label>
              <Textarea id="special_assistance" {...register('special_assistance')} />
            </div>
          </>
        ) : null}

        <div>
          <Label htmlFor="contact_name">{t('booking.contactName')}</Label>
          <Input id="contact_name" {...register('contact_name')} autoComplete="name" />
          {errors.contact_name ? (
            <p className="mt-1 text-sm text-red-700">{t('errors.required')}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="contact_phone">{t('booking.contactPhone')}</Label>
          <Input id="contact_phone" {...register('contact_phone')} autoComplete="tel" />
          {errors.contact_phone ? (
            <p className="mt-1 text-sm text-red-700">{t('errors.phone')}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="contact_email">{t('booking.contactEmail')}</Label>
          <Input id="contact_email" type="email" {...register('contact_email')} autoComplete="email" />
          {errors.contact_email ? (
            <p className="mt-1 text-sm text-red-700">{t('errors.email')}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="contact_line_id">{t('booking.lineId')}</Label>
          <Input id="contact_line_id" {...register('contact_line_id')} />
        </div>

        {!compact ? (
          <>
            <div>
              <Label htmlFor="payment_method">{t('booking.paymentMethod')}</Label>
              <Select id="payment_method" {...register('payment_method')}>
                <option value="cash">{t('paymentMethods.cash', { ns: 'common' })}</option>
                <option value="bank_transfer">
                  {t('paymentMethods.bank_transfer', { ns: 'common' })}
                </option>
                <option value="office">{t('paymentMethods.office', { ns: 'common' })}</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="customer_notes">{t('booking.notes')}</Label>
              <Textarea id="customer_notes" {...register('customer_notes')} />
            </div>
          </>
        ) : null}
      </div>

      <div className="space-y-3 rounded-lg border border-navy-100 bg-navy-50/50 p-4">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 h-5 w-5" {...register('privacy_accepted')} />
          <span>
            {t('booking.privacy')}{' '}
            <Link to="/phap-ly/quyen-rieng-tu" className="text-brand-700 underline">
              ({t('legal.privacy', { ns: 'pages' })})
            </Link>
          </span>
        </label>
        {errors.privacy_accepted ? (
          <p className="text-sm text-red-700">{t('errors.privacy')}</p>
        ) : null}
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 h-5 w-5" {...register('terms_accepted')} />
          <span>
            {t('booking.terms')}{' '}
            <Link to="/phap-ly/dieu-khoan" className="text-brand-700 underline">
              ({t('legal.terms', { ns: 'pages' })})
            </Link>
          </span>
        </label>
        {errors.terms_accepted ? (
          <p className="text-sm text-red-700">{t('errors.privacy')}</p>
        ) : null}
      </div>

      <TurnstileWidget onToken={(token) => setValue('turnstile_token', token)} />

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? <Spinner className="border-white border-t-transparent" /> : null}
        {t('booking.submit')}
      </Button>
    </form>
  )
}
