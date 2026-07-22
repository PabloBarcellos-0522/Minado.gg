import { type ReactNode } from 'react'

type AlertVariant = 'error' | 'warning' | 'success' | 'info'

interface AlertProps {
  variant?: AlertVariant
  children: ReactNode
  className?: string
}

const variantClasses: Record<AlertVariant, string> = {
  error: 'bg-error-soft text-error border-error-soft',
  warning: 'bg-warning-soft text-warning border-warning-soft',
  success: 'bg-success-soft text-success border-success-soft',
  info: 'bg-info-soft text-info border-info-soft',
}

export function Alert({ variant = 'error', children, className = '' }: AlertProps) {
  return (
    <div
      className={[
        'flex items-start gap-3',
        'rounded-[14px] p-3',
        'border',
        'text-small',
        variantClasses[variant],
        className,
      ].join(' ')}
      role="alert"
    >
      <div className="flex-1">{children}</div>
    </div>
  )
}