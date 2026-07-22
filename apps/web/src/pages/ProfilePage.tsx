import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Tabs, TabList, TabTrigger, TabContent } from '@/components/ui/Tabs'
import { Navbar } from '@/components/blocks/Navbar'
import { ProfileCard } from '@/components/blocks/ProfileCard'

const mockProfile = {
  username: 'Pablo',
  avatarUrl: '',
  wins: 312,
  streak: 48,
  maxStreak: 52,
  rank: 'Ouro III',
  level: 27,
  xp: 18450,
  xpToNext: 20000,
  matchesPlayed: 487,
  winRate: 64,
  bestTime: '2:34',
  flagsPlaced: 12450,
  joinedAt: '2024-01-15',
  achievements: [
    { id: 'first_win', title: 'Primeira Vitória', desc: 'Ganhe sua primeira partida', icon: '🏆', unlocked: true, date: '2024-01-16' },
    { id: 'streak_10', title: 'Em Chamas', desc: 'Vença 10 partidas seguidas', icon: '🔥', unlocked: true, date: '2024-02-10' },
    { id: 'streak_50', title: 'Lenda Viva', desc: 'Vença 50 partidas seguidas', icon: '👑', unlocked: true, date: '2024-03-22' },
    { id: 'flags_10k', title: 'Marcador Expert', desc: 'Marque 10.000 bombas corretamente', icon: '🚩', unlocked: true, date: '2024-05-15' },
    { id: 'speed_run', title: 'Speedrunner', desc: 'Termine um tabuleiro médio em menos de 3 min', icon: '⚡', unlocked: false },
    { id: 'no_mistakes', title: 'Perfeccionista', desc: 'Ganhe sem errar nenhuma bandeira', icon: '💎', unlocked: false },
    { id: 'br_winner', title: 'Último Sobrevivente', desc: 'Vença um Battle Royale', icon: '👑', unlocked: false },
    { id: 'fog_master', title: 'Mestre da Névoa', desc: 'Complete um Fog of War sem erros', icon: '🌫️', unlocked: false },
  ],
  recentMatches: [
    { id: '1', mode: 'competitive', result: 'win', score: 1250, date: '2024-06-15T14:30:00Z', duration: '12:34' },
    { id: '2', mode: 'battle-royale', result: 'loss', score: -150, date: '2024-06-15T13:45:00Z', duration: '8:22' },
    { id: '3', mode: 'cooperative', result: 'win', score: 890, date: '2024-06-14T20:10:00Z', duration: '15:40' },
    { id: '4', mode: 'multi-board', result: 'win', score: 2100, date: '2024-06-14T19:30:00Z', duration: '9:15' },
    { id: '5', mode: 'fog-of-war', result: 'loss', score: -50, date: '2024-06-13T16:20:00Z', duration: '5:30' },
  ],
}

const modeLabels: Record<string, string> = {
  competitive: 'Competitivo',
  'multi-board': 'Vários Tabuleiros',
  cooperative: 'Cooperativo',
  'battle-royale': 'Battle Royale',
  'fog-of-war': 'Fog of War',
}

const modeColors: Record<string, 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger'> = {
  competitive: 'primary',
  'multi-board': 'secondary',
  cooperative: 'success',
  'battle-royale': 'danger',
  'fog-of-war': 'warning',
}

export function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const isOwnProfile = username === 'Pablo'

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar username="Jogador" avatarUrl="" />

      <main className="flex-1 p-5 max-w-[1000px] mx-auto w-full">
        {/* Profile Header */}
        <ProfileCard
          username={mockProfile.username}
          wins={mockProfile.wins}
          streak={mockProfile.streak}
          rank={mockProfile.rank}
          isOnline={true}
        />

        {/* Level/XP Bar */}
        <Card className="my-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Badge variant="accent">Nível {mockProfile.level}</Badge>
                <span className="font-heading font-bold text-h6 text-ink">{mockProfile.xp.toLocaleString()} / {mockProfile.xpToNext.toLocaleString()} XP</span>
              </div>
              <span className="text-small text-ink-muted">{Math.round((mockProfile.xp / mockProfile.xpToNext) * 100)}% para o próximo nível</span>
            </div>
            <div className="h-3 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-500 transition-all duration-500 ease-bounce"
                style={{ width: `${(mockProfile.xp / mockProfile.xpToNext) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Partidas" value={mockProfile.matchesPlayed} icon="🎮" />
          <StatCard label="Taxa de Vitória" value={`${mockProfile.winRate}%`} icon="🏆" />
          <StatCard label="Melhor Tempo" value={mockProfile.bestTime} icon="⏱️" />
          <StatCard label="Bandeiras" value={mockProfile.flagsPlaced.toLocaleString()} icon="🚩" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="conquistas">
          <TabList className="mb-6">
            <TabTrigger value="conquistas">Conquistas ({mockProfile.achievements.filter(a => a.unlocked).length}/{mockProfile.achievements.length})</TabTrigger>
            <TabTrigger value="historico">Histórico</TabTrigger>
            <TabTrigger value="estatisticas">Estatísticas</TabTrigger>
          </TabList>

          <TabContent value="conquistas">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mockProfile.achievements.map((ach) => (
                <Card key={ach.id} variant={ach.unlocked ? 'default' : 'muted'} className={ach.unlocked ? '' : 'opacity-60'}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="text-4xl">{ach.icon}</div>
                    <div className="flex-1">
                      <div className="font-heading font-bold text-ink">{ach.title}</div>
                      <div className="text-small text-ink-muted">{ach.desc}</div>
                      {ach.unlocked && (
                        <div className="text-xs text-success mt-1">Desbloqueada em {formatDate(ach.date)}</div>
                      )}
                    </div>
                    {ach.unlocked ? (
                      <Badge variant="success">Desbloqueada</Badge>
                    ) : (
                      <Badge variant="warning">Bloqueada</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabContent>

          <TabContent value="historico">
            <div className="space-y-3">
              {mockProfile.recentMatches.map((match) => (
                <Card key={match.id} variant="muted">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={modeColors[match.mode]}>{modeLabels[match.mode]}</Badge>
                        <span className="text-small text-ink-muted">{formatDate(match.date)}</span>
                        <span className="text-small text-ink-muted">·</span>
                        <span className="text-small text-ink-muted">{match.duration}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={match.result === 'win' ? 'success' : 'danger'}>
                          {match.result === 'win' ? 'Vitória' : 'Derrota'}
                        </Badge>
                        <span className={`font-heading font-bold text-h6 ${match.result === 'win' ? 'text-success' : 'text-error'}`}>
                          {match.score >= 0 ? '+' : ''}{match.score}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabContent>

          <TabContent value="estatisticas">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Geral</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <StatRow label="Partidas Jogadas" value={mockProfile.matchesPlayed} />
                  <StatRow label="Vitórias" value={mockProfile.wins} />
                  <StatRow label="Derrotas" value={mockProfile.matchesPlayed - mockProfile.wins} />
                  <StatRow label="Taxa de Vitória" value={`${mockProfile.winRate}%`} />
                  <StatRow label="Sequência Atual" value={mockProfile.streak} />
                  <StatRow label="Maior Sequência" value={mockProfile.maxStreak} />
                  <StatRow label="Membro desde" value={formatDate(mockProfile.joinedAt)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Jogo</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <StatRow label="Bandeiras Colocadas" value={mockProfile.flagsPlaced.toLocaleString()} />
                  <StatRow label="Melhor Tempo (Médio)" value={mockProfile.bestTime} />
                  <StatRow label="XP Total" value={mockProfile.xp.toLocaleString()} />
                  <StatRow label="Nível Atual" value={mockProfile.level} />
                  <StatRow label="Patente" value={mockProfile.rank} />
                </CardContent>
              </Card>
            </div>
          </TabContent>
        </Tabs>

        {isOwnProfile && (
          <div className="mt-8 text-center">
            <Link to="/perfil/editar">
              <Button variant="primary" size="lg">Editar Perfil</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <div className="text-3xl mb-2">{icon}</div>
        <div className="font-heading font-bold text-h5 text-ink">{value}</div>
        <div className="text-small text-ink-muted">{label}</div>
      </CardContent>
    </Card>
  )
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
      <span className="text-ink-muted">{label}</span>
      <span className="font-heading font-bold text-ink">{value}</span>
    </div>
  )
}

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}