import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { Player } from '@minado/shared'

interface PlayerRosterProps {
  players: Player[]
  currentUserId?: string
}

export function PlayerRoster({ players, currentUserId }: PlayerRosterProps) {
  return (
    <div className="flex flex-col gap-1 bg-surface border border-border rounded-[22px] p-4 max-w-[360px]">
      {players.map((player) => {
        const isYou = player.id === currentUserId
        return (
          <div
            key={player.id}
            className={[
              'flex items-center gap-3 p-2 rounded-[14px]',
              isYou ? 'bg-surface-muted' : '',
            ].join(' ')}
          >
            <Avatar
              src={player.avatarUrl}
              initials={player.username[0]}
              size="sm"
            />
            <span className="flex-1 font-heading font-medium text-ink">
              {player.username}
              {isYou && (
                <span className="text-ink-muted text-small ml-1">(você)</span>
              )}
            </span>
            {player.isHost && (
              <Badge variant="accent">Host</Badge>
            )}
            {player.isReady ? (
              <Badge variant="success">Pronto</Badge>
            ) : (
              <Badge variant="warning">Esperando</Badge>
            )}
          </div>
        )
      })}
    </div>
  )
}
