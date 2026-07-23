import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { PageMeta } from '@/components/seo/PageMeta'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { TurnstileWidget } from '@/components/turnstile/TurnstileWidget'
import { supportRequestSchema, type SupportRequestValues } from '@/schemas/auth'
import { invokeFunction, tryGetSupabase } from '@/lib/supabase'
import type { SupportServiceType } from '@/types/database'

export function SupportPage() {
  const { t, i18n } = useTranslation(['pages', 'forms', 'common'])
  const ja = i18n.language?.startsWith('ja')
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: types = [] } = useQuery({
    queryKey: ['support-types'],
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase) return [] as SupportServiceType[]
      const { data, error: qErr } = await supabase
        .from('support_service_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (qErr) throw qErr
      return (data ?? []) as SupportServiceType[]
    },
  })

  const form = useForm<SupportRequestValues>({
    resolver: zodResolver(supportRequestSchema) as never,
    defaultValues: {
      service_type_id: '',
      title: '',
      description: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      privacy_accepted: undefined as unknown as true,
      turnstile_token: '',
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    setDone(null)
    if (!tryGetSupabase()) {
      setError(t('status.notConfigured', { ns: 'common' }))
      return
    }
    try {
      // Identity from JWT only — do not send user_id
      const res = await invokeFunction<{
        request: { request_code: string }
      }>('submit-support', { ...values })
      setDone(res.request.request_code)
      form.reset()
    } catch {
      setError(t('errors.generic', { ns: 'forms' }))
    }
  })

  return (
    <>
      <PageMeta title={t('support.title')} description={t('support.meta')} path="/ho-tro-ho-so" />
      <div className="container-app py-10">
        <h1 className="text-3xl font-bold">{t('support.title')}</h1>
        <p className="mt-4 max-w-3xl text-lg text-navy-700">{t('support.intro')}</p>
        <Alert variant="warning" className="mt-6 max-w-3xl">
          {t('support.disclaimer')}
        </Alert>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((s) => (
            <Card key={s.id}>
              <CardContent className="py-5">
                <h2 className="font-semibold text-navy-900">
                  {ja && s.name_ja ? s.name_ja : s.name_vi}
                </h2>
                <p className="mt-2 text-sm text-navy-600">
                  {s.description_vi}
                </p>
                {s.disclaimer_vi ? (
                  <p className="mt-2 text-xs text-amber-800">{s.disclaimer_vi}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-10 max-w-2xl">
          <CardHeader>
            <CardTitle>{t('support.submit', { ns: 'forms' })}</CardTitle>
          </CardHeader>
          <CardContent>
            {done ? (
              <Alert variant="success">
                {t('success.support', { ns: 'forms' })} — {done}
              </Alert>
            ) : null}
            {error ? <Alert variant="error">{error}</Alert> : null}
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="service_type_id">{t('support.serviceType', { ns: 'forms' })}</Label>
                <Select id="service_type_id" {...form.register('service_type_id')}>
                  <option value="">—</option>
                  {types.map((s) => (
                    <option key={s.id} value={s.id}>
                      {ja && s.name_ja ? s.name_ja : s.name_vi}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="title">{t('support.title', { ns: 'forms' })}</Label>
                <Input id="title" {...form.register('title')} />
              </div>
              <div>
                <Label htmlFor="description">{t('support.description', { ns: 'forms' })}</Label>
                <Textarea id="description" {...form.register('description')} />
              </div>
              <div>
                <Label htmlFor="contact_name">{t('booking.contactName', { ns: 'forms' })}</Label>
                <Input id="contact_name" {...form.register('contact_name')} />
              </div>
              <div>
                <Label htmlFor="contact_phone">{t('booking.contactPhone', { ns: 'forms' })}</Label>
                <Input id="contact_phone" {...form.register('contact_phone')} />
              </div>
              <div>
                <Label htmlFor="contact_email">{t('booking.contactEmail', { ns: 'forms' })}</Label>
                <Input id="contact_email" type="email" {...form.register('contact_email')} />
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1 h-5 w-5" {...form.register('privacy_accepted')} />
                <span>{t('support.privacy', { ns: 'forms' })}</span>
              </label>
              <TurnstileWidget
                onToken={(token) => form.setValue('turnstile_token', token)}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Spinner /> : null}
                {t('support.submit', { ns: 'forms' })}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
