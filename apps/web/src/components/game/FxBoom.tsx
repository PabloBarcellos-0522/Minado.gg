import { useEffect, useRef, useState } from 'react'
import '../../styles/game.css'

interface FxBoomProps {
  active?: boolean
  onComplete?: () => void
}

export function FxBoom({ active = false, onComplete }: FxBoomProps) {
  const [isActive, setIsActive] = useState(active)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (active) {
      setIsActive(true)
      const timer = setTimeout(() => {
        setIsActive(false)
        onCompleteRef.current?.()
      }, 600)
      return () => clearTimeout(timer)
    } else {
      setIsActive(false)
    }
  }, [active])

  return (
    <div className={`fx-boom ${isActive ? 'is-active' : ''}`}>
      <div className="fx-boom__core" />
      <div className="fx-boom__particle" style={{ '--tx': '60px', '--ty': '-40px' } as React.CSSProperties} />
      <div className="fx-boom__particle" style={{ '--tx': '-60px', '--ty': '-30px' } as React.CSSProperties} />
      <div className="fx-boom__particle" style={{ '--tx': '55px', '--ty': '45px' } as React.CSSProperties} />
      <div className="fx-boom__particle" style={{ '--tx': '-50px', '--ty': '50px' } as React.CSSProperties} />
      <div className="fx-boom__particle" style={{ '--tx': '0px', '--ty': '-65px' } as React.CSSProperties} />
      <div className="fx-boom__particle" style={{ '--tx': '10px', '--ty': '60px' } as React.CSSProperties} />
    </div>
  )
}