import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { PlayerRoster } from '@/components/blocks/PlayerRoster'
import { ChatPanel } from '@/components/blocks/ChatPanel'
import { Navbar } from '@/components/blocks/Navbar'
import { Mascote } from '@/components/game/Mascote'
import { PingRow } from '@/components/game/PingRow'
import { useRoomStore } from '@/store/roomStore'
import { useAuthStore } from '@/store/authStore'
import { getSocket, onSocketEvent } from '@/lib/socket'
import type { GameMode, Difficulty } from '@minado/shared'

const modeLabels: Record<GameMode, string> = {
  competitive: 'Competitivo',
  'multi-board': 'Vários Tabuleiros',
  cooperative: 'Cooperativo',
  'battle-royale': 'Battle Royale',
  'fog-of-war': 'Fog of War',
}

const difficultyLabels: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
  expert: 'Expert',
}

const modeColors: Record<GameMode, 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger'> = {
  competitive: 'primary',
  'multi-board': 'secondary',
  cooperative: 'success',
  'battle-royale': 'danger',
  'fog-of-war': 'warning',
}

export function RoomPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const location = useLocation()
  const room = useRoomStore((s) => s.currentRoom)
  const joinRoom = useRoomStore((s) => s.joinRoom)
  const leaveRoom = useRoomStore((s) => s.leaveRoom)
  const toggleReady = useRoomStore((s) => s.toggleReady)
  const startGame = useRoomStore((s) => s.startGame)
  const initSocketListeners = useRoomStore((s) => s.initSocketListeners)
  const roomError = useRoomStore((s) => s.error)
  const isLoading = useRoomStore((s) => s.isLoading)
  const user = useAuthStore((s) => s.user)

  const [messages, setMessages] = useState<Array<{ id: string; from: string; text: string; ts: string; isSystem?: boolean }>>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showCreatedModal, setShowCreatedModal] = useState(!!(location.state as any)?.justCreated)
  const [inviteLink, setInviteLink] = useState('')
  const currentUserId = user?.id || '1'
  const [countdown, setCountdown] = useState<number | null>(null)
  const isNavigatingToMatch = useRef(false)
  const joinedInThisEffect = useRef(false)

  useEffect(() => {
    if (id) {
      if (useRoomStore.getState().currentRoom?.id !== id) {
        joinRoom(id)
        joinedInThisEffect.current = true
      }
    }

    const unsubChat = onSocketEvent('chat:message', (data: unknown) => {
      const msg = data as { id: string; from: string; text: string; ts: string }
      setMessages((prev) => [...prev, {
        id: msg.id,
        from: msg.from,
        text: msg.text,
        ts: msg.ts ? new Date(msg.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
      }])
    })

    const cleanup = initSocketListeners()
    return () => {
      unsubChat()
      cleanup()
      if (!isNavigatingToMatch.current && joinedInThisEffect.current) {
        leaveRoom()
      }
    }
  }, [id])

  useEffect(() => {
    if (id) {
      setInviteLink(`${window.location.origin}/sala/${id}`)
    }
  }, [id])

  const currentPlayer = room?.players.find((p) => p.id === currentUserId)
  const isHost = room?.hostId === currentUserId
  const allReady = (room?.players.length ?? 0) >= 2 && (room?.players.every((p) => p.isReady) ?? false)
  const canStart = isHost && allReady && room?.status === 'waiting'

  const handleStartGame = () => {
    isNavigatingToMatch.current = true
    startGame()
    setTimeout(() => navigate(`/partida/${id}`), 500)
  }

  useEffect(() => {
    if (!room) return
    const allReady = room.players.length >= 2 && room.players.every((p) => p.isReady)
    const isHost = room.hostId === currentUserId
    if (allReady && room.players.length >= 2 && room.status === 'waiting') {
      let count = 5
      setCountdown(count)
      const interval = setInterval(() => {
        count--
        if (count <= 0) {
          clearInterval(interval)
          setCountdown(null)
          if (isHost) {
            handleStartGame()
          }
        } else {
          setCountdown(count)
        }
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setCountdown(null)
    }
  }, [room])

  useEffect(() => {
    if (room?.status === 'playing') {
      isNavigatingToMatch.current = true
      const timer = setTimeout(() => navigate(`/partida/${id}`), 300)
      return () => clearTimeout(timer)
    }
  }, [room?.status, id, navigate])

  const handleSendMessage = (text: string) => {
    const socket = getSocket()
    if (socket.connected) {
      socket.emit('chat:message', { text })
      return
    }
    const newMsg = {
      id: Date.now().toString(),
      from: currentPlayer?.username || 'Você',
      text,
      ts: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((prev) => [...prev, newMsg])
  }

  const handlePing = (type: string) => {
    const pingMessages: Record<string, string> = {
      haha: '😄 Haha!',
      oops: '😅 Oops!',
      gg: '👏 GG!',
      heart: '❤️',
    }
    handleSendMessage(pingMessages[type] || type)
  }

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(inviteLink)
  }

  const currentRoom = room
  if (!currentRoom) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-5">
          <div className="text-center">
            {roomError ? (
              <>
                <svg className="w-16 h-16 mx-auto text-error mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="font-heading font-bold text-h5 text-error mb-4">{roomError}</p>
                <Button variant="primary" onClick={() => navigate('/lobby')}>Voltar ao Lobby</Button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-surface-muted border border-border mx-auto mb-4 animate-pulse" />
                <p className="font-heading font-bold text-h5 text-ink-muted">{isLoading ? 'Entrando na sala...' : 'Aguardando servidor...'}</p>
              </>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar username={currentPlayer?.username} avatarUrl={currentPlayer?.avatarUrl} />

      <main className="flex-1 p-5 max-w-[1400px] mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[14px] bg-primary-100 grid place-items-center">
              <Mascote state="happy" size={40} />
            </div>
            <div>
              <h1 className="font-heading font-extra text-h2 text-ink">Sala {currentRoom.id}</h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant={modeColors[currentRoom.mode]}>{modeLabels[currentRoom.mode]}</Badge>
                <span className="text-small text-ink-muted">{difficultyLabels[currentRoom.difficulty]}</span>
                {currentRoom.isPrivate && <Badge variant="secondary">Privada</Badge>}
                {countdown !== null && (
                  <Badge variant="warning" className="animate-pulse">
                    Iniciando em {countdown}s...
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowInviteModal(true)}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h16M8 12l-4 4m4-4l-4-4" />
              </svg>
              Convidar
            </Button>
            {isHost && !canStart && (
              <Button variant="ghost" size="sm" disabled>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Aguardando jogadores...
              </Button>
            )}
            {canStart && (
              <Button variant="primary" size="sm" onClick={handleStartGame} loading={currentRoom.status === 'playing'}>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Iniciar Partida
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left: Player Roster + Chat */}
          <div className="flex flex-col gap-6">
            {/* Room Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Configuração da Partida</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-small">
                  <div>
                    <span className="text-ink-muted block mb-1">Tabuleiro</span>
                    <span className="font-heading font-bold text-ink">
                      {currentRoom.boardConfig.rows}×{currentRoom.boardConfig.cols}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-muted block mb-1">Minas</span>
                    <span className="font-heading font-bold text-ink">{currentRoom.boardConfig.mines}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted block mb-1">Densidade</span>
                    <span className="font-heading font-bold text-ink">
                      {((currentRoom.boardConfig.mines / (currentRoom.boardConfig.rows * currentRoom.boardConfig.cols)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-muted block mb-1">Máx. Jogadores</span>
                    <span className="font-heading font-bold text-ink">{currentRoom.maxPlayers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Player Roster */}
            <PlayerRoster players={currentRoom.players} currentUserId={currentUserId} />

            {/* Ready Toggle for all players */}
            {currentRoom.status === 'waiting' && (
              <Card>
                <CardContent className="py-2">
                  <Button
                    variant={currentPlayer?.isReady ? 'primary' : 'secondary'}
                    className="w-full"
                    onClick={toggleReady}
                    size="lg"
                  >
                    {currentPlayer?.isReady ? (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Pronto!
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Marcar como Pronto
                      </>
                    )}
                  </Button>
                  {isHost ? (
                    <p className="text-center text-small text-ink-muted mt-2">
                      Marque como pronto e clique em "Iniciar Partida" quando todos estiverem prontos
                    </p>
                  ) : (
                    <p className="text-center text-small text-ink-muted mt-2">
                      O host iniciará quando todos estiverem prontos
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Chat Panel */}
            <ChatPanel
              messages={messages}
              onSend={handleSendMessage}
              currentUsername={currentPlayer?.username}
            />
          </div>

          {/* Right: Mascot + Quick Actions */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            {/* Mascot */}
            <Card className="text-center">
              <CardContent className="py-6">
                <Mascote state="happy" size={100} className="mx-auto mb-4" />
                <h3 className="font-heading font-bold text-h5 text-ink mb-1">
                  {currentRoom.status === 'waiting' ? 'Aguardando jogadores...' : 'Preparando partida!'}
                </h3>
                <p className="text-ink-muted text-body">
                  {currentRoom.status === 'waiting'
                    ? 'Converse com o time, marque como pronto e prepare-se para o BOOM!'
                    : 'O tabuleiro está sendo gerado...'}
                </p>
              </CardContent>
            </Card>

            {/* Quick Pings */}
            <Card>
              <CardHeader>
                <CardTitle>Reações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                <PingRow onSelect={handlePing} />
              </CardContent>
            </Card>

            {/* Invite Link */}
            <Card variant="muted">
              <CardHeader>
                <CardTitle>Link de Convite</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={inviteLink}
                    readOnly
                    className="flex-1 bg-input"
                  />
                  <Button variant="secondary" size="sm" onClick={copyInviteLink} className="h-full">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </Button>
                </div>
                <p className="text-small text-ink-muted mt-2 text-center">
                  Compartilhe este link para seus amigos entrarem direto na sala
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Created Modal */}
      <Modal open={showCreatedModal} onClose={() => setShowCreatedModal(false)} title="Sala Criada!">
        <div className="text-center py-2">
          <div className="w-16 h-16 rounded-full bg-success-soft grid place-items-center mx-auto mb-4 text-success">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-heading font-bold text-h5 mb-2">Sala <span className="text-primary-600">{room?.id}</span> criada!</h3>
          <p className="text-ink-muted text-body mb-4">Compartilhe o código ou o link para seus amigos entrarem.</p>
          <div className="p-3 rounded-[14px] bg-surface-muted border border-border font-mono text-h6 font-bold text-primary-600">
            {room?.id}
          </div>
        </div>
        <ModalActions>
          <Button variant="primary" onClick={() => setShowCreatedModal(false)} className="w-full">Fechar</Button>
        </ModalActions>
      </Modal>

      {/* Invite Modal */}
      <Modal open={showInviteModal} onClose={() => setShowInviteModal(false)} title="Convidar Amigos">
        <div className="space-y-4">
          <div>
            <label className="font-heading font-bold text-small text-ink mb-2 block">Link da Sala</label>
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly className="flex-1" />
              <Button variant="secondary" size="sm" onClick={copyInviteLink}>
                Copiar
              </Button>
            </div>
            <p className="text-small text-ink-muted mt-1">Envie este link para seus amigos entrarem na sala</p>
          </div>

          <hr className="border-border" />

          <div>
            <label className="font-heading font-bold text-small text-ink mb-2 block">Código da Sala</label>
            <div className="p-4 rounded-[14px] bg-surface-muted border border-border text-center">
              <span className="font-heading font-extra text-h3 text-primary-600 tracking-widest">{currentRoom.id}</span>
              <p className="text-small text-ink-muted mt-1">Digite no lobby: "Entrar por código"</p>
            </div>
          </div>

          <ModalActions>
            <Button variant="ghost" onClick={() => setShowInviteModal(false)}>Fechar</Button>
            <Button variant="primary" onClick={copyInviteLink}>Copiar Link</Button>
          </ModalActions>
        </div>
      </Modal>
    </div>
  )
}