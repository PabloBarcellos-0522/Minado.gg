# SPEC 03 — Lobby com dados reais: Ranking e Presence

## 1. Visão geral

A página `/lobby` (`apps/web/src/pages/LobbyPage.tsx`) tem duas tabs com dados 100% hardcoded:

- **Amigos Online** (`TabTrigger value="amigos"`, linha 115): lista fake de 4 jogadores (`LobbyPage.tsx:156-161`) com botão "Convidar" morto (sem `onClick`, linhas 173–175).
- **Ranking Rápido** (`TabTrigger value="ranking"`, linha 116): 3 cards fake ("Global"/"Semanal"/"Mensal", linhas 185–208) com scores pré-formatados como string (`'2,847'`).

Esta spec substitui os mocks por dados reais:

1. **Ranking Rápido** → endpoint REST real `GET /api/users/ranking` (`apps/server/src/routes/users.ts:6-20`), com parâmetro de período (`?period=global|weekly|monthly`) herdado da **SPEC 02** (dependência — ver §2 e §8).
2. **Amigos Online** → sistema MVP de **presence** (global presence) no servidor: usuários com socket autenticado conectado + status derivado (`online` | `in-game`). **Sem** modelo `Friend` e **sem** convites (explicitamente fora de escopo — §7).

Decisões de produto (confirmadas pelo product owner):

- A tab mostra **somente usuários online** (não há relação de amizade, então entradas "offline" seriam uma lista global de todos os usuários — fora do espírito do MVP; documentado em §3).
- O botão "Convidar" é **removido** (nenhuma feature de convite existe; botão desabilitado com tooltip seria UI morta).
- Status `'in-game'` é **derivado** (não persistido): usuário cujo socket está em uma room com `status === 'playing'`.

## 2. Estado atual

Referências verificadas nesta sessão (todas conferidas na leitura dos arquivos):

**Client — Lobby (`apps/web/src/pages/LobbyPage.tsx`, 237 linhas)**
- Tabs: `LobbyPage.tsx:112-117` (`salas` | `amigos` | `ranking`). O componente `Tabs` (`apps/web/src/components/ui/Tabs.tsx`) é **não-controlado** — `activeTab` é estado interno (`Tabs.tsx:16-24`) e **não há `onValueChange`**; a troca de tab não é observável de fora.
- "Salas Públicas" já usa dados reais (`roomStore`).
- Mock "Amigos": `LobbyPage.tsx:156-161` (`{ name: 'Ana', status: 'online', game: 'Em partida: Competitivo' }` …), render 152–181; avatar por inicial com `bg-secondary-500 text-white` (linha 164) — em dark mode `--color-secondary-500: #b794ff` (`apps/web/src/index.css:176`) torna o texto branco de baixo contraste; dot de status `bg-success` / `bg-ink-muted` (linha 167); botão "Convidar" ghost sem handler (173–175); `key={i}` (linha 161).
- Mock "Ranking": períodos `['Global', 'Semanal', 'Mensal']` (linha 185), entries `{ rank, name, score }` com score string pré-formatado (192–197), badge `variant={entry.rank <= 3 ? 'accent' : 'primary'}` (linha 200). Sem loading/error/empty states em ambas as tabs.
- `LobbyPage.tsx:49` passa `username={useAuthStore((s) => s.user?.username || 'Jogador')}`. No `Navbar` (`apps/web/src/components/blocks/Navbar.tsx:15`) `const username = propUsername || authUser?.username` — o fallback truthy `'Jogador'` **esconde o botão "Entrar"** para usuários deslogados (`Navbar.tsx:53-63`). Bug real confirmado. (`avatarUrl=""` em linha 49 é falsy e cai no fallback do próprio Navbar — sem impacto.)

**Client — componentes reutilizáveis**
- `apps/web/src/components/blocks/Leaderboard.tsx` (33 linhas): `entries: { rank, username, score }[]`, badge 1º = `accent`, 2º = `secondary`, demais = `primary` (`Leaderboard.tsx:22` — **já implementa o padrão de 3 variantes**; não precisa mudar), avatar com iniciais, `{entry.score} pts`. Usado apenas no Styleguide (`apps/web/src/pages/Styleguide.tsx:509`).
- `apps/web/src/components/ui/Avatar.tsx:38-39`: initials sem `src` usam `bg-secondary-500 text-white` — mesmo problema de contraste em dark mode (afeta Navbar, RankingPage, Leaderboard).
- Padrão a copiar: `apps/web/src/pages/RankingPage.tsx:26-31` (fetch com `apiFetch`, loading), `RankingEntry` local (11–19), medalhas 1/2/3 em `RankingPage.tsx:85-90`, formatação `toLocaleString` (linha 103 — **sem** argumento `'pt-BR'` hoje).
- `apps/web/src/lib/api.ts:13-28`: `apiFetch` injeta JWT de `localStorage['minado-auth']` automaticamente.
- `apps/web/src/lib/socket.ts`: `getSocket()` (17), `connectSocket()` (44–54), `onSocketEvent()` (89–95). `App.tsx:44` conecta o socket globalmente no mount.

**Server — REST**
- `apps/server/src/routes/users.ts:6-20`: `GET /api/users/ranking` → top 100 por `xp desc`, retorna `{ rank, id, username, avatarUrl, xp, level, stats: { victories, matchesPlayed } }`. **Hoje não há parâmetro `?period=`** (chega na SPEC 02). Query params desconhecidos são ignorados pelo Express → mandar `?period=` antes da SPEC 02 degrada silenciosamente para "global" (comportamento aceitável, §8).

**Server — presence (não existe)**
- Auth de socket: `apps/server/src/index.ts:68-82` (`io.use`) grava `socket.userId` / `socket.username` (74–77).
- `RoomManager` (`apps/server/src/rooms/RoomManager.ts`): mapa `playerSockets` (linha 6), flag `isConnected` (181–183), `getRoom()` público (63), `startGame()` seta `room.status = 'playing'` (212–217), `getPublicRooms()` só expõe rooms `waiting` (73–82). **Não há** registro global usuário→socket, **não há** eventos de presence, e **não há** coluna `lastSeenAt` no `User` (`apps/server/prisma/schema.prisma:10-24`).
- Ciclo de game: `GameManager.endGame()` chama `onGameEnded` (`apps/server/src/game/GameManager.ts:191-204`, call em 203) com reasons `'last_standing' | 'win' | 'complete' | 'timeout'`. Em `apps/server/src/index.ts:31-46`, o callback seta `room.status = 'finished'` (linha 43) e emite `game:ended`; o early-return `reason === 'eliminated'` (linha 32) é caminho morto hoje (nenhum caller passa `'eliminated'`). Eliminação individual em partida contínua: `apps/server/src/sockets/gameHandler.ts:58-73` (jogador eliminado continua na room com `status 'playing'`).
- Handlers: `room:start` em `apps/server/src/sockets/roomHandler.ts:198-252` (chama `roomManager.startGame` na linha 215); `room:join` (56–154, inclui rejoin em room `playing` nas linhas 85–121); `room:leave` (156–182).

**Client — stores**
- `apps/web/src/store/roomStore.ts` (rooms, `currentRoom`, `fetchRooms` via `room:list`), `apps/web/src/store/authStore.ts` (`user: { id, username, email, avatarUrl? }`). Não há store de friends nem de ranking (e não será criada — §3).

**Tipos compartilhados** (`packages/shared/src/index.ts`)
- `Player` (26–34): `id, username, avatarUrl?, score, isReady, isHost, isConnected?`. `Room` (36–47): `id, hostId, mode, isPrivate, maxPlayers, status ('waiting'|'playing'|'finished'), players, boardConfig, difficulty, timeLimit`.

**Dependência externa — SPEC 02**
- `specs/02-match-persistence.md` **não existe** (diretório `specs/` vazio). O parâmetro `?period=` no `/api/users/ranking` é implementado na SPEC 02; esta spec define apenas o consumo no client. Detalhes em §8.

## 3. Requisitos e regras

1. **Ranking Rápido (tab "ranking")** usa o endpoint real `GET /api/users/ranking?period=<p>`.
   - Período padrão `global`; seletor com 3 períodos (`global` → "Global", `weekly` → "Semanal", `monthly` → "Mensal").
   - Re-fetch ao trocar de período e ao entrar na tab (estado local `useState`/`useEffect` — padrão de `RankingPage.tsx`, **sem** Zustand novo).
   - Reutilizar `Leaderboard.tsx` com top 5 (`slice(0, 5)`), mapeando `{ rank, username, score: xp }`; score formatado com `toLocaleString('pt-BR')` no render.
   - Estados obrigatórios: `loading` ("Carregando ranking..."), `error` (mensagem + botão "Tentar novamente") e `empty` ("Nenhum jogador ainda").
   - Sem scores pré-formatados em string; sem `key={i}`/`key={entry.rank}` — usar `key={entry.id}` (ou `userId`).
2. **Presence (tab "amigos")** — somente usuários **online**, com status derivado.
   - `'in-game'`: o usuário está em uma room cujo `status === 'playing'` (label "Em partida: <Modo>"). `'online'`: conectado, fora de partida (label "No lobby").
   - Entradas offline **não são exibidas** (não existe relação de amizade; sem "Visto há…" neste MVP).
   - O próprio usuário é filtrado da lista.
   - Snapshot buscado ao montar o Lobby (`presence:list` → `presence:snapshot`) e mantido ao vivo via `presence:update` enquanto a página estiver montada.
   - Ordenação por `username` (localeCompare).
   - Remover o botão "Convidar" (sem feature de convite). Decisão: **remover**, não desabilitar com tooltip.
   - Corrigir contraste do avatar de iniciais em dark mode (texto escuro sobre `secondary-500` claro — `index.css:176`).
3. **Presence no servidor** — `PresenceManager` (novo módulo `apps/server/src/presence/PresenceManager.ts`):
   - Registro por usuário (não por socket): `userId → { username, avatarUrl, socketIds[], status, roomId, mode }`.
   - `register` na conexão do socket; `unregister` no disconnect (remove o socket; remove a entry quando o **último** socket do usuário cai).
   - `lastSeenAt` persistido no disconnect **total** (último socket), com **throttle de 60s por usuário** (protege o banco contra storms de reconnect/refresh).
   - Status recalculado por `recomputeRoom(roomId)` nos pontos canônicos: `room:start`, `gameManager.onGameEnded` (após `status = 'finished'`), `room:join` (rejoin em partida ativa) e `room:leave`.
   - Registro em memória (reinicia no restart do servidor — aceitável no MVP; §8).
4. **Eventos socket novos** (apenas para usuários autenticados — o middleware `io.use` de `index.ts:68-82` já garante):
   - C→S: `presence:list` (sem payload) → resposta `presence:snapshot`.
   - S→C: `presence:snapshot` (lista completa) e `presence:update` (evento único para joined/left/status — payload tagged-union, §5).
5. **`lastSeenAt DateTime?`** no modelo `User` + `npx prisma db push` (a partir de `apps/server`).
6. **Fix regressivo**: remover o fallback `'Jogador'` do `Navbar` no Lobby (restaura o botão "Entrar" para usuários deslogados).
7. Sem mudanças no `RoomManager` (não é necessário método novo: `getRoom()` já é público e `recomputeRoom` só precisa de `room.players`, `room.status`, `room.mode`).

## 4. Passos de implementação

### Passo 1 — Adicionar `onValueChange` ao componente `Tabs`
- **Arquivos**: `apps/web/src/components/ui/Tabs.tsx`
- **O que fazer**: adicionar prop opcional `onValueChange?: (value: string) => void` em `TabsProps` e invocá-la dentro de `setActiveTab` (que hoje é `(id: string) => void` puro, linha 17).
- **Detalhes**: mudança **não quebrada** — todos os usos atuais (`LobbyPage.tsx:112`, `RankingPage.tsx:53`, `CreateRoomPage.tsx:203`, `ProfilePage.tsx:139`, `Styleguide.tsx:449`) seguem funcionando sem a prop. Motivo: `Tabs` é não-controlado e não expõe a tab ativa; sem isso o Lobby não consegue detectar a troca para a tab "ranking" e disparar o fetch (Requisito 1).
- **Como validar este passo**: `npm run typecheck` em `apps/web`; abrir `/lobby` e clicar entre as 3 tabs — nada quebra visualmente (nenhum console.error).

### Passo 2 — Corrigir o `Navbar` do Lobby (botão "Entrar" escondido)
- **Arquivos**: `apps/web/src/pages/LobbyPage.tsx` (linha 49)
- **O que fazer**: remover as props `username`/`avatarUrl` do uso de `<Navbar>` no Lobby, deixando `<Navbar />` (o próprio `Navbar.tsx:14-16` já lê `useAuthStore` e aplica `propUsername || authUser?.username`).
- **Detalhes**: com `username='Jogador'` (fallback truthy), `Navbar.tsx:53` sempre renderiza o avatar e **nunca** o botão "Entrar" para deslogados. Sem a prop, deslogado → `username` undefined → "Entrar" visível (`Navbar.tsx:57-63`); logado → avatar. Motivo: corrigir bug de auth UX latente.
- **Como validar este passo**: deslogado, abrir `/lobby` → botão "Entrar" aparece no topo; logado, o avatar continua aparecendo.

### Passo 3 — Tipos de presence no pacote compartilhado
- **Arquivos**: `packages/shared/src/index.ts`
- **O que fazer**: adicionar, ao final do arquivo, os contratos:

```ts
export type PresenceStatus = 'online' | 'in-game'

export interface PresenceUser {
  userId: string
  username: string
  avatarUrl: string | null
  status: PresenceStatus
  roomId: string | null
  mode: GameMode | null
}

export type PresenceUpdate =
  | { type: 'joined' | 'status'; user: PresenceUser }
  | { type: 'left'; userId: string }
```

- **Detalhes**: `socketIds` é detalhe interno do servidor e **não** sai no wire (privacidade + acoplamento); o client só recebe `PresenceUser`. Motivo: regra do monorepo — tipos idênticos nas duas pontas.
- **Como validar este passo**: `npm run typecheck` em `apps/web` (que consome `@minado/shared` via workspace) e em `apps/server`.

### Passo 4 — Coluna `lastSeenAt` no modelo `User`
- **Arquivos**: `apps/server/prisma/schema.prisma`
- **O que fazer**: adicionar `lastSeenAt DateTime?` ao model `User` (após `avatarUrl`, linha 14).
- **Detalhes**: nullable (usuários antigos ficam sem valor — tratado como "nunca visto"). Aplicar migração a partir de `apps/server`: `npx prisma db push` (padrão do projeto, `CLAUDE.md`) e `npx prisma generate` (gerador `prisma-client` com output em `apps/server/src/generated/prisma`, `schema.prisma:1-4`).
- **Como validar este passo**: rodar os dois comandos sem erro; `npx prisma studio` mostra a coluna `lastSeenAt` na tabela `User`; `npm run typecheck` em `apps/server`.

### Passo 5 — Criar o `PresenceManager` (novo módulo do servidor)
- **Arquivos**: `apps/server/src/presence/PresenceManager.ts` (novo)
- **O que fazer**: implementar a classe (API completa em §5). Esqueleto:

```ts
import type { Server, Socket } from 'socket.io'
import type { PresenceStatus, PresenceUser, PresenceUpdate, GameMode } from '@minado/shared'
import type { RoomManager } from '../rooms/RoomManager.js'
import { prisma } from '../db/prisma.js'

const LAST_SEEN_THROTTLE_MS = 60_000

interface PresenceEntry extends PresenceUser {
  socketIds: string[]
}

export class PresenceManager {
  private entries = new Map<string, PresenceEntry>()
  private lastSeenWrites = new Map<string, number>()
  private io: Server | null = null
  private roomManager: RoomManager | null = null
  onLastSeenUpdate?: (userId: string) => void

  bind(io: Server, roomManager: RoomManager): void { ... }

  register(socket: Socket): void {
    const userId = (socket as any).userId
    if (!userId) return
    const existing = this.entries.get(userId)
    if (existing) { existing.socketIds.push(socket.id); return }
    const entry: PresenceEntry = {
      userId, username: (socket as any).username || 'Jogador',
      avatarUrl: null, status: 'online', roomId: null, mode: null, socketIds: [socket.id],
    }
    this.entries.set(userId, entry)
    prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } })
      .then((u) => { if (u) { entry.avatarUrl = u.avatarUrl; this.broadcast({ type: 'joined', user: this.publicView(entry) }) } })
      .catch(() => { this.broadcast({ type: 'joined', user: this.publicView(entry) }) })
  }

  unregister(socket: Socket): void {
    const userId = (socket as any).userId
    const entry = this.entries.get(userId)
    if (!entry) return
    entry.socketIds = entry.socketIds.filter((id) => id !== socket.id)
    if (entry.socketIds.length > 0) return
    this.entries.delete(userId)
    this.broadcast({ type: 'left', userId })
    const last = this.lastSeenWrites.get(userId) || 0
    if (Date.now() - last >= LAST_SEEN_THROTTLE_MS) {
      this.lastSeenWrites.set(userId, Date.now())
      this.onLastSeenUpdate?.(userId)
    }
  }

  recomputeRoom(roomId: string): void {
    const room = this.roomManager?.getRoom(roomId)
    if (!room) return
    const inGame = room.status === 'playing'
    for (const p of room.players) {
      const entry = this.entries.get(p.id)
      if (!entry) continue
      const status: PresenceStatus = inGame ? 'in-game' : 'online'
      const next: PresenceEntry = {
        ...entry,
        status,
        roomId: inGame ? room.id : null,
        mode: inGame ? room.mode as GameMode : null,
      }
      if (next.status !== entry.status || next.roomId !== entry.roomId) {
        this.entries.set(p.id, next)
        this.broadcast({ type: 'status', user: this.publicView(next) })
      }
    }
  }

  getSnapshot(): PresenceUser[] {
    return [...this.entries.values()]
      .sort((a, b) => a.username.localeCompare(b.username))
      .map((e) => this.publicView(e))
  }

  private publicView(e: PresenceEntry): PresenceUser {
    const { socketIds: _drop, ...user } = e
    return user
  }

  private broadcast(payload: PresenceUpdate): void {
    this.io?.emit('presence:update', payload)
  }
}
```

- **Detalhes**:
  - `register` é fire-and-forget para `avatarUrl` (1 SELECT barato; nunca quebra a conexão).
  - `unregister` só persiste `lastSeenAt` no **último** socket + throttle de 60s (mapa `lastSeenWrites`); a persistência em si é delegada via callback `onLastSeenUpdate` (mantém o módulo desacoplado do Prisma para testes).
  - `recomputeRoom` deriva status a partir de `room.status` — sem estado duplicado de game: se a room vira `'finished'` (ou é deletada, `getRoom` → `undefined`), os jogadores voltam a `online` na próxima recomputação; na prática o broadcast já acontece no hook de `onGameEnded` (Passo 6).
  - Edge case aceito no MVP: jogador eliminado individualmente (`gameHandler.ts:63-73`) permanece na room `'playing'` → continua `in-game` até sair da room ou a partida acabar.
- **Como validar este passo**: `npm run typecheck` em `apps/server`; review do diff (nenhuma mudança em arquivos existentes).

### Passo 6 — Integrar presence no servidor (wiring)
- **Arquivos**: `apps/server/src/index.ts`, `apps/server/src/sockets/roomHandler.ts`, `apps/server/src/sockets/presenceHandler.ts` (novo)
- **O que fazer**:
  1. **`presenceHandler.ts` (novo)**:
     ```ts
     export function setupPresenceHandlers(io: Server, socket: Socket, presenceManager: PresenceManager): void {
       socket.on('presence:list', () => {
         socket.emit('presence:snapshot', presenceManager.getSnapshot())
       })
     }
     ```
  2. **`index.ts`**:
     - `import { PresenceManager } from './presence/PresenceManager.js'`, `import { setupPresenceHandlers } from './sockets/presenceHandler.js'`, `import { prisma } from './db/prisma.js'`.
     - Instanciar `const presenceManager = new PresenceManager()` (junto de `roomManager`, linha 29) e `presenceManager.bind(io, roomManager)`.
     - Em `io.on('connection')` (linha 84): chamar `presenceManager.register(socket)` **antes** de `setupRoomHandlers` (linha 100).
     - No handler `disconnect` (linha 87): chamar `presenceManager.unregister(socket)` **antes** de `roomManager.markPlayerDisconnected` (ordem não interfere na lógica, mas mantém o log de disconnect junto).
     - Em `gameManager.onGameEnded` (linha 31): após `io.to(roomId).emit('room:state', room)` (linha 44), adicionar `presenceManager.recomputeRoom(roomId)`. **Nota**: colocar **depois** do bloco que seta `room.status = 'finished'` (linha 43) — a recomputação precisa ver `'finished'` para marcar os jogadores como `online`.
     - Persistência: `presenceManager.onLastSeenUpdate = (userId) => { prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => {}) }` (nunca derruba o servidor se o DB falhar).
     - Registrar `setupPresenceHandlers(io, socket, presenceManager)` no `io.on('connection')`.
  3. **`roomHandler.ts`**:
     - `setupRoomHandlers(io, socket, roomManager, gameManager, presenceManager)` — novo parâmetro (atualizar a chamada em `index.ts:100`).
     - Em `room:start` (após `roomManager.startGame(room.id)`, linha 215): `presenceManager.recomputeRoom(room.id)` → todos os players viram `in-game`.
     - Em `room:join`: no ramo de **rejoin** (após `io.emit('room:list', ...)`, linha 119) e no ramo de **join novo** (após o `io.emit('room:list', ...)`, linha 153): `presenceManager.recomputeRoom(room.id)` (cobre rejoin em partida ativa; em room `waiting` é no-op).
     - Em `room:leave` (após `io.emit('room:list', ...)`, linha 181): `presenceManager.recomputeRoom(room.id)` — o leaver não está mais em `players`, então precisa de tratamento explícito: `presenceManager.markOnline(userId)`. **Adicionar `markOnline(userId)` à API do manager** (Passo 5): seta `status='online'`, `roomId=null`, `mode=null` e faz broadcast `{ type: 'status', user }` se houve mudança. (Alternativa: `recomputeRoom` para os demais + `markOnline` para o leaver.)
- **Detalhes**: o escopo de autenticação já é garantido pelo `io.use` (`index.ts:68-82`) — nenhum listener roda sem JWT válido. O `roomManager.onPlayerRemoved` (linhas 48–55) não precisa de hook (a room continua `playing`; o removido é coberto por `markOnline` no `room:leave`, e o desconectado por `unregister`).
- **Como validar este passo**: `npm run typecheck` em `apps/server`; subir `npm run dev-server`; dois terminais com `socket.io-client` enviando `presence:list` com tokens JWT reais → recebem `presence:snapshot`; ao desconectar um, o outro recebe `presence:update` com `{ type: 'left' }`.

### Passo 7 — Tab "Ranking Rápido" com dados reais
- **Arquivos**: `apps/web/src/pages/LobbyPage.tsx`, `apps/web/src/components/blocks/Leaderboard.tsx` (opcional, só se quiser highlight do usuário — ver Detalhes)
- **O que fazer**:
  1. Importar `apiFetch` de `@/lib/api` e `Leaderboard` de `@/components/blocks/Leaderboard`. Definir a interface `RankingEntry` (copiar de `RankingPage.tsx:11-19`) e o seletor de períodos:
     ```ts
     const PERIODS = [
       { value: 'global', label: 'Global' },
       { value: 'weekly', label: 'Semanal' },
       { value: 'monthly', label: 'Mensal' },
     ] as const
     type RankingPeriod = (typeof PERIODS)[number]['value']
     ```
  2. Estado local (sem Zustand):
     ```ts
     const [period, setPeriod] = useState<RankingPeriod>('global')
     const [rankingData, setRankingData] = useState<RankingEntry[]>([])
     const [rankingLoading, setRankingLoading] = useState(false)
     const [rankingError, setRankingError] = useState<string | null>(null)
     const fetchRanking = useCallback((p: RankingPeriod) => {
       setRankingLoading(true)
       setRankingError(null)
       apiFetch<RankingEntry[]>(`/users/ranking?period=${p}`)
         .then(setRankingData)
         .catch(() => setRankingError('Não foi possível carregar o ranking'))
         .finally(() => setRankingLoading(false))
     }, [])
     ```
  3. Disparar o fetch **na troca para a tab "ranking"** (Passo 1): `<Tabs defaultValue="salas" onValueChange={(v) => { if (v === 'ranking') fetchRanking(period) }}>`. Trocar período dispara `fetchRanking(p)`.
  4. Substituir o bloco mock (linhas 183–210) por: seletor de período (3 chips no padrão dos filtros existentes, `LobbyPage.tsx:74-102`), e abaixo:
     - `loading` → `<p className="font-heading font-bold text-h5 text-ink-muted">Carregando ranking...</p>`
     - `error` → mensagem de erro + `<Button variant="primary" size="sm" onClick={() => fetchRanking(period)}>Tentar novamente</Button>`
     - `empty` → "Nenhum jogador ainda"
     - sucesso → `<Leaderboard title={`Top 5 · ${PERIODS.find((p) => p.value === period)?.label}`} entries={rankingData.slice(0, 5).map((e) => ({ rank: e.rank, username: e.username, score: e.xp }))} />`
  5. Layout: card único centralizado (`max-w-[600px] mx-auto` ou similar) — o grid de 3 cards (linha 184) some.
- **Detalhes**:
  - `score` = `xp` (o endpoint não tem score de período separado; a SPEC 02 pode mudar o significado por período — mapear sempre `e.xp` mantém esta spec compatível).
  - `Leaderboard.tsx:22` já aplica as 3 variantes de medalha (1=accent, 2=secondary, demais=primary) — **nenhuma mudança necessária** no componente (discrepância com o finding, §8).
  - Oponente ao padrão de `RankingPage.tsx:103` (`toLocaleString()` sem locale): aqui o texto vem de `Leaderboard` (`{entry.score} pts`, linha 27). **Melhorar `Leaderboard.tsx`** para renderizar `entry.score.toLocaleString('pt-BR')` — mudança de 1 linha, afeta também o Styleguide (`Styleguide.tsx:509`). Motivo: consistência de formatação pt-BR.
  - `key`: `Leaderboard` já usa `key={entry.rank}` internamente (`Leaderboard.tsx:21`) — sem `key={i}` restante no Lobby. (Remover o mock também remove as chaves problemáticas de `LobbyPage.tsx:192-198`.)
- **Como validar este passo**: `npm run typecheck` + `npm run lint` em `apps/web`; com 2+ usuários com XP real, abrir `/lobby` → tab "Ranking Rápido" → top 5 real (XP desc, posição correta); trocar período → loading aparece e lista re-fetches; derrubar o servidor (`npm run dev-server` off) → estado de erro com "Tentar novamente" funcional; base de dados vazia → "Nenhum jogador ainda".

### Passo 8 — Tab "Amigos Online" com presence real
- **Arquivos**: `apps/web/src/pages/LobbyPage.tsx`, `apps/web/src/components/ui/Avatar.tsx`
- **O que fazer**:
  1. Importar `getSocket`, `connectSocket`, `onSocketEvent` de `@/lib/socket` e os tipos `PresenceUser`, `PresenceUpdate` de `@minado/shared`.
  2. Estado local:
     ```ts
     const [presence, setPresence] = useState<PresenceUser[]>([])
     const [presenceLoaded, setPresenceLoaded] = useState(false)
     const me = useAuthStore((s) => s.user)
     const MODE_LABELS: Record<GameMode, string> = {
       competitive: 'Competitivo', 'multi-board': 'Vários Tabuleiros',
       cooperative: 'Cooperativo', 'battle-royale': 'Battle Royale', 'fog-of-war': 'Fog of War',
     }
     useEffect(() => {
       const socket = getSocket()
       if (!socket.connected) connectSocket()
       const requestList = () => socket.emit('presence:list')
       requestList()
       const offs = [
         onSocketEvent<PresenceUser[]>('presence:snapshot', (list) => { setPresence(list); setPresenceLoaded(true) }),
         onSocketEvent<PresenceUpdate>('presence:update', (upd) => {
           setPresence((prev) => {
             if (upd.type === 'left') return prev.filter((u) => u.userId !== upd.userId)
             const exists = prev.some((u) => u.userId === upd.user.userId)
             return exists ? prev.map((u) => (u.userId === upd.user.userId ? upd.user : u)) : [...prev, upd.user]
           })
         }),
         onSocketEvent('connect', requestList),
       ]
       return () => offs.forEach((fn) => fn())
     }, [])
     const friends = presence.filter((u) => u.userId !== me?.id)
     ```
  3. Substituir o mock (linhas 152–181) por:
     - `!presenceLoaded` → placeholder "Carregando jogadores online..." (texto small muted).
     - `friends.length === 0` → empty state "Nenhum jogador online agora" (Card centrado, padrão do empty de salas, `LobbyPage.tsx:120-132`).
     - Senão → lista de rows: avatar com iniciais (`name[0]`, mantendo o tamanho 10x10), nome (`font-heading font-bold text-ink truncate`), label de status: `'Em partida: ' + MODE_LABELS[user.mode]` quando `status === 'in-game'`, senão `'No lobby'`; dot verde `bg-success` quando online, `bg-warning`/`bg-accent` quando in-game (ou manter `bg-success` — decisão de estilo; recomenda-se `bg-success` para `online` e `bg-accent` para `in-game` para distinguir partida).
     - **Remover** o bloco do botão "Convidar" (linhas 173–175).
  4. **Contraste dark mode**: no avatar inline (linha 164), trocar `text-white` por `text-white dark:text-neutral-900` (em dark, `--color-secondary-500: #b794ff`, `index.css:176` — texto branco fica ilegível; `neutral-900` (#000000 em dark, `index.css:202`) resolve). Aplicar a **mesma correção** em `apps/web/src/components/ui/Avatar.tsx:39` (`bg-secondary-500 text-white` → `bg-secondary-500 text-white dark:text-neutral-900`) — o componente é usado por Leaderboard, Navbar e RankingPage, e a tab de ranking (Passo 7) herda o problema.
- **Detalhes**:
  - Listener de `'connect'` re-emite `presence:list` (reconnect do socket não perde a lista — mesmo padrão de `roomStore.ts:43-46`).
  - A filtragem do próprio usuário é no client (`me?.id`); o servidor não precisa conhecer o requester.
  - `key={user.userId}` (nunca `key={i}`).
- **Como validar este passo**: `npm run typecheck` + `npm run lint` em `apps/web`; teste manual de 2 browsers (§6.3); alternar tema dark no Lobby → iniciais legíveis.

## 5. Contratos (socket/REST/types)

### 5.1 Tipos compartilhados (`packages/shared/src/index.ts`)

```ts
export type PresenceStatus = 'online' | 'in-game'

export interface PresenceUser {
  userId: string
  username: string
  avatarUrl: string | null
  status: PresenceStatus
  roomId: string | null        // room atual (não-null apenas quando in-game)
  mode: GameMode | null        // modo da partida (não-null apenas quando in-game)
}

export type PresenceUpdate =
  | { type: 'joined' | 'status'; user: PresenceUser }
  | { type: 'left'; userId: string }
```

### 5.2 Eventos socket (novos)

| Evento | Direção | Payload | Descrição |
|---|---|---|---|
| `presence:list` | C → S | — (sem payload) | Requer snapshot; resposta imediata |
| `presence:snapshot` | S → C | `PresenceUser[]` | Lista completa de online (ordenada por username) |
| `presence:update` | S → C | `PresenceUpdate` | Mudança pontual: joined / status / left |

Aplicam-se apenas a sockets autenticados (garantido por `index.ts:68-82`). Sem acks.

### 5.3 API pública do `PresenceManager`

```ts
bind(io: Server, roomManager: RoomManager): void
register(socket: Socket): void
unregister(socket: Socket): void
markOnline(userId: string): void            // adicionado no Passo 6 (room:leave)
recomputeRoom(roomId: string): void
getSnapshot(): PresenceUser[]
onLastSeenUpdate?: (userId: string) => void // callback de persistência (wired no index.ts)
```

Semântica:
- `register`: entrada criada com status `online`; `avatarUrl` hidratado via Prisma (fire-and-forget); broadcast `joined` quando a entry é criada (e após hidratação).
- `unregister`: remove o socketId; se não sobrarem sockets → deleta a entry, broadcast `left` e dispara `onLastSeenUpdate` (throttle 60s/usuário).
- `recomputeRoom`: para cada `player` da room: `in-game` se `room.status === 'playing'`; broadcast `status` apenas em diffs.
- `markOnline`: força `online`/`roomId=null`/`mode=null` com broadcast em diff.

### 5.4 REST

- `GET /api/users/ranking?period=global|weekly|monthly` (route existente `apps/server/src/routes/users.ts:6-20`; o parâmetro é consumido pelo client **nesta spec** e implementado no servidor pela **SPEC 02**; enquanto SPEC 02 não existir, o servidor ignora o query e retorna o ranking global — degradação aceitável).
- Resposta (hoje): `Array<{ rank: number; id: string; username: string; avatarUrl: string | null; xp: number; level: number; stats: { victories: number; matchesPlayed: number } | null }>`.

### 5.5 Prisma

- `model User` ganha `lastSeenAt DateTime?` (não-único, não-indexado — leitura só por `userId`).
- Migração: de `apps/server`, `npx prisma db push && npx prisma generate`.

## 6. Critérios de aceite (checklist testável)

### 6.1 Automação
- [ ] `npm run typecheck` e `npm run lint` em `apps/web` passam.
- [ ] `npm run typecheck` em `apps/server` passa.
- [ ] `npx prisma db push` e `npx prisma generate` (em `apps/server`) sem erros; `prisma studio` mostra `lastSeenAt`.

### 6.2 Ranking Rápido (1 usuário logado, 2+ usuários com XP real no banco)
- [ ] Tab "Ranking Rápido" mostra top 5 real, ordenado por XP desc, com medalhas (1º accent, 2º secondary, demais primary).
- [ ] Scores formatados com milhar pt-BR ("2.847 pts") e **não** aparecem strings pré-formatadas.
- [ ] Trocar período (Global/Semanal/Mensal) refaz o fetch (observável pelo loading).
- [ ] Servidor fora → mensagem de erro + "Tentar novamente" que recupera após subir o servidor.
- [ ] Nenhum jogador no ranking → "Nenhum jogador ainda".
- [ ] `/lobby` e `/ranking` coexistem sem regressão (Tabs com `onValueChange` opcional não quebrou `RankingPage`).

### 6.3 Presence — teste manual 2 browsers (login de 2 usuários)
1. Browser A (user A) e Browser B (user B, janela anônima), ambos em `/lobby`.
2. [ ] Na tab "Amigos Online" de A aparece B (e vice-versa); cada um não aparece para si mesmo.
3. [ ] B fecha a aba → em A, B some **em tempo real** (sem reload).
4. [ ] B reabre o Lobby → volta a aparecer (snapshot).
5. [ ] B entra em uma sala e inicia partida (2 jogadores prontos) → em A, B muda para "Em partida: Competitivo" (live).
6. [ ] A partida termina → em A, B volta a "No lobby" (live).
7. [ ] B desconecta por completo (fecha navegador) → `lastSeenAt` atualizado no banco (consultar via `prisma studio`; repetir 2x rapidamente e conferir que o throttle não estourou o log de escrita).
8. [ ] Botão "Convidar" não existe mais na tab.
9. [ ] Dark mode: iniciais do avatar legíveis (texto escuro sobre roxo claro).
10. [ ] Deslogado, `/lobby` mostra "Entrar" no Navbar (regressão do Passo 2).

## 7. Fora de escopo

- Modelo `Friend` / relação de amizade e convites de amizade.
- Lista de usuários offline ("Visto há Xh/min") — sem relação de amizade, não há lista de offline; `lastSeenAt` é persistido, mas **não exibido** nesta spec (fica disponível para uma futura tela de perfil/amigos).
- UI de amizade, notificações, presença por página (o status é global: online/in-game apenas).
- Implementação server-side do `?period=` no ranking (SPEC 02) e persistência de matches.
- Histórico/persistência de presence (registry em memória; reseta no restart do servidor).
- Badge "VOCÊ" / highlight do próprio usuário no Leaderboard da tab ranking (possível melhoria futura — exigiria prop nova em `Leaderboard.tsx`).

## 8. Riscos e notas

1. **SPEC 02 não existe ainda** (diretório `specs/` vazio — verificado). O client mandará `?period=` antes de o servidor suportar; o Express ignora query params não lidos, então **degrada para global sem erro**. Implementar o servidor do período na SPEC 02; esta spec independe dele para funcionar (tab funciona com dados globais).
2. **Discrepâncias vs. findings recebidos** (verificadas na leitura):
   - `Leaderboard.tsx:22` **já** implementa as 3 variantes de medalha — o passo "fix rank badge variants" não é necessário.
   - `RankingPage.tsx:103` usa `toLocaleString()` **sem** `'pt-BR'` (o finding afirmava o contrário); a formatação pt-BR entra na melhoria do `Leaderboard` (Passo 7).
   - O Styleguide fica em `apps/web/src/pages/Styleguide.tsx` (não em `components/blocks/`).
   - O problema de contraste dark-mode também existe em `ui/Avatar.tsx:39` (componente compartilhado) — coberto no Passo 8 além do avatar inline do Lobby.
3. **Multi-abas do mesmo usuário**: `socketIds[]` deduplica; a entry só some quando o último socket cai. `lastSeenAt` correto nesse cenário.
4. **Reconnect durante partida**: ao reconectar, `register` marca `online` por um instante até o rejoin (`room:join` → `recomputeRoom` → `in-game`). Flash aceitável no MVP.
5. **Jogador eliminado individualmente** (`gameHandler.ts:63-73`) continua na room `'playing'` → aparece `in-game` até sair/partida acabar. Comportamento documentado e aceito.
6. **Caminho `'eliminated'` do `onGameEnded`** (`index.ts:32`) é morto hoje (nenhum reason `'eliminated'` é gerado — `GameManager.ts:203,223` usam `'last_standing'|'win'|'complete'|'timeout'`). Se no futuro o reason voltar a existir, a recomputação de presence estará **após** o early-return e não rodará — revisitar se o dead path for reativado.
7. **Registry em memória**: restart do servidor limpa presence (snapshot vazio até os clients reconectarem e se registrarem) — aceitável no MVP; nota de produto para um futuro `PresenceStore` (Redis).
8. **Escrita `lastSeenAt`**: falha de DB é silenciada com `.catch()` — nunca derruba o servidor; throttle de 60s limita carga.
9. **Mudança em `Tabs.tsx` e `Avatar.tsx`**: componentes compartilhados; mudanças são backward-compatible (prop opcional / classe extra `dark:`), mas validar visualmente `CreateRoomPage`, `ProfilePage`, `Styleguide` e `RankingPage` após os passos 1 e 8.
10. **Escopo do lint**: os scripts raiz `npm run lint`/`npm run typecheck` rodam **apenas** em `apps/web` (`package.json:12-13`); o servidor usa `npm run typecheck` a partir de `apps/server`.
