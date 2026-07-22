import { useEffect, useState } from 'react'
import '../../styles/game.css'

interface FxConfettiProps {
  active?: boolean
  duration?: number
  onComplete?: () => void
}

export function FxConfetti({ active = false, duration = 2000, onComplete }: FxConfettiProps) {
  const [isActive, setIsActive] = useState(active)

  useEffect(() => {
    if (active) {
      setIsActive(true)
      const timer = setTimeout(() => {
        setIsActive(false)
        onComplete?.()
      }, duration)
      return () => clearTimeout(timer)
    }
    setIsActive(false)
  }, [active, duration])

  return (
    <div className={`fx-confetti ${isActive ? 'is-active' : ''}`}>
      <div className="confetti-piece" />
      <div className="confetti-piece" />
      <div className="confetti-piece" />
      <div className="confetti-piece" />
      <div className="confetti-piece" />
      <div className="confetti-piece" />
    </div>
  )
}
