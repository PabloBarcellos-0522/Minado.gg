import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Tabs, TabList, TabTrigger, TabContent } from '@/components/ui/Tabs'
import { Navbar } from '@/components/blocks/Navbar'

const rankings = {
  global: [
    { rank: 1, username: 'ProPlayer', avatar: '', score: 2847, wins: 156, winRate: 78 },
    { rank: 2, username: 'MinesweeperKing', avatar: '', score: 2512, wins: 134, winRate: 72 },
    { rank: 3, username: 'FlagMaster', avatar: '', score: 2398, wins: 128, winRate: 75 },
    { rank: 4, username: 'ClickFast', avatar: '', score: 2105, wins: 112, winRate: 68 },
    { rank: 5, username: 'BoomAvoid', avatar: '', score: 1987, wins: 98, winRate: 65 },
    { rank: 6, username: 'Pablo', avatar: '', score: 1856, wins: 95, winRate: 70 },
    { rank: 7, username: 'AnaSilva', avatar: '', score: 1743, wins: 89, winRate: 67 },
    { rank: 8, username: 'CarlosM', avatar: '', score: 1621, wins: 82, winRate: 63 },
    { rank: 9, username: 'BeatrizL', avatar: '', score: 1509, wins: 76, winRate: 61 },
    { rank: 10, username: 'ZéMinas', avatar: '', score: 1402, wins: 71, winRate: 59 },
  ],
  weekly: [
    { rank: 1, username: 'SpeedRunner', avatar: '', score: 1250, wins: 45, winRate: 82 },
    { rank: 2, username: 'FlagPro', avatar: '', score: 980, wins: 38, winRate: 76 },
    { rank: 3, username: 'NoMistakes', avatar: '', score: 875, wins: 32, winRate: 79 },
    { rank: 4, username: 'Pablo', avatar: '', score: 720, wins: 28, winRate: 71 },
    { rank: 5, username: 'MineHunter', avatar: '', score: 650, wins: 25, winRate: 68 },
    { rank: 6, username: 'SafeClick', avatar: '', score: 590, wins: 22, winRate: 65 },
    { rank: 7, username: 'LuckyGuess', avatar: '', score: 520, wins: 19, winRate: 60 },
    { rank: 8, username: 'BoomMaster', avatar: '', score: 480, wins: 18, winRate: 55 },
  ],
  monthly: [
    { rank: 1, username: 'MonthlyChamp', avatar: '', score: 5420, wins: 234, winRate: 78 },
    { rank: 2, username: 'ConsistentKing', avatar: '', score: 4890, wins: 210, winRate: 74 },
    { rank: 3, username: 'Pablo', avatar: '', score: 4210, wins: 189, winRate: 72 },
    { rank: 4, username: 'SteadyEddie', avatar: '', score: 3780, wins: 165, winRate: 69 },
    { rank: 5, username: 'RankGrinder', avatar: '', score: 3340, wins: 145, winRate: 66 },
    { rank: 6, username: 'WeekendWarrior', avatar: '', score: 2980, wins: 128, winRate: 63 },
    { rank: 7, username: 'CasualPro', avatar: '', score: 2560, wins: 110, winRate: 61 },
    { rank: 8, username: 'NewbieLegend', avatar: '', score: 2100, wins: 95, winRate: 58 },
  ],
}

export function RankingPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar username="Jogador" avatarUrl="" />

      <main className="flex-1 p-5 max-w-[1000px] mx-auto w-full">
        <div className="mb-8">
          <h1 className="font-heading font-extra text-h2 text-ink mb-2">Ranking</h1>
          <p className="text-ink-muted">Veja quem são os melhores desarmadores de bombas</p>
        </div>

        <Tabs defaultValue="global">
          <TabList className="mb-6">
            <TabTrigger value="global">Global</TabTrigger>
            <TabTrigger value="weekly">Semanal</TabTrigger>
            <TabTrigger value="monthly">Mensal</TabTrigger>
          </TabList>

          <TabContent value="global">
            <RankingTable data={rankings.global} />
          </TabContent>
          <TabContent value="weekly">
            <RankingTable data={rankings.weekly} />
          </TabContent>
          <TabContent value="monthly">
            <RankingTable data={rankings.monthly} />
          </TabContent>
        </Tabs>

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

function RankingTable({ data }: { data: typeof rankings.global }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" role="table">
        <thead>
          <tr className="bg-surface-muted border-b border-border">
            <th className="text-left p-3 font-heading font-bold text-small text-ink-muted">Pos</th>
            <th className="text-left p-3 font-heading font-bold text-small text-ink-muted">Jogador</th>
            <th className="text-right p-3 font-heading font-bold text-small text-ink-muted">Pontos</th>
            <th className="text-right p-3 font-heading font-bold text-small text-ink-muted">Vitórias</th>
            <th className="text-right p-3 font-heading font-bold text-small text-ink-muted">Win Rate</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr key={entry.rank} className="border-b border-border/50 hover:bg-surface-muted transition-colors">
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
                  {entry.username === 'Pablo' && (
                    <Badge variant="primary" size="sm">VOCÊ</Badge>
                  )}
                </div>
              </td>
              <td className="p-3 text-right font-heading font-bold text-h6 text-ink">{entry.score.toLocaleString()}</td>
              <td className="p-3 text-right font-heading font-medium text-ink">{entry.wins}</td>
              <td className="p-3 text-right font-heading font-medium text-success">{entry.winRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}