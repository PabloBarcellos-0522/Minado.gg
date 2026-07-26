import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import type { GameMode, Difficulty } from '@minado/shared'

interface RoomCardProps {
  id: string
  name: string
  mode: GameMode
  difficulty: Difficulty
  playerCount: number
  maxPlayers: number
  isPrivate?: boolean
  timeLimit?: number
}

const modeLabels: Record<GameMode, string> = {
  competitive: 'Competitivo',
  'multi-board': 'Vários Tabuleiros',
  cooperative: 'Cooperativo',
  'battle-royale': 'Battle Royale',
  'fog-of-war': 'Fog of War',
}

const modeColors: Record<GameMode, 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger'> = {
  competitive: 'primary',
  'multi-board': 'secondary',
  cooperative: 'success',
  'battle-royale': 'danger',
  'fog-of-war': 'warning',
}

const difficultyLabels: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
  expert: 'Expert',
}

const formatTimeLimit = (seconds: number) => {
  if (seconds <= 0) return 'Sem limite'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${m} min`
}

export function RoomCard({
  id,
  name,
  mode,
  difficulty,
  playerCount,
  maxPlayers,
  isPrivate = false,
  timeLimit,
}: RoomCardProps) {
  return (
    <Link
      to={`/sala/${id}`}
      className="block no-underline"
    >
      <div className="flex items-center gap-3 p-3 rounded-[14px] bg-surface border border-border hover:bg-surface-muted transition-colors duration-base">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-heading font-bold text-ink truncate">
              {name}
            </span>
            {isPrivate && (
              <Badge variant="secondary">Privada</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={modeColors[mode]}>{modeLabels[mode]}</Badge>
            <span className="text-small text-ink-muted">
              {difficultyLabels[difficulty]}
            </span>
            {timeLimit !== undefined && timeLimit > 0 && (
              <span className="text-small text-ink-muted">·</span>
            )}
            {timeLimit !== undefined && timeLimit > 0 && (
              <span className="text-small text-ink-muted">{formatTimeLimit(timeLimit)}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex -space-x-2">
            {Array.from({ length: Math.min(playerCount, 3) }).map((_, i) => (
              <Avatar key={i} size="sm" initials={`P${i + 1}`} />
            ))}
          </div>
          <span className="text-small text-ink-muted font-heading font-bold">
            {playerCount}/{maxPlayers}
          </span>
        </div>
      </div>
    </Link>
  )
}
