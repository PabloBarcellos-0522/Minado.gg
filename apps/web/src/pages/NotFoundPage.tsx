import { Navbar } from '@/components/blocks/Navbar'

export function NotFoundPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Navbar username="Jogador" avatarUrl="" />
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-6">💣</div>
          <h1 className="font-heading font-extra text-h1 text-primary-600 mb-4">404</h1>
          <p className="text-lead text-ink-muted mb-6">Essa página explodiu! Não encontramos o que você procura.</p>
          <p className="text-body text-ink-muted mb-8">Talvez tenha caído em uma mina ou digitado o endereço errado.</p>
          <a href="/">
            <button className="px-6 py-3 rounded-full bg-primary-500 text-white font-heading font-bold hover:bg-primary-600 transition-colors">
              Voltar ao Início
            </button>
          </a>
        </div>
      </main>
    </div>
  )
}