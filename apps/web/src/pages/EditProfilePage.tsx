import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Tabs, TabList, TabTrigger, TabContent } from '@/components/ui/Tabs'
import { Navbar } from '@/components/blocks/Navbar'

export function EditProfilePage() {
  const [username, setUsername] = useState('Pablo')
  const [email, setEmail] = useState('pablo@email.com')
  const [avatarUrl] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [boardTheme, setBoardTheme] = useState('classic')
  const [cursorStyle, setCursorStyle] = useState('default')
  const [flagStyle, setFlagStyle] = useState('classic')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [gameInvites, setGameInvites] = useState(true)

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar username="Jogador" avatarUrl="" />

      <main className="flex-1 p-5 max-w-[1000px] mx-auto w-full">
        <div className="mb-8">
          <h1 className="font-heading font-extra text-h2 text-ink mb-2">Configurações</h1>
          <p className="text-ink-muted">Gerencie sua conta, aparência e preferências</p>
        </div>

        <Tabs defaultValue="conta">
          <TabList className="mb-6">
            <TabTrigger value="conta">Conta</TabTrigger>
            <TabTrigger value="aparencia">Aparência</TabTrigger>
            <TabTrigger value="notificacoes">Notificações</TabTrigger>
          </TabList>

          {/* Account Tab */}
          <TabContent value="conta">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Preview */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader><CardTitle>Seu Perfil</CardTitle></CardHeader>
                  <CardContent className="text-center space-y-4">
                    <Avatar size="lg" initials={username[0]} src={avatarUrl} />
                    <div>
                      <div className="font-heading font-bold text-h5 text-ink">{username}</div>
                      <div className="text-small text-ink-muted">#{username.toLowerCase()}</div>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full">Alterar Avatar</Button>
                  </CardContent>
                </Card>

                <Card className="mt-4">
                  <CardHeader><CardTitle>Conexões</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <ConnectedAccount provider="Google" connected={true} />
                    <ConnectedAccount provider="Discord" connected={false} />
                    <ConnectedAccount provider="GitHub" connected={true} />
                  </CardContent>
                </Card>
              </div>

              {/* Forms */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader><CardTitle>Informações da Conta</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="username">Nome de Usuário</Label>
                        <Input
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          disabled={true}
                          helperText="O nome de usuário não pode ser alterado"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="password">Nova Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Deixe vazio para não alterar"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirme a nova senha"
                      />
                    </div>
                    <Button variant="primary">Salvar Alterações</Button>
                  </CardContent>
                </Card>

                <Card variant="muted" className="border-border">
                  <CardHeader><CardTitle>Zona de Perigo</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-heading font-bold text-ink">Excluir Conta</p>
                        <p className="text-small text-ink-muted">Esta ação é irreversível. Todos os seus dados serão perdidos.</p>
                      </div>
                      <Button variant="danger">Excluir Conta</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabContent>

          {/* Appearance Tab */}
          <TabContent value="aparencia">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Tema</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {['light', 'dark', 'system'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t as 'light' | 'dark' | 'system')}
                        className={`p-4 rounded-[14px] border-2 transition-all ${
                          theme === t
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                            : 'border-border hover:border-primary-300'
                        }`}
                      >
                        <div className="font-heading font-bold text-ink capitalize">{t}</div>
                        <div className="text-small text-ink-muted mt-1">
                          {t === 'light' && 'Sempre claro'}
                          {t === 'dark' && 'Sempre escuro'}
                          {t === 'system' && 'Seguir sistema'}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Personalização do Tabuleiro</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Tema do Tabuleiro</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {['classic', 'neon', 'minimal', 'retro'].map((t) => (
                        <BoardThemeOption key={t} name={t} selected={boardTheme === t} onClick={() => setBoardTheme(t)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Estilo do Cursor</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {['default', 'crosshair', 'target', 'magic'].map((c) => (
                        <CursorOption key={c} name={c} selected={cursorStyle === c} onClick={() => setCursorStyle(c)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Estilo da Bandeira</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {['classic', 'heart', 'skull', 'star'].map((f) => (
                        <FlagOption key={f} name={f} selected={flagStyle === f} onClick={() => setFlagStyle(f)} />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Bandeira do Perfil</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                    {['🇧🇷', '🇺🇸', '🇵🇹', '🇦🇷', '🇨🇱', '🇲🇽', '🇨🇴', '🇵🇪'].map((flag) => (
                      <button
                        key={flag}
                        className="text-2xl p-3 rounded-[14px] border-2 border-border hover:border-primary-500 transition-colors"
                      >
                        {flag}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabContent>

          {/* Notifications Tab */}
          <TabContent value="notificacoes">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Notificações por E-mail</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <NotificationToggle
                    title="Convites de Partida"
                    description="Receba e-mail quando for convidado para uma sala"
                    checked={gameInvites}
                    onChange={setGameInvites}
                  />
                  <NotificationToggle
                    title="Lembretes de Partida"
                    description="E-mail quando uma partida agendada estiver prestes a começar"
                    checked={emailNotifications}
                    onChange={setEmailNotifications}
                  />
                  <NotificationToggle
                    title="Atualizações de Ranking"
                    description="Resumo semanal da sua posição no ranking"
                    checked={false}
                    onChange={() => {}}
                  />
                  <NotificationToggle
                    title="Newsletter e Novidades"
                    description="Novidades, eventos e atualizações do Minado.gg"
                    checked={true}
                    onChange={() => {}}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Notificações Push (Navegador)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <NotificationToggle
                    title="Ativar Notificações Push"
                    description="Receba notificações no navegador mesmo com a aba fechada"
                    checked={pushNotifications}
                    onChange={setPushNotifications}
                  />
                  <NotificationToggle
                    title="Convites em Tempo Real"
                    description="Notificação instantânea ao receber convite"
                    checked={true}
                    onChange={() => {}}
                  />
                  <NotificationToggle
                    title="Sua Vez de Jogar"
                    description="Aviso quando for sua vez em partida multiplayer"
                    checked={true}
                    onChange={() => {}}
                  />
                  <NotificationToggle
                    title="Fim de Partida"
                    description="Resultado quando a partida termina"
                    checked={false}
                    onChange={() => {}}
                  />
                </CardContent>
              </Card>
            </div>
          </TabContent>
        </Tabs>
      </main>
    </div>
  )
}

function ConnectedAccount({ provider, connected }: { provider: string; connected: boolean }) {
  const icons: Record<string, React.ReactNode> = {
    Google: (
      <svg viewBox="0 0 24 24" className="w-5 h-5">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
    Discord: (
      <svg viewBox="0 0 24 24" fill="#5865F2" className="w-5 h-5">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.38-.444.873-.608 1.248-1.295 2.825-3.71 4.99-6.744 5.474-.088.013-.177.013-.265 0-2.93-.41-5.27-2.54-6.573-5.373-.221-.492-.42-1.055-.584-1.486a.083.083 0 0 0-.134-.015.074.074 0 0 0-.033.073c-.158 2.32-.77 5.358-2.237 8.387a.077.077 0 0 0 .008.118.077.077 0 0 0 .102.018c1.972-3.842 5.096-7.124 9.12-7.124.683 0 1.312.09 1.87.225a.077.077 0 0 0 .086-.07c.053-.322.116-.627.177-.917a18.29 18.29 0 0 0 1.76-5.393.077.077 0 0 0-.04-.112zM8.014 9.734c0-.876.626-1.687 1.457-1.687.783 0 1.422.612 1.422 1.427 0 .89-.654 1.63-1.422 1.63-.746 0-1.457-.737-1.457-1.37zm7.972 0c0-.876.627-1.687 1.458-1.687.782 0 1.42.612 1.42 1.427 0 .89-.654 1.63-1.42 1.63-.746 0-1.458-.737-1.458-1.37z" />
      </svg>
    ),
    GitHub: (
      <svg viewBox="0 0 24 24" fill="#24292E" className="w-5 h-5">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-[14px] bg-surface-muted">
      <span className="w-5 h-5 flex-shrink-0">{icons[provider]}</span>
      <span className="font-heading font-medium text-ink flex-1">{provider}</span>
      <Badge variant={connected ? 'success' : 'warning'} size="sm">
        {connected ? 'Conectado' : 'Conectar'}
      </Badge>
    </div>
  )
}

function BoardThemeOption({ name, selected, onClick }: { name: string; selected: boolean; onClick: () => void }) {
  const previews: Record<string, string> = {
    classic: '🟩',
    neon: '🟢',
    minimal: '⬜',
    retro: '🟦',
  }
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-[14px] border-2 text-center transition-all ${
        selected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-border hover:border-primary-300'
      }`}
    >
      <div className="text-3xl mb-1">{previews[name]}</div>
      <div className="font-heading font-bold text-small text-ink capitalize">{name}</div>
    </button>
  )
}

function CursorOption({ name, selected, onClick }: { name: string; selected: boolean; onClick: () => void }) {
  const cursors: Record<string, string> = {
    default: '🖱️',
    crosshair: '🎯',
    target: '🔍',
    magic: '✨',
  }
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-[14px] border-2 text-center transition-all ${
        selected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-border hover:border-primary-300'
      }`}
    >
      <div className="text-3xl mb-1">{cursors[name]}</div>
      <div className="font-heading font-bold text-small text-ink capitalize">{name}</div>
    </button>
  )
}

function FlagOption({ name, selected, onClick }: { name: string; selected: boolean; onClick: () => void }) {
  const flags: Record<string, string> = {
    classic: '🚩',
    heart: '❤️',
    skull: '☠️',
    star: '⭐',
  }
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-[14px] border-2 text-center transition-all ${
        selected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-border hover:border-primary-300'
      }`}
    >
      <div className="text-3xl mb-1">{flags[name]}</div>
      <div className="font-heading font-bold text-small text-ink capitalize">{name}</div>
    </button>
  )
}

function NotificationToggle({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-[14px] bg-surface-muted">
      <div className="flex-1">
        <div className="font-heading font-bold text-small text-ink">{title}</div>
        <div className="text-small text-ink-muted">{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded-[8px] border-border text-primary-600 focus:ring-primary-500 cursor-pointer"
      />
    </div>
  )
}