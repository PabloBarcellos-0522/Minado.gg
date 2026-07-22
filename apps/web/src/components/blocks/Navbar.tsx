import { Link } from 'react-router-dom'
import { useTheme } from '@/components/useTheme'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'

interface NavbarProps {
  username?: string
  avatarUrl?: string
}

export function Navbar({ username, avatarUrl }: NavbarProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 px-5 py-4 bg-surface border-b border-border shadow-sm">
      <Link to="/" className="flex items-center gap-2 no-underline">
        <span className="font-heading font-extra text-h5 text-primary-600">
          Minado.gg
        </span>
        <small className="font-body font-regular text-small text-ink-muted hidden sm:block">
          O clássico ficou social.
        </small>
      </Link>

      <nav className="flex items-center gap-4">
        <Link
          to="/lobby"
          className="font-heading font-bold text-ink no-underline hover:text-primary-600 transition-colors duration-base"
        >
          Lobby
        </Link>
        <Link
          to="/ranking"
          className="font-heading font-bold text-ink no-underline hover:text-primary-600 transition-colors duration-base"
        >
          Ranking
        </Link>
        <Link
          to="/styleguide"
          className="font-heading font-bold text-ink no-underline hover:text-primary-600 transition-colors duration-base"
        >
          Styleguide
        </Link>

        <Button variant="ghost" size="sm" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </Button>

        {username ? (
          <Link to={`/perfil/${username}`} className="no-underline">
            <Avatar src={avatarUrl} initials={username[0]} size="sm" />
          </Link>
        ) : (
          <Link to="/login">
            <Button variant="primary" size="sm">
              Entrar
            </Button>
          </Link>
        )}
      </nav>
    </header>
  )
}
