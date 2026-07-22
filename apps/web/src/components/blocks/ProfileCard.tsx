import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'

interface ProfileCardProps {
  username: string
  wins: number
  streak: number
  rank: string
  isOnline?: boolean
}

export function ProfileCard({ username, wins, streak, rank, isOnline = true }: ProfileCardProps) {
  return (
    <div className="rounded-[22px] bg-surface-muted border border-border p-5 max-w-[360px]">
      <div className="flex items-center gap-3 mb-4">
        <Avatar size="lg" initials={username.slice(0, 2).toUpperCase()} />
        <div>
          <div className="font-heading font-bold text-ink">{username}</div>
          <Badge variant={isOnline ? 'success' : 'warning'}>{isOnline ? 'Online' : 'Offline'}</Badge>
        </div>
      </div>
      <hr className="border-border my-4" />
      <div className="flex justify-around">
        <div className="flex flex-col items-center p-3 rounded-[14px] bg-surface-muted min-w-[80px]">
          <span className="font-heading font-bold text-h5">{wins}</span>
          <span className="text-small text-ink-muted">Vitórias</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-[14px] bg-surface-muted min-w-[80px]">
          <span className="font-heading font-bold text-h5">{streak}</span>
          <span className="text-small text-ink-muted">Sequência</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-[14px] bg-surface-muted min-w-[80px]">
          <span className="font-heading font-bold text-h5">{rank}</span>
          <span className="text-small text-ink-muted">Patente</span>
        </div>
      </div>
    </div>
  )
}