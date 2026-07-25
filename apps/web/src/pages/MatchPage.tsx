import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Banner } from '@/components/game/Banner'
import { Board as GameBoard } from '@/components/game/Board'
import { Mascote } from '@/components/game/Mascote'
import { PingRow } from '@/components/game/PingRow'
import { FxBoom } from '@/components/game/FxBoom'
import { FxConfetti } from '@/components/game/FxConfetti'
import { ChatPanel } from '@/components/blocks/ChatPanel'
import { Navbar } from '@/components/blocks/Navbar'
import { useGameStore } from '@/store/gameStore'
import { useRoomStore } from '@/store/roomStore'
import { useAuthStore } from '@/store/authStore'
import { getSocket } from '@/lib/socket'
import type { GameMode } from '@minado/shared'

const modeLabels: Record<GameMode, string> = {
  competitive: 'Competitivo',
  'multi-board': 'Vários Tabuleiros',
  cooperative: 'Cooperativo',
  'battle-royale': 'Battle Royale',
  'fog-of-war': 'Fog of War',
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function MatchPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const board = useGameStore((s) => s.board)
  const gameState = useGameStore((s) => s.gameState)
  const players = useGameStore((s) => s.players)
  const messages = useGameStore((s) => s.messages)
  const timeElapsed = useGameStore((s) => s.timeElapsed)
  const flagsPlaced = useGameStore((s) => s.flagsPlaced)
  const showBoom = useGameStore((s) => s.showBoom)
  const showConfetti = useGameStore((s) => s.showConfetti)
  const boardConfig = useGameStore((s) => s.boardConfig)
  const currentUserId = useGameStore((s) => s.currentUserId)
  const removedForInactivity = useGameStore((s) => s.removedForInactivity)

  const revealCell = useGameStore((s) => s.revealCell)
  const flagCell = useGameStore((s) => s.flagCell)
  const addMessage = useGameStore((s) => s.addMessage)
  const tick = useGameStore((s) => s.tick)
  const setShowBoom = useGameStore((s) => s.setShowBoom)
  const setShowConfetti = useGameStore((s) => s.setShowConfetti)
  const setCurrentUserId = useGameStore((s) => s.setCurrentUserId)
  const setRemovedForInactivity = useGameStore((s) => s.setRemovedForInactivity)

  const [showChat, setShowChat] = useState(true)
  const [loadingTimedOut, setLoadingTimedOut] = useState(false)

  const mineCount = boardConfig.mines
  const minesRemaining = mineCount - flagsPlaced

  useEffect(() => {
    const roomId = id
    if (!roomId) return

    const board = useGameStore.getState().board

    // Join/rejoin the room so the server knows this socket belongs to this player
    useRoomStore.getState().joinRoom(roomId)

    const authUser = useAuthStore.getState().user
    if (authUser?.id) {
      setCurrentUserId(authUser.id)
    }

    // Only add sys-start if board already exists (navigated from RoomPage normally)
    // When reconnecting, the game:started socket event will populate the store
    if (board.length > 0 && !useGameStore.getState().messages.find((m) => m.id === 'sys-start')) {
      addMessage({
        id: 'sys-start',
        from: 'Sistema',
        text: 'Partida iniciada! Boa sorte!',
        ts: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isSystem: true,
      })
    }
  }, [])

  useEffect(() => {
    if (gameState === 'playing') {
      const interval = setInterval(tick, 1000)
      return () => clearInterval(interval)
    }
  }, [gameState, tick])

  useEffect(() => {
    if (gameState === 'won' || gameState === 'lost') {
      const delay = gameState === 'won' ? 3000 : 2000
      const timer = setTimeout(() => navigate(`/partida/${id}/resultado`), delay)
      return () => clearTimeout(timer)
    }
  }, [gameState, id, navigate])

  useEffect(() => {
    if (removedForInactivity) {
      setRemovedForInactivity(false)
      navigate('/sala', { state: { error: 'Você foi removido da partida por inatividade' } })
    }
  }, [removedForInactivity, navigate, setRemovedForInactivity])

  useEffect(() => {
    if (!board || board.length === 0) {
      const timer = setTimeout(() => setLoadingTimedOut(true), 10000)
      return () => clearTimeout(timer)
    }
    setLoadingTimedOut(false)
  }, [board])

  // Guard: wait for board data before rendering (covers reconnect scenario)
  if (!board || board.length === 0) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-canvas">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="font-heading text-h5 text-ink mb-4">Reconectando...</p>
          {loadingTimedOut && (
            <Button variant="secondary" onClick={() => navigate('/sala')}>
              Voltar ao lobby
            </Button>
          )}
        </div>
      </div>
    )
  }

  const handleReveal = (row: number, col: number) => {
    revealCell(row, col)
  }

  const handleFlag = (row: number, col: number) => {
    flagCell(row, col)
  }

  const handlePing = (type: string) => {
    const pingMessages: Record<string, string> = {
      haha: '😄 Haha!',
      oops: '😅 Oops!',
      gg: '👏 GG!',
      heart: '❤️',
    }
    sendMessage(pingMessages[type] || type)
  }

  const sendMessage = (text: string) => {
    const socket = getSocket()
    if (socket.connected) {
      socket.emit('chat:message', { text })
      return
    }
    const currentPlayer = players.find((p) => p.id === currentUserId)
    const newMsg = {
      id: Date.now().toString(),
      from: currentPlayer?.username || 'Você',
      text,
      ts: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }
    addMessage(newMsg)
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar username={players.find((p) => p.id === currentUserId)?.username} avatarUrl="" />

      <main className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>
        {/* Left: Game Board */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 min-w-0">
          {/* HUD Top */}
          <div className="w-full max-w-[600px] flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2 rounded-[14px] bg-surface border border-border">
                <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-heading font-bold text-h5 text-ink tabular-nums">{formatTime(timeElapsed)}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-[14px] bg-surface border border-border">
                <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-heading font-bold text-h5 text-ink tabular-nums">{minesRemaining}</span>
                <span className="text-small text-ink-muted">minas</span>
              </div>
            </div>

            {/* Live Scoreboard */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {players
                .filter((p) => !p.isEliminated)
                .sort((a, b) => b.score - a.score)
                .map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface border border-border"
                    style={{ borderLeftColor: p.color, borderLeftWidth: 4 }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-heading font-bold text-small text-ink">{p.username}</span>
                    <span className="font-heading font-bold text-small" style={{ color: p.color }}>
                      {p.score >= 0 ? '+' : ''}{p.score}
                    </span>
                    {i === 0 && <span className="text-accent-500">👑</span>}
                  </div>
                ))}
            </div>
          </div>

          {/* Board */}
          <div className="relative">
            <FxBoom active={showBoom} onComplete={() => setShowBoom(false)} />
            <GameBoard board={board} onReveal={handleReveal} onFlag={handleFlag} />
            {showConfetti && <FxConfetti active={true} onComplete={() => setShowConfetti(false)} />}
          </div>

          {/* Mascot */}
          <div className="mt-4">
            <Mascote
              state={gameState === 'lost' ? 'exploded' : 'happy'}
              size={80}
              className="mx-auto"
            />
          </div>

          {/* Ping Row */}
          <div className="mt-4 w-full max-w-[600px]">
            <PingRow onSelect={handlePing} />
          </div>

          {/* Game Over Banner */}
          {(gameState === 'won' || gameState === 'lost') && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--color-neutral-900)_70%,transparent)]">
              <Banner
                type={gameState === 'won' ? 'win' : 'lose'}
                title={gameState === 'won' ? 'VITÓRIA!' : 'BOMBARDEADO!'}
                subtitle={gameState === 'won' ? 'Você desarmou tudo com estilo. Lenda!' : 'Relaxa, foi só um BOOM de sorte. Bora de novo?'}
                emoji={gameState === 'won' ? '🎉' : '💣'}
              />
            </div>
          )}
        </div>

        {/* Right: Chat & Players */}
        <aside className="w-full lg:w-[380px] lg:flex-none flex flex-col bg-surface border-l border-border overflow-hidden min-w-0">
          {/* Chat Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden m-3 w-full justify-start"
            onClick={() => setShowChat(!showChat)}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h16M8 12l-4 4m4-4l-4-4" />
            </svg>
            {showChat ? 'Fechar Chat' : 'Abrir Chat'}
          </Button>

          {/* Players Panel */}
          <div className="p-3 border-b border-border lg:p-4">
            <h3 className="font-heading font-bold text-h6 text-ink mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Jogadores
            </h3>
            <div className="flex flex-col gap-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 p-2 rounded-[14px] ${p.id === currentUserId ? 'bg-surface-muted' : ''}`}
                  style={{ opacity: p.isEliminated || p.isConnected === false ? 0.5 : 1 }}
                >
                  <Avatar
                    size="sm"
                    initials={p.username[0]}
                    style={{ borderColor: p.color }}
                  />
                  <span className="flex-1 font-heading font-medium text-ink truncate">
                    {p.username}
                    {p.id === currentUserId && <span className="text-ink-muted text-small ml-1">(você)</span>}
                  </span>
                  <span className="font-heading font-bold text-small" style={{ color: p.color }}>
                    {p.score >= 0 ? '+' : ''}{p.score}
                  </span>
                  {p.isEliminated && <Badge variant="danger" size="sm">Eliminado</Badge>}
                  {p.isConnected === false && <Badge variant="warning" size="sm">Desconectado</Badge>}
                </div>
              ))}
            </div>
          </div>

          {/* Chat Panel */}
          {showChat && (
            <div className="flex-1 flex flex-col min-h-0 lg:border-t lg:border-border">
              <ChatPanel
                messages={messages}
                onSend={sendMessage}
                currentUsername={players.find((p) => p.id === currentUserId)?.username}
              />
            </div>
          )}

          {/* Game Info */}
          <div className="p-3 border-t border-border lg:p-4">
            <h4 className="font-heading font-bold text-h6 text-ink mb-3">Info da Partida</h4>
            <div className="space-y-2 text-small">
              <div className="flex justify-between">
                <span className="text-ink-muted">Modo</span>
                <span className="font-heading font-bold text-ink">{modeLabels.competitive}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Dificuldade</span>
                <span className="font-heading font-bold text-ink">
                  {boardConfig.rows}×{boardConfig.cols}, {mineCount} minas
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Sala</span>
                <span className="font-heading font-bold text-ink font-mono">{id}</span>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
