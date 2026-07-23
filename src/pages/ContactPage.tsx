import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { PageMeta } from '@/components/seo/PageMeta'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { TurnstileWidget } from '@/components/turnstile/TurnstileWidget'
import { contactSchema, type ContactValues } from '@/schemas/auth'
import { invokeFunction, tryGetSupabase } from '@/lib/supabase'
import { env } from '@/lib/env'

export function ContactPage() {
  const { t } = useTranslation(['pages', 'forms', 'common'])
  const [ok, setOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema) as never,
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
      turnstile_token: '',
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    setOk(false)
    if (!tryGetSupabase()) {
      setError(t('status.notConfigured', { ns: 'common' }))
      return
    }
    try {
      await invokeFunction('submit-contact', values)
      setOk(true)
      form.reset()
    } catch {
      setError(t('errors.generic', { ns: 'forms' }))
    }
  })

  return (
    <>
      <PageMeta title={t('contact.title')} description={t('contact.meta')} path="/lien-he" />
      <div className="container-app grid gap-10 py-10 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold">{t('contact.title')}</h1>
          <p className="mt-4 text-navy-700">
            {env.contactEmail || '[Email — admin update]'}
            <br />
            {env.contactPhone || '[Phone — admin update]'}
            <br />
            {env.contactAddress || t('office.addressPlaceholder')}
          </p>
        </div>
        <Card>
          <CardContent className="space-y-4 py-6">
            {ok ? <Alert variant="success">{t('contact.success')}</Alert> : null}
            {error ? <Alert variant="error">{error}</Alert> : null}
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">{t('contact.name', { ns: 'forms' })}</Label>
                <Input id="name" {...form.register('name')} />
              </div>
              <div>
                <Label htmlFor="email">{t('contact.email', { ns: 'forms' })}</Label>
                <Input id="email" type="email" {...form.register('email')} />
              </div>
              <div>
                <Label htmlFor="phone">{t('contact.phone', { ns: 'forms' })}</Label>
                <Input id="phone" {...form.register('phone')} />
              </div>
              <div>
                <Label htmlFor="subject">{t('contact.subject', { ns: 'forms' })}</Label>
                <Input id="subject" {...form.register('subject')} />
              </div>
              <div>
                <Label htmlFor="message">{t('contact.message', { ns: 'forms' })}</Label>
                <Textarea id="message" {...form.register('message')} />
              </div>
              <TurnstileWidget onToken={(tok) => form.setValue('turnstile_token', tok)} />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Spinner /> : null}
                {t('contact.submit', { ns: 'forms' })}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
