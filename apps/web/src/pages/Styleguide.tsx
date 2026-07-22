import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '@/components/useTheme'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { Tabs, TabList, TabTrigger, TabContent } from '@/components/ui/Tabs'
import { Navbar } from '@/components/blocks/Navbar'
import { PlayerRoster } from '@/components/blocks/PlayerRoster'
import { ChatPanel } from '@/components/blocks/ChatPanel'
import { ModeGrid, GameModeCard } from '@/components/blocks/GameModeCard'
import { RoomCard } from '@/components/blocks/RoomCard'
import { Leaderboard } from '@/components/blocks/Leaderboard'
import { ProfileCard } from '@/components/blocks/ProfileCard'
import { MatchCard } from '@/components/blocks/MatchCard'

import { Mascote } from '@/components/game/Mascote'
import { Banner } from '@/components/game/Banner'
import { PingRow } from '@/components/game/PingRow'
import { FxBoom } from '@/components/game/FxBoom'
import { FxConfetti } from '@/components/game/FxConfetti'
import type { Player } from '@minado/shared'

const samplePlayers: Player[] = [
  { id: '1', username: 'Pablo', score: 1250, isReady: true, isHost: true },
  { id: '2', username: 'Ana', score: 980, isReady: true, isHost: false },
  { id: '3', username: 'Carlos', score: 720, isReady: false, isHost: false },
]

const sampleMessages = [
  { id: '1', from: 'Pablo', text: 'Bora jogar!', ts: '14:32' },
  { id: '2', from: 'Ana', text: 'Vou abrir o canto superior', ts: '14:33' },
  { id: '3', from: 'system', text: 'Carlos entrou na sala', ts: '14:34', isSystem: true },
  { id: '4', from: 'Carlos', text: 'Ei, tem mina ali embaixo!', ts: '14:35' },
]

const demoBoardCells = [
  { classes: 'board-cell--revealed board-cell--number-1', content: '1' },
  { classes: 'board-cell--revealed board-cell--number-2', content: '2' },
  { classes: 'board-cell--revealed board-cell--safe', content: '✓' },
  { classes: 'board-cell--flagged', content: '⚑' },
  { classes: '', content: '?' },
  { classes: 'board-cell--revealed board-cell--number-3', content: '3' },
  { classes: 'board-cell--revealed board-cell--safe', content: '✓' },
  { classes: '', content: '?' },

  { classes: 'board-cell--revealed board-cell--number-4', content: '4' },
  { classes: '', content: '?' },
  { classes: 'board-cell--revealed board-cell--number-5', content: '5' },
  { classes: 'board-cell--revealed board-cell--safe', content: '✓' },
  { classes: 'board-cell--flagged', content: '⚑' },
  { classes: '', content: '?' },
  { classes: 'board-cell--revealed board-cell--number-6', content: '6' },
  { classes: '', content: '?' },

  { classes: '', content: '?' },
  { classes: 'board-cell--revealed board-cell--number-7', content: '7' },
  { classes: '', content: '?' },
  { classes: 'board-cell--revealed board-cell--mine board-cell--revealed', content: '💣' },
  { classes: 'board-cell--revealed board-cell--number-8', content: '8' },
  { classes: '', content: '?' },
  { classes: 'board-cell--revealed board-cell--safe', content: '✓' },

  { classes: '', content: '?' },
  { classes: 'board-cell--revealed board-cell--number-1', content: '1' },
  { classes: '', content: '?' },
  { classes: 'board-cell--flagged', content: '⚑' },
  { classes: 'board-cell--revealed board-cell--safe', content: '✓' },
  { classes: '', content: '?' },
  { classes: 'board-cell--revealed board-cell--number-2', content: '2' },
  { classes: '', content: '?' },
  { classes: 'board-cell--revealed board-cell--number-3', content: '3' },
  { classes: '', content: '?' },

  { classes: '', content: '?' },
  { classes: 'board-cell--revealed board-cell--safe', content: '✓' },
  { classes: 'board-cell--revealed board-cell--number-4', content: '4' },
  { classes: '', content: '?' },
  { classes: 'board-cell--revealed board-cell--number-5', content: '5' },
  { classes: '', content: '?' },
  { classes: 'board-cell--revealed board-cell--number-6', content: '6' },
  { classes: '', content: '?' },

  { classes: '', content: '?' },
  { classes: 'board-cell--flagged', content: '⚑' },
  { classes: 'board-cell--revealed board-cell--number-1', content: '1' },
  { classes: '', content: '?' },
  { classes: 'board-cell--revealed board-cell--number-2', content: '2' },
  { classes: '', content: '?' },
  { classes: 'board-cell--revealed board-cell--number-3', content: '3' },
  { classes: '', content: '?' },

  { classes: '', content: '?' },
  { classes: 'board-cell--revealed board-cell--safe', content: '✓' },
  { classes: 'board-cell--revealed board-cell--number-4', content: '4' },
  { classes: '', content: '?' },
  { classes: 'board-cell--revealed board-cell--number-5', content: '5' },
  { classes: '', content: '?' },
  { classes: 'board-cell--revealed board-cell--number-6', content: '6' },
  { classes: '', content: '?' },
]

export function Styleguide() {
  const { theme, toggleTheme } = useTheme()
  const [modalOpen, setModalOpen] = useState(false)
  const [boomActive, setBoomActive] = useState(false)
  const [confettiActive, setConfettiActive] = useState(false)
  const [shakeActive, setShakeActive] = useState(false)
  const [activeSection, setActiveSection] = useState('colors')
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Scrollspy for sidebar active section
  useEffect(() => {
    const sections = ['colors', 'type', 'tokens', 'components', 'composed', 'game', 'motion']

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-100px 0px -60% 0px',
        threshold: 0.1,
      }
    )

    sections.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observerRef.current?.observe(el)
    })

    return () => observerRef.current?.disconnect()
  }, [])

  // Memoized handlers to prevent stale closures in effects
  const handleBoomStart = useCallback(() => setBoomActive(true), [setBoomActive])
  const handleBoomStop = useCallback(() => setBoomActive(false), [setBoomActive])
  const handleConfettiStart = useCallback(() => setConfettiActive(true), [setConfettiActive])
  const handleConfettiStop = useCallback(() => setConfettiActive(false), [setConfettiActive])
  const handleModalOpen = useCallback(() => setModalOpen(true), [setModalOpen])
  const handleModalClose = useCallback(() => setModalOpen(false), [setModalOpen])
  const handleBoomMotion = useCallback(() => setBoomActive(true), [setBoomActive])
  const handleConfettiMotion = useCallback(() => setConfettiActive(true), [setConfettiActive])
  const handleShake = useCallback(() => {
    setShakeActive(true)
    setTimeout(() => setShakeActive(false), 500)
  }, [setShakeActive])

  return (
    <div className="min-h-dvh bg-bg">
      <Navbar />

      <div className="flex items-start gap-6 max-w-[1200px] mx-auto px-5 pt-8 pb-24">
        {/* Sidebar */}
        <aside className="sticky top-[80px] shrink-0 w-[230px] self-start max-lg:hidden">
          <nav className="flex flex-col gap-1 bg-surface border border-border rounded-[22px] p-3 shadow-sm">
            {['colors', 'type', 'tokens', 'components', 'composed', 'game', 'motion'].map((id) => (
              <a
                key={id}
                href={`#${id}`}
                className={`font-heading font-bold text-small px-3 py-2 rounded-[14px] no-underline transition-all duration-base ${
                  activeSection === id
                    ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30'
                    : 'text-ink-muted hover:bg-surface-muted hover:text-primary-600'
                }`}
              >
                {id === 'colors' && 'Cores'}
                {id === 'type' && 'Tipografia'}
                {id === 'tokens' && 'Espaçamento & Raio'}
                {id === 'components' && 'Componentes'}
                {id === 'composed' && 'Blocos Compostos'}
                {id === 'game' && 'Jogo'}
                {id === 'motion' && 'Animações'}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Header bar */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-heading font-extra text-h3 text-ink">Design System</h1>
              <p className="text-ink-muted">Tokens, componentes e padrões visuais do Minado.gg</p>
            </div>
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {theme === 'light' ? '🌙 Escuro' : '☀️ Claro'}
            </Button>
          </div>

          {/* ============ COLORS ============ */}
          <section id="colors" className="mb-16 scroll-mt-[84px]">
            <h2 className="font-heading font-extra text-h3 mb-2">Tokens de Cor</h2>
            <p className="text-ink-muted mb-6">Escalas completas 50–900 + semânticas + paleta de gráficos.</p>

            <h3 className="font-heading font-bold text-h5 mb-3 mt-6">Primário — Verde</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {['50','100','200','300','400','500','600','700','800','900'].map((n) => (
                <div key={n} className="rounded-[14px] overflow-hidden border border-border bg-surface">
                  <div className="h-16" style={{ background: `var(--color-primary-${n})` }} />
                  <div className="px-3 py-2 text-small">
                    <div className="font-heading font-bold">primary-{n}</div>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="font-heading font-bold text-h5 mb-3 mt-8">Secundário — Purple</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {['50','100','200','300','400','500','600','700','800','900'].map((n) => (
                <div key={n} className="rounded-[14px] overflow-hidden border border-border bg-surface">
                  <div className="h-16" style={{ background: `var(--color-secondary-${n})` }} />
                  <div className="px-3 py-2 text-small">
                    <div className="font-heading font-bold">secondary-{n}</div>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="font-heading font-bold text-h5 mb-3 mt-8">Accent — Gold</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {['50','100','200','300','400','500','600','700','800','900'].map((n) => (
                <div key={n} className="rounded-[14px] overflow-hidden border border-border bg-surface">
                  <div className="h-16" style={{ background: `var(--color-accent-${n})` }} />
                  <div className="px-3 py-2 text-small">
                    <div className="font-heading font-bold">accent-{n}</div>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="font-heading font-bold text-h5 mb-3 mt-8">Neutral — Slate</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {['50','100','200','300','400','500','600','700','800','900'].map((n) => (
                <div key={n} className="rounded-[14px] overflow-hidden border border-border bg-surface">
                  <div className="h-16" style={{ background: `var(--color-neutral-${n})` }} />
                  <div className="px-3 py-2 text-small">
                    <div className="font-heading font-bold">neutral-{n}</div>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="font-heading font-bold text-h5 mb-3 mt-8">Semânticas</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {[
                { name: 'success', color: 'var(--color-success)' },
                { name: 'warning', color: 'var(--color-warning)' },
                { name: 'error', color: 'var(--color-error)' },
                { name: 'info', color: 'var(--color-info)' },
              ].map((s) => (
                <div key={s.name} className="rounded-[14px] overflow-hidden border border-border bg-surface">
                  <div className="h-16" style={{ background: s.color }} />
                  <div className="px-3 py-2 text-small">
                    <div className="font-heading font-bold">{s.name}</div>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="font-heading font-bold text-h5 mb-3 mt-8">Paleta de Gráficos</h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {[
                { name: 'chart-1', color: 'var(--color-chart-1)' },
                { name: 'chart-2', color: 'var(--color-chart-2)' },
                { name: 'chart-3', color: 'var(--color-chart-3)' },
                { name: 'chart-4', color: 'var(--color-chart-4)' },
                { name: 'chart-5', color: 'var(--color-chart-5)' },
              ].map((c) => (
                <div key={c.name} className="rounded-[14px] overflow-hidden border border-border bg-surface">
                  <div className="h-16" style={{ background: c.color }} />
                  <div className="px-3 py-2 text-small">
                    <div className="font-heading font-bold">{c.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ============ TYPOGRAPHY ============ */}
          <section id="type" className="mb-16 scroll-mt-[84px]">
            <h2 className="font-heading font-extra text-h3 mb-2">Tipografia</h2>
            <p className="text-ink-muted mb-6">Baloo 2 (títulos) + Comic Neue (corpo).</p>
            <div className="flex flex-col gap-4 p-5 rounded-[14px] bg-surface border border-border">
              <div className="py-3 border-b border-dashed border-border"><h1 style={{ fontSize: 'var(--text-h1)' }}>h1 — Minado.gg</h1></div>
              <div className="py-3 border-b border-dashed border-border"><h2 style={{ fontSize: 'var(--text-h2)' }}>h2 — Sala de jogo</h2></div>
              <div className="py-3 border-b border-dashed border-border"><h3 style={{ fontSize: 'var(--text-h3)' }}>h3 — Leaderboard</h3></div>
              <div className="py-3 border-b border-dashed border-border"><h4 style={{ fontSize: 'var(--text-h4)' }}>h4 — Suas estatísticas</h4></div>
              <div className="py-3 border-b border-dashed border-border"><h5 style={{ fontSize: 'var(--text-h5)' }}>h5 — Modo turbo</h5></div>
              <div className="py-3 border-b border-dashed border-border"><h6 style={{ fontSize: 'var(--text-h6)' }}>h6 — Regras rápidas</h6></div>
              <div className="py-3 border-b border-dashed border-border"><p style={{ fontSize: 'var(--text-lead)' }}>Lead — O campo minado virou festa.</p></div>
              <div className="py-3 border-b border-dashed border-border"><p style={{ fontSize: 'var(--text-body)' }}>Body — Jogue com a galera, mande reações e suba no ranking.</p></div>
              <div className="py-3"><p style={{ fontSize: 'var(--text-small)' }}>Small — Última vez online há 2 min.</p></div>
            </div>
          </section>

          {/* ============ SPACING / RADIUS / SHADOW ============ */}
          <section id="tokens" className="mb-16 scroll-mt-[84px]">
            <h2 className="font-heading font-extra text-h3 mb-2">Espaçamento, Raio e Sombra</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
              <div className="p-5 rounded-[14px] bg-surface border border-border">
                <h4 className="font-heading font-bold text-h5 mb-3">Espaçamento (4px base)</h4>
                <div className="flex gap-3 flex-wrap items-center">
                  {[1,2,3,4,6,8,10,12].map((n) => (
                    <span key={n} className="inline-block px-3 py-1 rounded-[8px] bg-surface-muted font-heading font-bold text-small">
                      {n}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-5 rounded-[14px] bg-surface border border-border">
                <h4 className="font-heading font-bold text-h5 mb-3">Raio</h4>
                <div className="flex gap-3 flex-wrap items-center">
                  {[
                    { name: 'sm', value: '8px' },
                    { name: 'md', value: '14px' },
                    { name: 'lg', value: '22px' },
                    { name: 'xl', value: '30px' },
                    { name: 'full', value: '999px' },
                  ].map((r) => (
                    <div key={r.name} className="w-12 h-12 bg-primary-400" style={{ borderRadius: r.value }} title={`${r.name}: ${r.value}`} />
                  ))}
                </div>
              </div>
              <div className="p-5 rounded-[14px] bg-surface border border-border">
                <h4 className="font-heading font-bold text-h5 mb-3">Sombras</h4>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { name: 'sm', shadow: 'var(--shadow-sm)' },
                    { name: 'md', shadow: 'var(--shadow-md)' },
                    { name: 'lg', shadow: 'var(--shadow-lg)' },
                  ].map((s) => (
                    <div key={s.name} className="h-20 rounded-[14px] bg-surface flex items-center justify-center" style={{ boxShadow: s.shadow }}>
                      <span className="font-heading font-bold text-small text-ink-muted">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ============ COMPONENTS ============ */}
          <section id="components" className="mb-16 scroll-mt-[84px]">
            <h2 className="font-heading font-extra text-h3 mb-2">Componentes Atômicos</h2>
            <p className="text-ink-muted mb-6">Todos os componentes extraídos do design system CSS.</p>

            {/* Buttons */}
            <div className="mb-8 p-5 rounded-[14px] bg-surface border border-border">
              <h3 className="font-heading font-bold text-h5 mb-4">Button</h3>
              <div className="flex gap-3 flex-wrap items-center mb-4">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="accent">Accent</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
              <div className="flex gap-3 flex-wrap items-center mb-4">
                <Button variant="primary" size="sm">Small</Button>
                <Button variant="primary" size="md">Medium</Button>
                <Button variant="primary" size="lg">Large</Button>
              </div>
              <div className="flex gap-3 flex-wrap items-center">
                <Button variant="primary" loading>Loading</Button>
                <Button variant="primary" disabled>Disabled</Button>
              </div>
            </div>

            {/* Input */}
            <div className="mb-8 p-5 rounded-[14px] bg-surface border border-border">
              <h3 className="font-heading font-bold text-h5 mb-4">Input + Label</h3>
              <div className="max-w-sm flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Nome de usuário</Label>
                  <Input placeholder="Digite seu nome..." />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="email@exemplo.com" error helperText="Email inválido" />
                </div>
              </div>
            </div>

            {/* Badge */}
            <div className="mb-8 p-5 rounded-[14px] bg-surface border border-border">
              <h3 className="font-heading font-bold text-h5 mb-4">Badge</h3>
              <div className="flex gap-3 flex-wrap items-center">
                <Badge variant="primary">Primary</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="accent">Accent</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="danger">Danger</Badge>
              </div>
            </div>

            {/* Avatar */}
            <div className="mb-8 p-5 rounded-[14px] bg-surface border border-border">
              <h3 className="font-heading font-bold text-h5 mb-4">Avatar</h3>
              <div className="flex gap-4 items-center">
                <Avatar size="sm" initials="P" />
                <Avatar size="md" initials="A" />
                <Avatar size="lg" initials="M" />
                <Avatar size="md" initials="B" variant="bomb" />
              </div>
            </div>

            {/* Card */}
            <div className="mb-8 p-5 rounded-[14px] bg-surface border border-border">
              <h3 className="font-heading font-bold text-h5 mb-4">Card</h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
                <Card>
                  <CardHeader><CardTitle>Card Default</CardTitle></CardHeader>
                  <CardContent>Conteúdo do card com estilo padrão.</CardContent>
                </Card>
                <Card variant="muted">
                  <CardHeader><CardTitle>Card Muted</CardTitle></CardHeader>
                  <CardContent>Conteúdo do card com fundo muted.</CardContent>
                </Card>
                <Card variant="elevated">
                  <CardHeader><CardTitle>Card Elevated</CardTitle></CardHeader>
                  <CardContent>Conteúdo do card com sombra elevada.</CardContent>
                </Card>
              </div>
            </div>

            {/* Modal */}
            <div className="mb-8 p-5 rounded-[14px] bg-surface border border-border">
              <h3 className="font-heading font-bold text-h5 mb-4">Modal</h3>
              <Button variant="primary" onClick={handleModalOpen}>Abrir Modal</Button>
              <Modal open={modalOpen} onClose={handleModalClose} title="Criar Sala">
                <p className="text-ink-muted mb-4">Configure sua sala de jogo.</p>
                <ModalActions>
                  <Button variant="ghost" onClick={handleModalClose}>Cancelar</Button>
                  <Button variant="primary" onClick={handleModalClose}>Criar</Button>
                </ModalActions>
              </Modal>
            </div>

            {/* Tabs */}
            <div className="mb-8 p-5 rounded-[14px] bg-surface border border-border">
              <h3 className="font-heading font-bold text-h5 mb-4">Tabs</h3>
              <Tabs defaultValue="salas">
                <TabList>
                  <TabTrigger value="salas">Salas</TabTrigger>
                  <TabTrigger value="amigos">Amigos</TabTrigger>
                  <TabTrigger value="ranking">Ranking</TabTrigger>
                </TabList>
                <TabContent value="salas">
                  <p className="py-4 text-ink-muted">Lista de salas públicas disponíveis.</p>
                </TabContent>
                <TabContent value="amigos">
                  <p className="py-4 text-ink-muted">Seus amigos online.</p>
                </TabContent>
                <TabContent value="ranking">
                  <p className="py-4 text-ink-muted">Ranking global dos jogadores.</p>
                </TabContent>
              </Tabs>
            </div>
          </section>

          {/* ============ COMPOSED BLOCKS ============ */}
          <section id="composed" className="mb-16 scroll-mt-[84px]">
            <h2 className="font-heading font-extra text-h3 mb-2">Blocos Compostos</h2>
            <p className="text-ink-muted mb-6">Componentes compostos usados nas páginas.</p>

            <div className="mb-8">
              <h3 className="font-heading font-bold text-h5 mb-4">PlayerRoster</h3>
              <PlayerRoster players={samplePlayers} currentUserId="1" />
            </div>

            <div className="mb-8">
              <h3 className="font-heading font-bold text-h5 mb-4">ChatPanel</h3>
              <ChatPanel messages={sampleMessages} currentUsername="Pablo" />
            </div>

            <div className="mb-8">
              <h3 className="font-heading font-bold text-h5 mb-4">RoomCard</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                <RoomCard
                  id="room-1"
                  name="Turbinados"
                  mode="competitive"
                  difficulty="medium"
                  playerCount={3}
                  maxPlayers={5}
                />
                <RoomCard
                  id="room-2"
                  name="Amigos Only"
                  mode="cooperative"
                  difficulty="easy"
                  playerCount={2}
                  maxPlayers={4}
                  isPrivate
                />
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-heading font-bold text-h5 mb-4">Leaderboard</h3>
              <div className="max-w-[400px]">
                <Leaderboard entries={[
                  { rank: 1, username: 'Bia', score: 128 },
                  { rank: 2, username: 'Zé', score: 97 },
                  { rank: 3, username: 'Lu', score: 84 },
                ]} />
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-heading font-bold text-h5 mb-4">ProfileCard</h3>
              <ProfileCard username="João Pedro" wins={312} streak={48} rank="Prata" />
            </div>

            <div className="mb-8">
              <h3 className="font-heading font-bold text-h5 mb-4">MatchCard</h3>
              <div className="max-w-[500px]">
                <MatchCard
                  team1={['JP', 'BI']}
                  team2={['ZE', 'LU']}
                  status="Em andamento"
                  progress={40}
                />
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-heading font-bold text-h5 mb-4">GameModeCard / ModeGrid</h3>
              <ModeGrid>
                <GameModeCard
                  icon={<span className="text-xl">⚔️</span>}
                  title="Competitivo"
                  description="Mesmo tabuleiro, maior pontuação vence."
                />
                <GameModeCard
                  icon={<span className="text-xl">🏁</span>}
                  title="Vários Tabuleiros"
                  description="Corrida — primeiro a limpar vence."
                />
                <GameModeCard
                  icon={<span className="text-xl">🤝</span>}
                  title="Cooperativo"
                  description="Juntos contra as minas. Erros compartilhados."
                />
                <GameModeCard
                  icon={<span className="text-xl">👑</span>}
                  title="Battle Royale"
                  description="Eliminação. Último sobrevivente vence."
                />
              </ModeGrid>
            </div>
          </section>

          {/* ============ GAME ============ */}
          <section id="game" className="mb-16 scroll-mt-[84px]">
            <h2 className="font-heading font-extra text-h3 mb-2">Jogo — Campo Minado</h2>
            <p className="text-ink-muted mb-6">Mascote, células com estados, banners e reações rápidas.</p>

            <div className="mb-8">
              <h3 className="font-heading font-bold text-h5 mb-4">Mascote (feliz / explodido)</h3>
              <div className="flex gap-8 items-end p-5 rounded-[14px] bg-surface border border-border">
                <div className="text-center">
                  <Mascote state="happy" />
                  <p className="text-small text-ink-muted mt-2">Happy</p>
                </div>
                <div className="text-center">
                  <Mascote state="exploded" />
                  <p className="text-small text-ink-muted mt-2">Exploded</p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-heading font-bold text-h5 mb-4">Tabuleiro 8×8 (estados mistos)</h3>
              <div className="p-5 rounded-[14px] bg-surface border border-border" id="shakeTarget">
                <div className="board" style={{ '--board-cols': 8 } as React.CSSProperties}>
                  {demoBoardCells.map((cell, i) => (
                    <div key={i} className={`board-cell ${cell.classes}`}>
                      {cell.content}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-heading font-bold text-h5 mb-4">Reações rápidas (pings)</h3>
              <div className="p-5 rounded-[14px] bg-surface border border-border">
                <PingRow onSelect={(type) => console.log('Ping:', type)} />
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-heading font-bold text-h5 mb-4">Banners</h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
                <Banner type="win" title="VITÓRIA!" subtitle="Você desarmou tudo com estilo. Lenda!" emoji="🎉" />
                <Banner type="lose" title="BOMBARDeado!" subtitle="Relaxa, foi só um BOOM de sorte. Bora de novo?" emoji="💣" />
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-heading font-bold text-h5 mb-4">FX — Boom / Confete</h3>
              <div className="flex gap-6 items-start">
                <div>
                  <FxBoom active={boomActive} onComplete={handleBoomStop} />
                  <Button variant="accent" size="sm" className="mt-2" onClick={handleBoomStart}>
                    Disparar Boom
                  </Button>
                </div>
                <div className="flex-1 w-full">
                  <FxConfetti active={confettiActive} onComplete={handleConfettiStop} />
                  <Button variant="accent" size="sm" className="mt-2" onClick={handleConfettiStart}>
                    Disparar Confete
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* ============ MOTION ============ */}
          <section id="motion" className="mb-16 scroll-mt-[84px]">
            <h2 className="font-heading font-extra text-h3 mb-2">Animações</h2>
            <p className="text-ink-muted mb-6">
              --ease-bounce: <code>cubic-bezier(0.34,1.56,0.64,1)</code> · --duration-base: 220ms. Respeita <code>prefers-reduced-motion</code>.
            </p>

            <div className="flex gap-3 flex-wrap mb-8">
              <Button variant="primary">Pressionar (bounce)</Button>
              <Button variant="secondary">Hover lift</Button>
              <Button variant="accent" onClick={handleBoomMotion}>💥 Boom!</Button>
              <Button variant="ghost" onClick={handleConfettiMotion}>🎉 Confete!</Button>
              <Button variant="danger" onClick={handleShake}>Tremor!</Button>
            </div>

            <div className={`grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 ${shakeActive ? 'fx-screen-shake is-active' : ''}`}>
              <div className="p-5 rounded-[14px] bg-surface border border-border text-center">
                <p className="font-heading font-bold text-small text-ink-muted mb-2">duration-fast</p>
                <p className="font-heading font-bold text-h5">140ms</p>
              </div>
              <div className="p-5 rounded-[14px] bg-surface border border-border text-center">
                <p className="font-heading font-bold text-small text-ink-muted mb-2">duration-base</p>
                <p className="font-heading font-bold text-h5">220ms</p>
              </div>
              <div className="p-5 rounded-[14px] bg-surface border border-border text-center">
                <p className="font-heading font-bold text-small text-ink-muted mb-2">duration-slow</p>
                <p className="font-heading font-bold text-h5">420ms</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}