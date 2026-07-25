import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Tabs, TabList, TabTrigger, TabContent } from '@/components/ui/Tabs'
import { Navbar } from '@/components/blocks/Navbar'
import { ProfileCard } from '@/components/blocks/ProfileCard'

interface ProfileData {
  username: string
  avatarUrl: string | null
  xp: number
  level: number
  stats: {
    victories: number
    defeats: number
    matchesPlayed: number
    currentStreak: number
    maxStreak: number
    rank: number
  } | null
  achievements: Array<{
    id: string
    title: string
    description: string
    condition: string
    unlockedAt: string
  }>
  createdAt: string
}

export function ProfilePage() {
  const { username: routeUsername } = useParams<{ username: string }>()
  const authUser = useAuthStore((s) => s.user)
  const effectiveUsername = routeUsername || authUser?.username || ''
  const isOwnProfile = routeUsername === undefined || routeUsername === authUser?.username

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!effectiveUsername) {
      setLoading(false)
      return
    }
    setLoading(true)
    apiFetch<ProfileData>(`/users/${encodeURIComponent(effectiveUsername)}`)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [effectiveUsername])

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar username={authUser?.username} avatarUrl="" />
        <main className="flex-1 flex items-center justify-center p-5">
          <p className="font-heading font-bold text-h5 text-ink-muted">Carregando...</p>
        </main>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar username={authUser?.username} avatarUrl="" />
        <main className="flex-1 flex items-center justify-center p-5">
          <div className="text-center">
            <p className="font-heading font-bold text-h5 text-ink-muted mb-4">Usuário não encontrado</p>
            <Link to="/lobby"><Button variant="primary">Voltar ao Lobby</Button></Link>
          </div>
        </main>
      </div>
    )
  }

  const achievementIcon: Record<string, string> = {
    first_win: '🏆',
    streak_10: '🔥',
    streak_50: '👑',
    flags_10k: '🚩',
    speed_run: '⚡',
    no_mistakes: '💎',
    br_winner: '👑',
    fog_master: '🌫️',
  }

  const xpToNext = (profile.level + 1) * 1000
  const winRate = profile.stats?.matchesPlayed
    ? Math.round((profile.stats.victories / profile.stats.matchesPlayed) * 100)
    : 0

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar username={authUser?.username} avatarUrl="" />

      <main className="flex-1 p-5 max-w-[1000px] mx-auto w-full">
        {/* Profile Header */}
        <ProfileCard
          username={profile.username}
          wins={profile.stats?.victories || 0}
          streak={profile.stats?.currentStreak || 0}
          rank={'Nível ' + profile.level}
          isOnline={true}
        />

        {/* Level/XP Bar */}
        <Card className="my-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Badge variant="accent">Nível {profile.level}</Badge>
                <span className="font-heading font-bold text-h6 text-ink">{profile.xp.toLocaleString()} / {xpToNext.toLocaleString()} XP</span>
              </div>
              <span className="text-small text-ink-muted">{Math.round((profile.xp / xpToNext) * 100)}% para o próximo nível</span>
            </div>
            <div className="h-3 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-500 transition-all duration-500 ease-bounce"
                style={{ width: `${(profile.xp / xpToNext) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Partidas" value={profile.stats?.matchesPlayed || 0} icon="🎮" />
          <StatCard label="Taxa de Vitória" value={`${winRate}%`} icon="🏆" />
          <StatCard label="Melhor Tempo" value={'—'} icon="⏱️" />
          <StatCard label="Bandeiras" value={'—'} icon="🚩" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="conquistas">
          <TabList className="mb-6">
            <TabTrigger value="conquistas">Conquistas ({profile.achievements.filter(a => a.unlockedAt).length}/{profile.achievements.length})</TabTrigger>
            <TabTrigger value="historico">Histórico</TabTrigger>
            <TabTrigger value="estatisticas">Estatísticas</TabTrigger>
          </TabList>

          <TabContent value="conquistas">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.achievements.map((ach) => (
                <Card key={ach.id} variant={ach.unlockedAt ? 'default' : 'muted'} className={ach.unlockedAt ? '' : 'opacity-60'}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="text-4xl">{achievementIcon[ach.id] || '🏆'}</div>
                    <div className="flex-1">
                      <div className="font-heading font-bold text-ink">{ach.title}</div>
                      <div className="text-small text-ink-muted">{ach.description}</div>
                      {ach.unlockedAt && (
                        <div className="text-xs text-success mt-1">Desbloqueada em {formatDate(ach.unlockedAt)}</div>
                      )}
                    </div>
                    {ach.unlockedAt ? (
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
            <div className="text-center py-12">
              <p className="font-heading font-bold text-h5 text-ink-muted">Histórico de partidas em breve</p>
            </div>
          </TabContent>

          <TabContent value="estatisticas">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Geral</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <StatRow label="Partidas Jogadas" value={profile.stats?.matchesPlayed || 0} />
                  <StatRow label="Vitórias" value={profile.stats?.victories || 0} />
                  <StatRow label="Derrotas" value={profile.stats?.defeats || 0} />
                  <StatRow label="Taxa de Vitória" value={`${winRate}%`} />
                  <StatRow label="Sequência Atual" value={profile.stats?.currentStreak || 0} />
                  <StatRow label="Maior Sequência" value={profile.stats?.maxStreak || 0} />
                  <StatRow label="Membro desde" value={formatDate(profile.createdAt)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Jogo</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <StatRow label="Bandeiras Colocadas" value={'—'} />
                  <StatRow label="Melhor Tempo (Médio)" value={'—'} />
                  <StatRow label="XP Total" value={profile.xp.toLocaleString()} />
                  <StatRow label="Nível Atual" value={profile.level} />
                  <StatRow label="Patente" value={'Nível ' + profile.level} />
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