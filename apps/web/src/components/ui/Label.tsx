import { type LabelHTMLAttributes } from 'react'

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>

export function Label({ className = '', children, ...props }: LabelProps) {
  return (
    <label
      className={[
        'font-heading font-bold text-small text-ink',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </label>
  )
}
