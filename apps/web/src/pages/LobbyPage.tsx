import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabList, TabTrigger, TabContent } from '@/components/ui/Tabs'
import { RoomCard } from '@/components/blocks/RoomCard'
import { ModeGrid, GameModeCard } from '@/components/blocks/GameModeCard'
import { Navbar } from '@/components/blocks/Navbar'
import { useRoomStore, type RoomWithName } from '@/store/roomStore'
import type { GameMode, Difficulty } from '@minado/shared'

const modeFilters: { value: GameMode | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'competitive', label: 'Competitivo' },
  { value: 'multi-board', label: 'Vários Tabuleiros' },
  { value: 'cooperative', label: 'Cooperativo' },
  { value: 'battle-royale', label: 'Battle Royale' },
  { value: 'fog-of-war', label: 'Fog of War' },
]

const difficultyFilters: { value: Difficulty | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Médio' },
  { value: 'hard', label: 'Difícil' },
  { value: 'expert', label: 'Expert' },
]

export function LobbyPage() {
  const [modeFilter, setModeFilter] = useState<GameMode | 'all'>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>('all')

  const rooms = useRoomStore((s) => s.rooms)
  const fetchRooms = useRoomStore((s) => s.fetchRooms)
  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  const filteredRooms = rooms.filter((room: RoomWithName) => {
    if (modeFilter !== 'all' && room.mode !== modeFilter) return false
    if (difficultyFilter !== 'all' && room.difficulty !== difficultyFilter) return false
    return true
  })

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar username="Jogador" avatarUrl="" />

      <main className="flex-1 p-5 max-w-[1400px] mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading font-extra text-h2 text-ink">Lobby</h1>
            <p className="text-ink-muted">Encontre uma sala ou crie a sua</p>
          </div>

          <Link to="/lobby/criar-sala">
            <Button variant="primary" size="lg">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Criar Sala
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex gap-2 flex-wrap">
                {modeFilters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setModeFilter(filter.value)}
                    className={`px-4 py-2 rounded-full text-small font-heading font-bold transition-all duration-base ${
                      modeFilter === filter.value
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'bg-surface-muted text-ink-muted hover:bg-surface hover:text-ink'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 flex-wrap">
                {difficultyFilters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setDifficultyFilter(filter.value)}
                    className={`px-4 py-2 rounded-full text-small font-heading font-bold transition-all duration-base ${
                      difficultyFilter === filter.value
                        ? 'bg-secondary-500 text-white shadow-sm'
                        : 'bg-surface-muted text-ink-muted hover:bg-surface hover:text-ink'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 sm:flex-none" />
              <Badge variant="primary">{filteredRooms.length} salas</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="salas" className="mb-6">
          <TabList>
            <TabTrigger value="salas">Salas Públicas</TabTrigger>
            <TabTrigger value="amigos">Amigos Online</TabTrigger>
            <TabTrigger value="ranking">Ranking Rápido</TabTrigger>
          </TabList>

          <TabContent value="salas">
            {filteredRooms.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <svg className="w-16 h-16 mx-auto text-ink-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h3 className="font-heading font-bold text-h5 text-ink mb-2">Nenhuma sala encontrada</h3>
                  <p className="text-ink-muted mb-4">Tente ajustar os filtros ou crie sua própria sala.</p>
                  <Link to="/lobby/criar-sala">
                    <Button variant="primary">Criar Sala</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    id={room.id}
                    name={room.name}
                    mode={room.mode}
                    difficulty={room.difficulty}
                    playerCount={room.players.length}
                    maxPlayers={room.maxPlayers}
                    isPrivate={room.isPrivate}
                  />
                ))}
              </div>
            )}
          </TabContent>

          <TabContent value="amigos">
            <Card>
              <CardContent className="py-2">
                <div className="flex flex-col gap-2">
                  {[
                    { name: 'Ana', status: 'online', game: 'Em partida: Competitivo' },
                    { name: 'Carlos', status: 'online', game: 'No lobby' },
                    { name: 'Bia', status: 'offline', game: 'Visto há 2h' },
                    { name: 'Zé', status: 'online', game: 'Em partida: Battle Royale' },
                  ].map((friend, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-[14px] hover:bg-surface-muted transition-colors">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-secondary-500 grid place-items-center font-heading font-bold text-white">
                          {friend.name[0]}
                        </div>
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface ${friend.status === 'online' ? 'bg-success' : 'bg-ink-muted'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-heading font-bold text-ink truncate">{friend.name}</div>
                        <div className="text-small text-ink-muted truncate">{friend.game}</div>
                      </div>
                      {friend.status === 'online' && (
                        <Button variant="ghost" size="sm">Convidar</Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabContent>

          <TabContent value="ranking">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Global', 'Semanal', 'Mensal'].map((period) => (
                <Card key={period} variant="muted">
                  <CardHeader>
                    <CardTitle>{period}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      {[
                        { rank: 1, name: 'ProPlayer', score: '2,847' },
                        { rank: 2, name: 'MinesweeperKing', score: '2,512' },
                        { rank: 3, name: 'FlagMaster', score: '2,398' },
                        { rank: 4, name: 'ClickFast', score: '2,105' },
                        { rank: 5, name: 'BoomAvoid', score: '1,987' },
                      ].map((entry) => (
                        <div key={entry.rank} className="flex items-center gap-3">
                          <Badge variant={entry.rank <= 3 ? 'accent' : 'primary'}>{entry.rank}</Badge>
                          <span className="font-heading font-bold text-ink flex-1 truncate">{entry.name}</span>
                          <span className="text-small text-ink-muted font-heading font-bold">{entry.score} pts</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabContent>
        </Tabs>

        {/* Quick Mode Selection */}
        <section className="mt-8">
          <h2 className="font-heading font-extra text-h4 text-ink mb-4">Ou escolha um modo para partida rápida</h2>
          <ModeGrid>
            {[
              { key: 'competitive', icon: '⚔️', title: 'Competitivo', desc: 'Mesmo tabuleiro, maior score vence' },
              { key: 'multi-board', icon: '🏁', title: 'Vários Tabuleiros', desc: 'Corrida - primeiro a limpar vence' },
              { key: 'cooperative', icon: '🤝', title: 'Cooperativo', desc: 'Time contra minas, erros compartilhados' },
              { key: 'battle-royale', icon: '👑', title: 'Battle Royale', desc: 'Eliminação, último sobrevivente vence' },
              { key: 'fog-of-war', icon: '🌫️', title: 'Fog of War', desc: 'Visão limitada, 1 erro = game over' },
            ].map((mode) => (
              <GameModeCard
                key={mode.key}
                icon={<span className="text-2xl">{mode.icon}</span>}
                title={mode.title}
                description={mode.desc}
                onClick={() => (window.location.href = `/lobby/criar-sala?mode=${mode.key}`)}
              />
            ))}
          </ModeGrid>
        </section>
      </main>
    </div>
  )
}