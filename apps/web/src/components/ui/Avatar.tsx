import { type ImgHTMLAttributes } from 'react'

type AvatarSize = 'sm' | 'md' | 'lg'

interface AvatarProps extends ImgHTMLAttributes<HTMLImageElement> {
  size?: AvatarSize
  initials?: string
  variant?: 'default' | 'bomb'
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-small',
  md: 'w-11 h-11 text-body',
  lg: 'w-16 h-16 text-h5',
}

export function Avatar({
  size = 'md',
  initials,
  variant = 'default',
  src,
  alt,
  className = '',
  ...props
}: AvatarProps) {
  const isBomb = variant === 'bomb'

  if (!src) {
    return (
      <span
        className={[
          'inline-grid place-items-center',
          'font-heading font-bold',
          'rounded-full',
          'border-3 border-primary-400',
          'shadow-sm',
          isBomb
            ? 'bg-neutral-800 border-accent-400 text-white'
            : 'bg-secondary-500 text-white',
          sizeClasses[size],
          className,
        ].join(' ')}
      >
        {initials || '?'}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={alt || ''}
      className={[
        'rounded-full',
        'border-3 border-primary-400',
        'shadow-sm',
        'object-cover',
        isBomb ? 'border-accent-400' : '',
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    />
  )
}
