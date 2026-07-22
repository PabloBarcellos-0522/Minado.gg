import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm',
  secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 shadow-sm',
  accent: 'bg-accent-500 text-neutral-900 hover:bg-accent-600 shadow-sm',
  ghost: 'bg-transparent text-primary-600 hover:bg-surface-muted shadow-none',
  danger: 'bg-error-600 text-white hover:bg-error-700 shadow-sm',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-small',
  md: 'px-6 py-3 text-body',
  lg: 'px-8 py-4 text-h5',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2',
        'font-heading font-bold',
        'border-none rounded-full',
        'cursor-pointer select-none',
        'transition-all duration-base ease-bounce',
        'hover:-translate-y-px active:scale-96',
        'focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--color-surface),0_0_0_5px_var(--color-ring)]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
        variantClasses[variant],
        sizeClasses[size],
        loading ? 'text-transparent pointer-events-none relative' : '',
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            className="w-[1.1em] h-[1.1em] border-3 border-current border-t-transparent rounded-full animate-spin"
            style={{ color: 'var(--btn-fg, white)' }}
          />
        </span>
      )}
      {children}
    </button>
  )
}
