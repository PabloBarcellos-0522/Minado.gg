import type { ReactNode } from 'react'

interface GameModeCardProps {
  icon: ReactNode
  title: string
  description: string
  onClick?: () => void
}

export function GameModeCard({ icon, title, description, onClick }: GameModeCardProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'bg-surface border-2 border-border rounded-[22px] p-5',
        'text-left cursor-pointer',
        'transition-all duration-base ease-bounce',
        'hover:-translate-y-1 hover:border-primary-400',
      ].join(' ')}
    >
      <div className="w-11 h-11 rounded-[14px] grid place-items-center bg-surface-muted mb-3">
        {icon}
      </div>
      <h3 className="font-heading font-bold text-h5 text-ink mb-1">{title}</h3>
      <p className="text-small text-ink-muted">{description}</p>
    </button>
  )
}

export function ModeGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
      {children}
    </div>
  )
}
