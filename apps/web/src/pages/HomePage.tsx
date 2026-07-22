import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { GameModeCard, ModeGrid } from '@/components/blocks/GameModeCard'
import { Mascote } from '@/components/game/Mascote'

const gameModes = [
  {
    key: 'competitive',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    title: 'Competitivo',
    description: 'Todos no mesmo tabuleiro. Quem revela mais, vence. Bandeiras dão pontos, minas tiram!',
  },
  {
    key: 'multi-board',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    title: 'Vários Tabuleiros',
    description: 'Cada jogador tem seu próprio tabuleiro. Corra para limpar o seu primeiro. Explodir congela você por 3s!',
  },
  {
    key: 'cooperative',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Cooperativo',
    description: 'Um tabuleiro, um time. Qualquer erro derruba todos. Dificuldade aumenta a cada fase. Use pings para coordenar!',
  },
  {
    key: 'battle-royale',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
        <path d="M12 22V12" />
        <path d="M12 2v10" />
      </svg>
    ),
    title: 'Battle Royale',
    description: 'Muitos jogadores, tabuleiros pequenos. Explodiu? Eliminado! Último sobrevivente vence. Tabuleiro encolhe a cada rodada.',
  },
  {
    key: 'fog-of-war',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 18v-2" />
        <path d="M12 22v-8" />
        <path d="M12 14v-4" />
      </svg>
    ),
    title: 'Fog of War',
    description: 'Visão limitada ao redor das suas revelações. Um erro = game over do time. Cooperativo puro, zero tolerância.',
  },
]

export function HomePage() {
  return (
    <div className="min-h-dvh flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-5 py-16">
        <div className="max-w-[900px] mx-auto text-center">
          {/* Mascote animado */}
          <Mascote state="happy" size={120} className="mx-auto mb-8" />

          <h1 className="font-heading font-extra text-[4rem] md:text-[5rem] lg:text-[6rem] text-primary-600 mb-4 tracking-tight">
            Minado<span className="text-accent-500">.gg</span>
          </h1>
          <p className="font-body text-lead text-ink-muted mb-10 max-w-2xl mx-auto">
            O clássico Campo Minado virou festa multiplayer. Jogue com a galera, mande reações, suba no ranking!
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/login">
              <Button variant="primary" size="lg" className="min-w-[200px]">
                Jogar Agora
              </Button>
            </Link>
            <Link to="/lobby">
              <Button variant="ghost" size="lg" className="min-w-[200px]">
                Ver Lobby
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-small text-ink-muted">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Sem cadastro para testar
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              Tempo real com Socket.IO
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-accent-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Ranking global e conquistas
            </span>
          </div>
        </div>
      </section>

      {/* Game Modes Grid */}
      <section className="py-16 px-5 bg-surface-muted" id="modos">
        <div className="max-w-[1200px] mx-auto">
          <header className="text-center mb-12">
            <h2 className="font-heading font-extra text-h2 text-ink mb-2">Escolha seu modo</h2>
            <p className="text-ink-muted text-lead">5 formas de jogar, do clássico ao caos total</p>
          </header>

          <ModeGrid>
            {gameModes.map((mode) => (
              <GameModeCard
                key={mode.key}
                icon={mode.icon}
                title={mode.title}
                description={mode.description}
                onClick={() => {
                  // Navigate to lobby with mode pre-selected or login
                  window.location.href = `/login?redirect=/lobby&mode=${mode.key}`
                }}
              />
            ))}
          </ModeGrid>
        </div>
      </section>

      {/* Features / How it works */}
      <section className="py-16 px-5 bg-surface" id="como-funciona">
        <div className="max-w-[1200px] mx-auto">
          <header className="text-center mb-12">
            <h2 className="font-heading font-extra text-h2 text-ink mb-2">Como funciona</h2>
            <p className="text-ink-muted text-lead">Simples, rápido e viciante</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8" />
                    <path d="M12 17v4" />
                  </svg>
                ),
                title: 'Entre na sala',
                description: 'Crie uma sala ou entre em uma pública. Convide amigos pelo link ou jogue com randoms.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
                    <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                    <path d="M12 22V12" />
                  </svg>
                ),
                title: 'Clique e marque',
                description: 'Clique esquerdo revela, direito marca bandeira. Flood-fill automático nas áreas vazias.',
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                ),
                title: 'Ganhe XP e suba',
                description: 'Pontos por revelar, bandeiras certas, flood-fills e vitórias. Perca pontos ao explodir. Suba de patente!',
              },
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-[22px] bg-surface-muted border border-border text-center">
                <div className="w-16 h-16 rounded-[14px] bg-primary-100 grid place-items-center mx-auto mb-4 text-primary-600">
                  {feature.icon}
                </div>
                <h3 className="font-heading font-bold text-h5 text-ink mb-2">{feature.title}</h3>
                <p className="text-ink-muted text-body">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 px-5 bg-primary-600">
        <div className="max-w-[600px] mx-auto text-center">
          <h2 className="font-heading font-extra text-h2 text-white mb-4">Pronto para o BOOM?</h2>
          <p className="text-primary-100 text-lead mb-8">Sua primeira partida começa em 30 segundos. Sem cadastro obrigatório para testar.</p>
          <Link to="/login">
            <Button variant="accent" size="lg" className="min-w-[220px]">
              Entrar no Jogo
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}