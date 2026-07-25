import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { useAuthStore } from '@/store/authStore'

const oauthProviders = [
  {
    id: 'google',
    name: 'Google',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.38-.444.873-.608 1.248-1.295 2.825-3.71 4.99-6.744 5.474-.088.013-.177.013-.265 0-2.93-.41-5.27-2.54-6.573-5.373-.221-.492-.42-1.055-.584-1.486a.083.083 0 0 0-.134-.015.074.074 0 0 0-.033.073c-.158 2.32-.77 5.358-2.237 8.387a.077.077 0 0 0 .008.118.077.077 0 0 0 .102.018c1.972-3.842 5.096-7.124 9.12-7.124.683 0 1.312.09 1.87.225a.077.077 0 0 0 .086-.07c.053-.322.116-.627.177-.917a18.29 18.29 0 0 0 1.76-5.393.077.077 0 0 0-.04-.112zM8.014 9.734c0-.876.626-1.687 1.457-1.687.783 0 1.422.612 1.422 1.427 0 .89-.654 1.63-1.422 1.63-.746 0-1.457-.737-1.457-1.37zm7.972 0c0-.876.627-1.687 1.458-1.687.782 0 1.42.612 1.42 1.427 0 .89-.654 1.63-1.42 1.63-.746 0-1.458-.737-1.458-1.37z" />
      </svg>
    ),
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
]

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/lobby'
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const loginWithOAuth = useAuthStore((s) => s.loginWithOAuth)
  const loading = useAuthStore((s) => s.isLoading)

  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const handleOAuthLogin = async (provider: string) => {
    setError('')
    try {
      await loginWithOAuth(provider as 'google' | 'discord' | 'github', '')
    } catch {
      setError(`Erro ao conectar com ${provider}. Tente novamente.`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isLogin && password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (!email || !password) {
      setError('Preencha todos os campos')
      return
    }

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        if (!username) {
          setError('Preencha o nome de usuário')
          return
        }
        await register(username, email, password)
      }
      navigate(redirect, { replace: true })
    } catch {
      setError('Erro ao autenticar. Tente novamente.')
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-5 py-12">
      <Card variant="elevated" className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="mb-1">{isLogin ? 'Entrar' : 'Criar conta'}</CardTitle>
          <p className="text-ink-muted text-body">
            {isLogin ? 'Acesse sua conta para jogar' : 'Registre-se para entrar no ranking'}
          </p>
        </CardHeader>

        <CardContent>
          {/* OAuth Buttons */}
          <div className="flex flex-col gap-3 mb-6">
            {oauthProviders.map((provider) => (
              <Button
                key={provider.id}
                variant="ghost"
                size="md"
                onClick={() => handleOAuthLogin(provider.id)}
                className="gap-3 justify-start"
                disabled={loading}
              >
                <span className="w-5 h-5 flex-shrink-0">{provider.icon}</span>
                <span>Continuar com {provider.name}</span>
              </Button>
            ))}
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-small text-ink-muted">
              <span className="bg-surface px-3">ou</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                disabled={loading}
              />
            </div>

            {!isLogin && (
              <div>
                <Label htmlFor="username">Nome de usuário</Label>
                <Input
                  id="username"
                  placeholder="Seu nome de jogador"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={20}
                  required
                  disabled={loading}
                />
              </div>
            )}

            {!isLogin && (
              <div>
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" size="md" loading={loading}>
              {isLogin ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          {/* Toggle Mode */}
          <p className="text-center text-small text-ink-muted mt-6">
            {isLogin ? 'Não tem conta?' : 'Já tem conta?'} {' '}
            <button
              type="button"
              onClick={toggleMode}
              className="font-heading font-bold text-primary-600 hover:underline no-underline"
            >
              {isLogin ? 'Cadastre-se' : 'Entre'}
            </button>
          </p>

          {error && <Alert variant="error" className="mb-2">{error}</Alert>}
        </CardContent>
      </Card>
    </div>
  )
}