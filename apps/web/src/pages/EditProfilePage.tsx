import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Alert } from '@/components/ui/Alert'
import { Navbar } from '@/components/blocks/Navbar'
import { useAuthStore } from '@/store/authStore'
import { apiFetch } from '@/lib/api'

export function EditProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)

  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  if (!user) {
    return (
      <div className="min-h-dvh flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-5">
          <div className="text-center">
            <p className="font-heading font-bold text-h5 text-ink-muted mb-4">Você precisa estar logado</p>
            <Button variant="primary" onClick={() => navigate('/login')}>Fazer Login</Button>
          </div>
        </main>
      </div>
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password && password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    const body: Record<string, string> = {}
    if (email !== user.email) body.email = email
    if (password) body.password = password

    if (Object.keys(body).length === 0) {
      setSuccess('Nenhuma alteração necessária')
      return
    }

    setSaving(true)
    try {
      const updated = await apiFetch<{ id: string; username: string; email: string; avatarUrl: string | null }>('/auth/me', {
        method: 'PUT',
        body: JSON.stringify(body),
      })
      setUser({ id: updated.id, username: updated.username, email: updated.email, avatarUrl: updated.avatarUrl || undefined })
      setSuccess('Perfil atualizado com sucesso!')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar username={user.username} avatarUrl="" />

      <main className="flex-1 p-5 max-w-[700px] mx-auto w-full">
        <div className="mb-8">
          <h1 className="font-heading font-extra text-h2 text-ink mb-2">Configurações</h1>
          <p className="text-ink-muted">Gerencie sua conta</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <Avatar size="lg" initials={user.username[0]} />
                <div>
                  <div className="font-heading font-bold text-h5 text-ink">{user.username}</div>
                  <div className="text-small text-ink-muted">#{user.id.slice(-6)}</div>
                </div>
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

              <div>
                <Label htmlFor="password">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Deixe vazio para não alterar"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirme a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              {error && <Alert variant="error">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Button type="submit" variant="primary" loading={saving}>
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>

          <Card variant="muted" className="border-border">
            <CardHeader>
              <CardTitle>Sessão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="ghost" className="w-full" onClick={() => navigate('/lobby')}>
                Voltar ao Lobby
              </Button>
              <Button
                variant="danger"
                className="w-full"
                onClick={() => { logout(); navigate('/login') }}
              >
                Sair da Conta
              </Button>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  )
}
