import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

export function Alert({
  className,
  variant = 'info',
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: 'info' | 'success' | 'warning' | 'error' }) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border px-4 py-3 text-sm',
        variant === 'info' && 'border-navy-200 bg-navy-50 text-navy-800',
        variant === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
        variant === 'warning' && 'border-amber-200 bg-amber-50 text-amber-950',
        variant === 'error' && 'border-red-200 bg-red-50 text-red-900',
        className,
      )}
      {...props}
    />
  )
}
