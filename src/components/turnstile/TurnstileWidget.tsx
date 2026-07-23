import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { env } from '@/lib/env'
import { Button } from '@/components/ui/button'

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          'error-callback'?: (error?: string) => void
          'expired-callback'?: () => void
          'timeout-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          language?: string
          size?: 'normal' | 'compact' | 'flexible'
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
  const { i18n } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  const onExpireRef = useRef(onExpire)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  onTokenRef.current = onToken
  onExpireRef.current = onExpire

  const hostname =
    typeof window !== 'undefined' ? window.location.hostname : 'vietgo-japan.pages.dev'

  const destroy = useCallback(() => {
    if (widgetId.current && window.turnstile) {
      try {
        window.turnstile.remove(widgetId.current)
      } catch {
        // ignore
      }
      widgetId.current = null
    }
  }, [])

  useEffect(() => {
    if (!env.turnstileSiteKey) {
      onTokenRef.current('')
      return
    }

    setError(null)
    onTokenRef.current('')

    const render = () => {
      if (!ref.current || !window.turnstile) return
      destroy()
      try {
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: env.turnstileSiteKey,
          language: i18n.language?.startsWith('ja') ? 'ja' : 'vi',
          size: 'flexible',
          theme: 'light',
          callback: (token) => {
            setError(null)
            onTokenRef.current(token)
          },
          'expired-callback': () => {
            onTokenRef.current('')
            onExpireRef.current?.()
          },
          'timeout-callback': () => {
            onTokenRef.current('')
            setError('timeout')
          },
          'error-callback': () => {
            onTokenRef.current('')
            setError('network')
          },
        })
      } catch {
        setError('network')
      }
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile]')
    if (window.turnstile) {
      render()
    } else if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.dataset.turnstile = 'true'
      script.onload = () => render()
      script.onerror = () => setError('script')
      document.head.appendChild(script)
    } else {
      const onLoad = () => render()
      existing.addEventListener('load', onLoad)
      if (window.turnstile) render()
      return () => {
        existing.removeEventListener('load', onLoad)
        destroy()
      }
    }

    return () => destroy()
  }, [destroy, i18n.language, reloadKey])

  if (!env.turnstileSiteKey) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        Cloudflare Turnstile chưa cấu hình. Thêm VITE_TURNSTILE_SITE_KEY và rebuild.
      </p>
    )
  }

  return (
    <div className={className}>
      <div ref={ref} className="min-h-[65px]" />
      {error ? (
        <div className="mt-2 space-y-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900">
          <p className="font-medium">
            {error === 'script'
              ? 'Không tải được script Cloudflare Turnstile (mạng / chặn quảng cáo).'
              : 'Turnstile không kết nối được. Thường do hostname chưa được khai báo hoặc trình duyệt chặn.'}
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-red-900/90">
            <li>
              Cloudflare Dashboard → Turnstile → widget →{' '}
              <strong>Hostname Management</strong>
            </li>
            <li>
              Thêm chính xác: <code className="rounded bg-white px-1 font-mono">{hostname}</code>
            </li>
            <li>
              Cũng nên thêm: <code className="rounded bg-white px-1 font-mono">localhost</code>
            </li>
            <li>Lưu widget → đợi 1–2 phút → bấm Thử lại</li>
            <li>Tắt chặn quảng cáo / thử Chrome thường (không dùng in-app Facebook/LINE)</li>
          </ol>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setError(null)
              setReloadKey((k) => k + 1)
            }}
          >
            Thử lại Turnstile
          </Button>
        </div>
      ) : null}
    </div>
  )
}
