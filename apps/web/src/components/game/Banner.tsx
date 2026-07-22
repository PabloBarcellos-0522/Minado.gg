import type { ReactNode } from 'react'
import '../../styles/game.css'

interface BannerProps {
  type: 'win' | 'lose'
  title: string
  subtitle?: string
  emoji?: ReactNode
  children?: ReactNode
}

export function Banner({ type, title, subtitle, emoji, children }: BannerProps) {
  return (
    <div className={`banner ${type === 'win' ? 'win-banner' : 'lose-banner'}`}>
      {emoji && <div className="banner__emoji">{emoji}</div>}
      <h2 className="banner__title">{title}</h2>
      {subtitle && <p className="banner__sub">{subtitle}</p>}
      {children}
    </div>
  )
}
