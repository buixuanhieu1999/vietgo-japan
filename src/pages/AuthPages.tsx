import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageMeta } from '@/components/seo/PageMeta'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { TurnstileWidget } from '@/components/turnstile/TurnstileWidget'
import {
  loginSchema,
  registerSchema,
  type LoginValues,
  type RegisterValues,
} from '@/schemas/auth'
import { useAuth } from '@/providers/AuthProvider'
import { tryGetSupabase } from '@/lib/supabase'

export function LoginPage() {
  const { t } = useTranslation(['pages', 'forms', 'common'])
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema) as never,
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    if (!tryGetSupabase()) {
      setError(t('status.notConfigured', { ns: 'common' }))
      return
    }
    try {
      await signIn(values.email, values.password)
      navigate('/tai-khoan')
    } catch {
      setError(t('errors.generic', { ns: 'forms' }))
    }
  })

  return (
    <>
      <PageMeta title={t('auth.loginTitle')} description={t('auth.loginMeta')} path="/dang-nhap" />
      <div className="container-app flex justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('auth.loginTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? <Alert variant="error">{error}</Alert> : null}
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="email">{t('auth.email', { ns: 'forms' })}</Label>
                <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
              </div>
              <div>
                <Label htmlFor="password">{t('auth.password', { ns: 'forms' })}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...form.register('password')}
                />
              </div>
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Spinner /> : null}
                {t('auth.login', { ns: 'forms' })}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-navy-600">
              <Link to="/dang-ky" className="text-brand-700 hover:underline">
                {t('auth.registerTitle')}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export function RegisterPage() {
  const { t } = useTranslation(['pages', 'forms', 'common'])
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema) as never,
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      password: '',
      confirm_password: '',
      privacy_accepted: undefined as unknown as true,
      turnstile_token: '',
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    if (!tryGetSupabase()) {
      setError(t('status.notConfigured', { ns: 'common' }))
      return
    }
    try {
      await signUp({
        email: values.email,
        password: values.password,
        full_name: values.full_name,
        phone: values.phone,
      })
      setOk(true)
      navigate('/tai-khoan')
    } catch {
      setError(t('errors.generic', { ns: 'forms' }))
    }
  })

  return (
    <>
      <PageMeta
        title={t('auth.registerTitle')}
        description={t('auth.registerMeta')}
        path="/dang-ky"
      />
      <div className="container-app flex justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('auth.registerTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {ok ? (
              <Alert variant="success">{t('success.register', { ns: 'forms' })}</Alert>
            ) : null}
            {error ? <Alert variant="error">{error}</Alert> : null}
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="full_name">{t('auth.fullName', { ns: 'forms' })}</Label>
                <Input id="full_name" {...form.register('full_name')} />
              </div>
              <div>
                <Label htmlFor="email">{t('auth.email', { ns: 'forms' })}</Label>
                <Input id="email" type="email" {...form.register('email')} />
              </div>
              <div>
                <Label htmlFor="phone">{t('auth.phone', { ns: 'forms' })}</Label>
                <Input id="phone" {...form.register('phone')} />
              </div>
              <div>
                <Label htmlFor="password">{t('auth.password', { ns: 'forms' })}</Label>
                <Input id="password" type="password" {...form.register('password')} />
              </div>
              <div>
                <Label htmlFor="confirm_password">
                  {t('auth.confirmPassword', { ns: 'forms' })}
                </Label>
                <Input
                  id="confirm_password"
                  type="password"
                  {...form.register('confirm_password')}
                />
                {form.formState.errors.confirm_password ? (
                  <p className="mt-1 text-sm text-red-700">
                    {t('errors.passwordMismatch', { ns: 'forms' })}
                  </p>
                ) : null}
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5"
                  {...form.register('privacy_accepted')}
                />
                <span>{t('auth.privacy', { ns: 'forms' })}</span>
              </label>
              <TurnstileWidget onToken={(tok) => form.setValue('turnstile_token', tok)} />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Spinner /> : null}
                {t('auth.register', { ns: 'forms' })}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
