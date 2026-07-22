import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        <input
          ref={ref}
          className={[
            'font-body text-body',
            'px-4 py-3',
            'text-ink bg-input',
            'border-[1.5px] border-border rounded-[14px]',
            'transition-all duration-base ease-standard',
            'placeholder:text-ink-muted',
            'focus:outline-none focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-ring)_35%,transparent)]',
            error
              ? 'border-error focus:shadow-[0_0_0_3px_var(--color-error-soft)]'
              : '',
            className,
          ].join(' ')}
          {...props}
        />
        {helperText && (
          <span
            className={[
              'text-small',
              error ? 'text-error' : 'text-ink-muted',
            ].join(' ')}
          >
            {helperText}
          </span>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
