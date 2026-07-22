import '../../styles/game.css'

interface PingOption {
  type: string
  label: string
  icon?: React.ReactNode
}

interface PingRowProps {
  pings?: PingOption[]
  onSelect?: (_type: string) => void
}

const defaultPings: PingOption[] = [
  {
    type: 'haha',
    label: 'Haha',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-500)" strokeWidth="2">
        <circle cx="12" cy="12" r="9"/>
        <path d="M8 14 q4 4 8 0"/>
        <line x1="9" y1="9" x2="9" y2="9"/>
        <line x1="15" y1="9" x2="15" y2="9"/>
      </svg>
    ),
  },
  {
    type: 'oops',
    label: 'Oops',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2">
        <circle cx="12" cy="12" r="9"/>
        <line x1="9" y1="9" x2="9" y2="9"/>
        <line x1="15" y1="9" x2="15" y2="9"/>
        <path d="M9 15 q3 -3 6 0"/>
      </svg>
    ),
  },
  {
    type: 'gg',
    label: 'GG',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2">
        <circle cx="12" cy="12" r="9"/>
        <path d="M8 13 q4 4 8 0"/>
        <polyline points="8 9 10 9"/>
        <polyline points="14 9 16 9"/>
      </svg>
    ),
  },
  {
    type: 'heart',
    label: 'Coração',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary-500)" strokeWidth="2">
        <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z"/>
      </svg>
    ),
  },
]

export function PingRow({ pings = defaultPings, onSelect }: PingRowProps) {
  return (
    <div className="ping-row">
      {pings.map((ping) => (
        <button
          key={ping.type}
          className="ping"
          onClick={() => onSelect?.(ping.type)}
        >
          {ping.icon}
          <span>{ping.label}</span>
        </button>
      ))}
    </div>
  )
}