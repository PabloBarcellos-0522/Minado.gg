import '../../styles/game.css'

interface MascoteProps {
  state?: 'happy' | 'exploded'
  size?: number
  className?: string
}

export function Mascote({ state = 'happy', size = 80, className = '' }: MascoteProps) {
  const classNames = ['mascote', className].filter(Boolean)
  if (state === 'happy') classNames.push('mascote--happy')
  if (state === 'exploded') classNames.push('mascote--exploded')

  return (
    <div
      className={classNames.join(' ')}
      style={{ '--bomb-size': `${size}px` } as React.CSSProperties}
    >
      <svg viewBox="0 0 24 24">
        <g className="bomb-face">
          <circle className="bomb-body" cx="12" cy="14" r="8" fill="#1E293B"/>
          {state === 'happy' ? (
            <>
              <circle cx="9" cy="13" r="1.4" fill="#fff"/>
              <circle cx="15" cy="13" r="1.4" fill="#fff"/>
              <path d="M9 17 q3 2 6 0" stroke="#fff" strokeWidth="1.5" fill="none"/>
            </>
          ) : (
            <>
              <circle cx="9" cy="13" r="1.6" fill="#fff"/>
              <circle cx="15" cy="13" r="1.6" fill="#fff"/>
              <path d="M9 16 q3 -2 6 0" stroke="#fff" strokeWidth="1.5" fill="none"/>
            </>
          )}
        </g>
        <path d="M12 6 l1.5 -3" stroke="#1E293B" strokeWidth="1.5"/>
        <circle cx="14" cy="3" r="1.6" fill="#F59E0B"/>
      </svg>
    </div>
  )
}