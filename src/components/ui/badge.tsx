import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'muted'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variant === 'default' && 'bg-navy-100 text-navy-800',
        variant === 'success' && 'bg-emerald-100 text-emerald-800',
        variant === 'warning' && 'bg-amber-100 text-amber-900',
        variant === 'danger' && 'bg-red-100 text-red-800',
        variant === 'muted' && 'bg-slate-100 text-slate-600',
        className,
      )}
      {...props}
    />
  )
}
