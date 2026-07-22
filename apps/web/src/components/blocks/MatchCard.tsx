import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'

interface MatchCardProps {
  team1: string[]
  team2: string[]
  status: 'Em andamento' | 'Finalizada' | 'Aguardando'
  progress?: number
}

export function MatchCard({ team1, team2, status, progress = 0 }: MatchCardProps) {
  return (
    <div className="rounded-[22px] bg-surface border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {team1.map((name, i) => (
            <Avatar key={i} size="sm" initials={name.slice(0, 2).toUpperCase()} />
          ))}
          <span className="font-heading font-bold text-ink">vs</span>
          {team2.map((name, i) => (
            <Avatar key={i} size="sm" initials={name.slice(0, 2).toUpperCase()} />
          ))}
        </div>
        <Badge variant={status === 'Em andamento' ? 'warning' : status === 'Finalizada' ? 'success' : 'primary'}>
          {status}
        </Badge>
      </div>
      <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-base"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}