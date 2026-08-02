import { forwardRef, type InputHTMLAttributes } from 'react'

export const Switch = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ checked, onChange, disabled, className = '', ...props }, ref) => {
    return (
      <label className={['inline-flex items-center cursor-pointer', className].join(' ')}>
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <span
          className={[
            'relative flex items-center w-11 h-6 rounded-full transition-colors duration-base ease-standard',
            'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
            'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
            checked ? 'bg-primary-500' : 'bg-border',
          ].join(' ')}
        >
          <span
            className={[
              'pointer-events-none block h-5 w-5 transform rounded-full bg-white shadow-sm',
              'transition-transform duration-base ease-bounce',
              checked ? 'translate-x-6' : 'translate-x-0',
            ].join(' ')}
          />
        </span>
      </label>
    )
  }
)

Switch.displayName = 'Switch'