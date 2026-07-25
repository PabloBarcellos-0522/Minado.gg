import { useParams, useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Banner } from '@/components/game/Banner'
import { FxConfetti } from '@/components/game/FxConfetti'
import { Navbar } from '@/components/blocks/Navbar'
import { MatchCard } from '@/components/blocks/MatchCard'
import { useGameStore } from '@/store/gameStore'
import type { GameMode } from '@minado/shared'

const modeLabels: Record<GameMode, string> = {
  competitive: 'Competitivo',
  'multi-board': 'Vários Tabuleiros',
  cooperative: 'Cooperativo',
  'battle-royale': 'Battle Royale',
  'fog-of-war': 'Fog of War',
}

export function ResultPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const result = useGameStore((s) => s.lastMatchResult)

  if (!result) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-5">
          <div className="text-center">
            <p className="font-heading font-bold text-h5 text-ink-muted mb-4">Nenhum resultado disponível</p>
            <Button variant="primary" onClick={() => navigate('/lobby')}>
              Voltar ao Lobby
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const isWinner = result.winner === result.scoreboard.find((p) => p.isYou)?.playerId
  const myEntry = result.scoreboard.find((p) => p.isYou)
  const showConfetti = isWinner

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const handleRematch = () => {
    navigate(`/sala/${id}`)
  }

  const handleBackToLobby = () => {
    navigate('/lobby')
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar username={myEntry?.username} avatarUrl={myEntry?.avatarUrl} />

      <main className="flex-1 flex items-center justify-center p-5">
        <div className="w-full max-w-3xl">
          <div className="mb-6">
            <Banner
              type={isWinner ? 'win' : 'lose'}
              title={isWinner ? 'VITÓRIA!' : 'BOMBARDEADO!'}
              subtitle={
                isWinner
                  ? 'Você desarmou tudo com estilo. Lenda!'
                  : 'Relaxa, foi só um BOOM de sorte. Bora de novo?'
              }
              emoji={isWinner ? '🎉' : '💣'}
            >
              {showConfetti && <FxConfetti active={true} />}
            </Banner>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Partida Finalizada</CardTitle>
                <Badge variant={modeLabels[result.mode] === 'Competitivo' ? 'primary' : 'secondary'}>
                  {modeLabels[result.mode]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-[14px] bg-surface-muted">
                  <div className="font-heading font-bold text-h5 text-ink">{formatTime(result.startedAt)}</div>
                  <div className="text-small text-ink-muted">Início</div>
                </div>
                <div className="p-3 rounded-[14px] bg-surface-muted">
                  <div className="font-heading font-bold text-h5 text-ink">{formatTime(result.endedAt)}</div>
                  <div className="text-small text-ink-muted">Fim</div>
                </div>
                <div className="p-3 rounded-[14px] bg-surface-muted">
                  <div className="font-heading font-bold text-h5 text-ink">
                    {Math.floor((new Date(result.endedAt).getTime() - new Date(result.startedAt).getTime()) / 60000)}min
                  </div>
                  <div className="text-small text-ink-muted">Duração</div>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-[14px] bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 text-center">
                <span className="font-heading font-bold text-h5 text-primary-600 dark:text-primary-400">Sala: {id}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>🏆 Placar Final</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full" role="table">
                  <thead>
                    <tr className="bg-surface-muted border-b border-border">
                      <th className="text-left p-3 font-heading font-bold text-small text-ink-muted">Pos</th>
                      <th className="text-left p-3 font-heading font-bold text-small text-ink-muted">Jogador</th>
                      <th className="text-right p-3 font-heading font-bold text-small text-ink-muted">Score</th>
                      <th className="text-right p-3 font-heading font-bold text-small text-ink-muted">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.scoreboard.map((entry) => (
                      <tr
                        key={entry.playerId}
                        className={`border-b border-border/50 transition-colors ${
                          entry.isYou ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-surface-muted'
                        }`}
                      >
                        <td className="p-3 font-heading font-bold text-h6">
                          <span className={`inline-flex w-8 h-8 items-center justify-center rounded-full ${
                            entry.rank === 1 ? 'bg-accent-100 text-accent-700' :
                            entry.rank === 2 ? 'bg-secondary-100 text-secondary-700' :
                            entry.rank === 3 ? 'bg-primary-100 text-primary-700' :
                            'bg-surface-muted text-ink-muted'
                          }`}>
                            {getRankBadge(entry.rank)}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar
                              size="sm"
                              src={entry.avatarUrl}
                              initials={entry.username.slice(0, 2).toUpperCase()}
                            />
                            <div>
                              <span className="font-heading font-bold text-ink">{entry.username}</span>
                              {entry.isYou && (
                                <span className="ml-2 text-[0.7rem] font-heading font-bold text-primary-600 px-1.5 py-0.5 rounded-full bg-primary-100">
                                  VOCÊ
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right font-heading font-bold text-h6 text-ink">
                          {entry.score >= 0 ? '+' : ''}{entry.score}
                        </td>
                        <td className="p-3 text-right text-small text-ink-muted">
                          {entry.playerId === result.winner && <span className="text-success font-bold">🏆 Venceu</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>📜 Histórico de Jogadas</CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-64 overflow-auto">
              <div className="divide-y divide-border">
                {result.actions.map((action, i) => {
                  const player = result.scoreboard.find((p) => p.playerId === action.playerId)
                  const actionLabels: Record<string, { label: string; color: string }> = {
                    reveal: { label: 'Revelou casa', color: 'text-primary-600' },
                    'flood-fill': { label: 'Flood fill!', color: 'text-success' },
                    'flag-correct': { label: 'Marcou bomba ✓', color: 'text-success' },
                    'flag-wrong': { label: 'Marcou errado ✗', color: 'text-error' },
                    explode: { label: 'EXPLODIU! 💣', color: 'text-error' },
                    win: { label: 'VITÓRIA! 🏆', color: 'text-accent-600' },
                  }
                  const info = actionLabels[action.type] || { label: action.type, color: 'text-ink' }
                  return (
                    <div key={i} className="p-3 flex items-center justify-between hover:bg-surface-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar size="sm" initials={player?.username[0] || '?'} />
                        <div>
                          <div className="font-heading font-medium text-small text-ink">{player?.username}</div>
                          <div className={`text-[0.7rem] ${info.color} font-heading font-bold`}>{info.label}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-heading font-bold text-h6 ${action.points >= 0 ? 'text-success' : 'text-error'}`}>
                          {action.points >= 0 ? '+' : ''}{action.points}
                        </div>
                        <div className="text-[0.7rem] text-ink-muted">{action.timestamp}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="pt-0">
              <MatchCard
                team1={result.scoreboard.slice(0, 2).map((p) => p.username.slice(0, 2).toUpperCase())}
                team2={result.scoreboard.slice(2, 4).map((p) => p.username.slice(0, 2).toUpperCase())}
                status="Finalizada"
                progress={100}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="primary" size="lg" className="flex-1" onClick={handleRematch}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Revanche
            </Button>
            <Button variant="secondary" size="lg" className="flex-1" onClick={handleBackToLobby}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Voltar ao Lobby
            </Button>
            <Link to="/ranking">
              <Button variant="ghost" size="lg" className="flex-1">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Ver Ranking
              </Button>
            </Link>
          </div>

          <div className="mt-6 p-4 rounded-[14px] bg-surface-muted border border-border text-center">
            <p className="text-small text-ink-muted mb-2">Quiser compartilhar o resultado?</p>
            <div className="flex gap-2 justify-center">
              <button className="px-4 py-2 rounded-[14px] bg-surface border border-border text-small font-heading font-bold text-ink hover:bg-surface-muted transition-colors">
                Copiar Link
              </button>
              <button className="px-4 py-2 rounded-[14px] bg-surface border border-border text-small font-heading font-bold text-ink hover:bg-surface-muted transition-colors">
                Compartilhar
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
