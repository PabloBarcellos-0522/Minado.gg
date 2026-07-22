import { type HTMLAttributes, type ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'elevated'
  children: ReactNode
}

export function Card({
  variant = 'default',
  children,
  className = '',
  ...props
}: CardProps) {
  const variantClasses = {
    default: 'bg-surface border-border shadow-sm',
    muted: 'bg-surface-muted border-border shadow-sm',
    elevated: 'bg-surface border-border shadow-lg',
  }

  return (
    <div
      className={[
        'border rounded-[22px] p-6',
        variantClasses[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={['mb-3', className].join(' ')}>{children}</div>
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h3
      className={[
        'font-heading font-extra text-h5 text-ink',
        className,
      ].join(' ')}
    >
      {children}
    </h3>
  )
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={['text-ink-muted', className].join(' ')}>{children}</div>
}
