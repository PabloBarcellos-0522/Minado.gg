import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'

interface LeaderboardEntry {
  rank: number
  username: string
  score: number
}

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  title?: string
}

export function Leaderboard({ entries, title = '🏆 Ranking semanal' }: LeaderboardProps) {
  return (
    <div className="rounded-[22px] bg-surface border border-border p-4">
      <h3 className="font-heading font-bold text-h5 mb-4">{title}</h3>
      <div className="flex flex-col gap-3">
        {entries.map((entry) => (
          <div key={entry.rank} className="flex items-center gap-3">
            <Badge variant={entry.rank === 1 ? 'accent' : entry.rank === 2 ? 'secondary' : 'primary'}>
              {entry.rank}
            </Badge>
            <Avatar size="sm" initials={entry.username.slice(0, 2).toUpperCase()} />
            <span className="flex-1 font-heading font-bold text-ink">{entry.username}</span>
            <span className="text-small text-ink-muted">{entry.score} pts</span>
          </div>
        ))}
      </div>
    </div>
  )
}