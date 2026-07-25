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
        const disconnected = player.isConnected === false
        return (
          <div
            key={player.id}
            className={[
              'flex items-center gap-3 p-2 rounded-[14px] transition-opacity',
              isYou ? 'bg-surface-muted' : '',
              disconnected ? 'opacity-50' : '',
            ].join(' ')}
          >
            <Avatar
              src={player.avatarUrl}
              initials={player.username[0]}
              size="sm"
            />
            <span className={[
              'flex-1 font-heading font-medium truncate',
              disconnected ? 'text-ink-muted' : 'text-ink',
            ].join(' ')}>
              {player.username}
              {isYou && (
                <span className="text-ink-muted text-small ml-1">(você)</span>
              )}
              {disconnected && (
                <span className="text-ink-muted text-small ml-1">(desconectado)</span>
              )}
            </span>
            {player.isHost && (
              <Badge variant="accent">Host</Badge>
            )}
            {disconnected ? (
              <Badge variant="secondary">Ausente</Badge>
            ) : player.isReady ? (
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
