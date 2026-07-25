import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Tabs, TabList, TabTrigger, TabContent } from '@/components/ui/Tabs'
import { Navbar } from '@/components/blocks/Navbar'
import { useAuthStore } from '@/store/authStore'
import { apiFetch } from '@/lib/api'

interface RankingEntry {
  rank: number
  id: string
  username: string
  avatarUrl: string | null
  xp: number
  level: number
  stats: { victories: number; matchesPlayed: number } | null
}

export function RankingPage() {
  const authUser = useAuthStore((s) => s.user)
  const [data, setData] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<RankingEntry[]>('/users/ranking')
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [])

  const winRate = (entry: RankingEntry) =>
    entry.stats?.matchesPlayed
      ? Math.round((entry.stats.victories / entry.stats.matchesPlayed) * 100)
      : 0

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar username={authUser?.username} avatarUrl="" />

      <main className="flex-1 p-5 max-w-[1000px] mx-auto w-full">
        <div className="mb-8">
          <h1 className="font-heading font-extra text-h2 text-ink mb-2">Ranking</h1>
          <p className="text-ink-muted">Veja quem são os melhores desarmadores de bombas</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="font-heading font-bold text-h5 text-ink-muted">Carregando ranking...</p>
          </div>
        ) : (
          <Tabs defaultValue="global">
            <TabList className="mb-6">
              <TabTrigger value="global">Global</TabTrigger>
            </TabList>

            <TabContent value="global">
              {data.length === 0 ? (
                <div className="text-center py-12">
                  <p className="font-heading font-bold text-h5 text-ink-muted">Nenhum jogador ainda</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" role="table">
                    <thead>
                      <tr className="bg-surface-muted border-b border-border">
                        <th className="text-left p-3 font-heading font-bold text-small text-ink-muted">Pos</th>
                        <th className="text-left p-3 font-heading font-bold text-small text-ink-muted">Jogador</th>
                        <th className="text-right p-3 font-heading font-bold text-small text-ink-muted">XP</th>
                        <th className="text-right p-3 font-heading font-bold text-small text-ink-muted">Nível</th>
                        <th className="text-right p-3 font-heading font-bold text-small text-ink-muted">Vitórias</th>
                        <th className="text-right p-3 font-heading font-bold text-small text-ink-muted">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((entry) => (
                        <tr
                          key={entry.id}
                          className={`border-b border-border/50 transition-colors ${
                            entry.id === authUser?.id ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-surface-muted'
                          }`}
                        >
                          <td className="p-3 font-heading font-bold text-h6">
                            <span className={`inline-flex w-8 h-8 items-center justify-center rounded-full ${
                              entry.rank === 1 ? 'bg-accent-100 text-accent-700' :
                              entry.rank === 2 ? 'bg-secondary-100 text-secondary-700' :
                              entry.rank === 3 ? 'bg-primary-100 text-primary-700' :
                              'bg-surface-muted text-ink-muted'
                            }`}>
                              {entry.rank}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <Avatar size="sm" initials={entry.username.slice(0, 2).toUpperCase()} />
                              <span className="font-heading font-bold text-ink">{entry.username}</span>
                              {entry.id === authUser?.id && (
                                <Badge variant="primary" size="sm">VOCÊ</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right font-heading font-bold text-h6 text-ink">{entry.xp.toLocaleString()}</td>
                          <td className="p-3 text-right font-heading font-medium text-ink">{entry.level}</td>
                          <td className="p-3 text-right font-heading font-medium text-ink">{entry.stats?.victories || 0}</td>
                          <td className="p-3 text-right font-heading font-medium text-success">{winRate(entry)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabContent>
          </Tabs>
        )}

        <div className="mt-8 p-5 rounded-[14px] bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 text-center">
          <p className="text-ink-muted text-body">
            Rankings atualizam em tempo real. Jogue partidas para subir de posição!
          </p>
          <Link to="/lobby" className="mt-3 inline-block">
            <Button variant="primary">Ir para o Lobby</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
