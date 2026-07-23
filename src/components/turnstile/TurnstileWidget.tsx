import { useEffect, useRef } from 'react'
import { env } from '@/lib/env'

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void
  onExpire?: () => void
  className?: string
}

export function TurnstileWidget({ onToken, onExpire, className }: TurnstileWidgetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  const onExpireRef = useRef(onExpire)
  onTokenRef.current = onToken
  onExpireRef.current = onExpire

  useEffect(() => {
    if (!env.turnstileSiteKey) {
      // Dev without Turnstile: send placeholder so forms remain testable locally
      onTokenRef.current('dev-bypass-token')
      return
    }

    const render = () => {
      if (!ref.current || !window.turnstile || widgetId.current) return
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: env.turnstileSiteKey,
        callback: (token) => onTokenRef.current(token),
        'expired-callback': () => {
          onTokenRef.current('')
          onExpireRef.current?.()
        },
        'error-callback': () => onTokenRef.current(''),
        theme: 'light',
      })
    }

    const existing = document.querySelector('script[data-turnstile]')
    if (window.turnstile) {
      render()
    } else if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.dataset.turnstile = 'true'
      script.onload = () => render()
      document.head.appendChild(script)
    } else {
      existing.addEventListener('load', render)
    }

    return () => {
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current)
        } catch {
          // ignore
        }
        widgetId.current = null
      }
    }
  }, [])

  if (!env.turnstileSiteKey) {
    return (
      <p className="text-xs text-navy-500">
        Turnstile chưa cấu hình (dev mode) — server sẽ từ chối nếu thiếu secret.
      </p>
    )
  }

  return <div ref={ref} className={className} />
}
