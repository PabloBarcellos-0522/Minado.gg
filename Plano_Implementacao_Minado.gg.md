# Plano de Implementação — Minado.gg (ATUALIZADO)

> ⚠️ **Revisado em 25/07/2026.** Frontend ~95% completo. Stores Zustand criadas. Servidor com Socket.IO esboçado. **Gargalo: DB + Auth real + sincronia stores/socket.**

---

## 1. Estado atual do projeto (REAL)

| Item                                                                             | Status |
| -------------------------------------------------------------------------------- | ------ |
| Monorepo (npm workspaces: `apps/web`, `apps/server`, `packages/shared`)          | ✅ OK |
| Design tokens + CSS (Tailwind 4 com `@theme`)                                    | ✅ OK |
| Componentes atômicos React (Button, Input, Badge, Avatar, Modal, Tabs, etc.)     | ✅ **10 prontos** |
| Blocos compostos (Navbar, RoomCard, ChatPanel, Leaderboard, ProfileCard, etc.)   | ✅ **8 prontos** |
| Componentes de jogo (Board, Cell, Mascote, Banner, PingRow, FxBoom, FxConfetti)  | ✅ **7 prontos** |
| Páginas React Router (12 rotas)                                                  | ✅ **12 prontas** |
| Lógica de jogo (`packages/shared`)                                               | ✅ **Pronta** |
| Tema claro/escuro                                                                | ✅ OK |
| **Zustand stores** (auth, room, game)                                            | ✅ **Criadas** (com fallback mock) |
| **Servidor Express + Socket.IO** (handlers de sala/jogo)                         | ✅ **Esboçado** (RoomManager, roomHandler, gameHandler) |
| **Páginas integradas com stores** (Navbar, Login, Lobby, Sala, Partida, Resultado)| ✅ **Integradas** |
| **`src/styles/` legado na raiz**                                                 | ✅ **Removido** |
| **Auth real** (JWT + OAuth Google/Discord/GitHub)                                | ❌ Só mock na store |
| **Banco de dados** (Postgres + Prisma)                                           | ❌ Não configurado |
| **GameManager server-side** (boards autoritativos, score real)                   | ❌ Síncrono parcial no gameHandler |
| **Store ↔ Socket sync** (eventos reais substituindo mocks)                       | ❌ Stores usam fallback mock quando socket desconectado |

**Conclusão:** frontend ~95%, servidor esboçado. Próximo ciclo é **infra + backend**: Prisma → Auth → sincronia stores/socket.

---

## 2. Stack (confirmada)

- **Frontend:** React 19 + TypeScript + Vite 6 + Tailwind 4 + React Router 7
- **Estado global:** Zustand 5
- **Realtime:** Socket.IO (cliente + servidor)
- **Backend:** Node.js + Express + Socket.IO
- **Banco de dados:** PostgreSQL (via Prisma ORM)
- **Auth:** JWT (local) + OAuth (Google, Discord, GitHub) via Passport.js
- **Hospedagem:** Vercel (frontend) + Railway/Render (servidor) + Supabase/Neon (Postgres)

---

## 3. Estrutura de pastas (atual)

```
Minado.gg/
├── apps/
│   ├── web/                          # Frontend React
│   │   ├── src/
│   │   │   ├── pages/                # 12 páginas
│   │   │   ├── components/
│   │   │   │   ├── ui/               # 10 atômicos
│   │   │   │   ├── blocks/           # 8 blocos
│   │   │   │   └── game/             # 7 componentes de jogo
│   │   │   ├── store/                # Zustand — auth, room, game
│   │   │   ├── lib/                  # socket.ts (cliente Socket.IO)
│   │   │   └── styles/               # index.css com Tailwind 4 @theme
│   │   └── index.html
│   └── server/                       # Backend Express + Socket.IO
│       ├── src/
│       │   ├── sockets/              # Handlers: roomHandler, gameHandler
│       │   ├── game/                 # GameManager (boards server-side)
│       │   ├── routes/               # REST: auth, profile, ranking
│       │   ├── middleware/           # JWT middleware
│       │   ├── db/                   # Prisma schema + client
│       │   └── rooms/               # RoomManager
│       ├── prisma/                   # Prisma schema
│       ├── package.json
│       └── tsconfig.json
└── packages/
    └── shared/                       # Tipos e funções puras
```

---

## 4. Páginas e rotas (TODAS IMPLEMENTADAS)

| Rota                     | Página                           | Status |
| ------------------------ | -------------------------------- | ------ |
| `/`                      | Home / Landing                    | ✅ |
| `/login`                 | Login (com cadastro)              | ✅ |
| `/lobby`                 | Lobby com filtros, Tabs, salas    | ✅ |
| `/lobby/criar-sala`      | Criar sala (form completo)        | ✅ |
| `/sala/:id`              | Sala de espera + roster + chat    | ✅ |
| `/partida/:id`           | Partida (Board + timer + FX)      | ✅ |
| `/partida/:id/resultado` | Resultado + scoreboard + histórico | ✅ |
| `/ranking`               | Ranking (Global/Semanal/Mensal)   | ✅ |
| `/perfil/:username`      | Perfil do jogador                 | ✅ |
| `/perfil/editar`         | Configurações de conta            | ✅ |
| `/styleguide`            | Design system showcase            | ✅ |
| `*`                      | 404                               | ✅ |

---

## 5. Componentes React — já extraídos

**Atômicos (`src/components/ui`)** — 10 componentes: Button, Input, Badge, Avatar, Card, Tabs, Modal, Progress, Skeleton, Alert.

**Blocos (`src/components/blocks`)** — 8 blocos: Navbar, RoomCard, Leaderboard, ProfileCard, MatchCard, ChatPanel, PlayerRoster, GameModeCard.

**Jogo (`src/components/game`)** — 7 componentes: Board, Cell, Mascote, Banner, PingRow, FxBoom, FxConfetti.

---

## 6. Lógica de jogo — implementada em `packages/shared`

### 6.1 Núcleo do Campo Minado ✅

- `generateBoard(rows, cols, mines, safeRow?, safeCol?)` — geração segura (1º clique nunca mina)
- `floodFill(board, row, col)` — revelar área vazia (DFS)
- `checkWin(board)` — todas as células sem mina reveladas
- `calculateScore(action)` — pontuação por ação

### 6.2 Lógica específica multiplayer (pendente de implementação no servidor)

**Competitivo (mesmo tabuleiro):**
- Todos recebem mesmo tabuleiro gerado no servidor
- Célula revelada guarda `revealedBy: playerId` → cor do jogador
- Pontuação calculada no servidor a cada jogada
- Ao explodir: penalidade, mas continua
- Fim: tabuleiro 100% revelado ou tempo esgotado

**Vários tabuleiros (corrida):**
- Cada jogador com tabuleiro independente (mesma seed de dificuldade)
- Explodir → penalidade de tempo (3-5s congelado)
- Vitória: primeiro a limpar o próprio tabuleiro

**Cooperativo:**
- Tabuleiro compartilhado, qualquer um pode clicar
- Contador de erros compartilhado
- Dificuldade aumenta por fase/rodada

**Battle Royale:**
- Muitos jogadores, tabuleiros menores por rodada
- Ao explodir → eliminado (vira espectador)
- Servidor reduz tamanho / aumenta densidade a cada rodada
- Último não eliminado vence

**Fog of War:**
- Cada jogador tem janela de visão (raio N ao redor do último clique)
- Células fora da visão aparecem como neblina
- Servidor envia visões parciais diferentes para cada socket

### 6.3 Lógica de sala ✅ (parcial)

- Criar sala: gera `roomId` curto ✅ (RoomManager + roomHandler)
- Entrar/sair de sala ✅
- Ready/Start ✅ (validação server-side)
- Reconexão: manter slot por X segundos 🔴 pendente

### 6.4 Anti-trapaça 🔴 pendente

- Nunca enviar posição das minas ao cliente
- Validar toda jogada no servidor
- Rate limit de eventos socket por jogador
- Fog of War: mandar apenas recorte visível

---

## 7. Sistema de pontuação (implementado em `packages/shared`)

| Ação                      | Pontos |
| ------------------------- | ------ |
| Abrir casa segura         | +10    |
| Área grande (flood fill)  | +30    |
| Marcar bomba corretamente | +25    |
| Marcar bomba errada       | −15    |
| Explodir                  | −50    |
| Vitória                   | +200   |

---

## 8. Modelo de dados (Postgres, via Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  email     String   @unique
  avatarUrl String?
  password  String?                     // null para OAuth-only
  xp        Int      @default(0)
  level     Int      @default(1)
  createdAt DateTime @default(now())

  accounts      Account[]
  matches       MatchPlayer[]
  stats         Stats?
  achievements  UserAchievement[]
}

model Account {
  id              String  @id @default(cuid())
  userId          String
  provider        String  // "google" | "discord" | "github"
  providerId      String  // id do usuário no provider
  accessToken     String?
  refreshToken    String?

  user User @relation(fields: [userId], references: [id])

  @@unique([provider, providerId])
}

model Stats {
  id            String @id @default(cuid())
  userId        String @unique
  victories     Int    @default(0)
  defeats       Int    @default(0)
  matchesPlayed Int    @default(0)
  currentStreak Int    @default(0)
  maxStreak     Int    @default(0)
  rank          Int    @default(0)

  user User @relation(fields: [userId], references: [id])
}

model Match {
  id         String   @id @default(cuid())
  mode       String   // GameMode
  boardRows  Int
  boardCols  Int
  mineCount  Int
  status     String   // "playing" | "finished"
  startedAt  DateTime @default(now())
  endedAt    DateTime?

  players MatchPlayer[]
}

model MatchPlayer {
  id        String @id @default(cuid())
  matchId   String
  userId    String
  score     Int    @default(0)
  exploded  Boolean @default(false)
  rank      Int?
  actions   Json?  // log de ações

  match Match @relation(fields: [matchId], references: [id])
  user  User  @relation(fields: [userId], references: [id])

  @@unique([matchId, userId])
}

model Achievement {
  id          String @id @default(cuid())
  title       String
  description String
  condition   String // JSON com condição
}

model UserAchievement {
  userId        String
  achievementId String
  unlockedAt    DateTime @default(now())

  user        User        @relation(fields: [userId], references: [id])
  achievement Achievement @relation(fields: [achievementId], references: [id])

  @@id([userId, achievementId])
}
```

> Estado **efêmero** de partidas em andamento (tabuleiros, células reveladas, timers) fica em **memória** (GameManager), não no Postgres. Só persiste o resumo final para ranking/histórico.

---

## 9. Eventos Socket.IO — contrato

**Cliente → Servidor**

- `room:join` `{ roomId }`
- `room:leave`
- `room:ready` `{ ready: boolean }`
- `room:start` (host)
- `game:reveal` `{ cellId }`
- `game:flag` `{ cellId }`
- `game:ping` `{ type: 'haha'|'oops'|'gg'|'heart' }`
- `chat:message` `{ text }`

**Servidor → Cliente**

- `room:list` (salas públicas)
- `room:state` (snapshot completo da sala)
- `room:playerJoined` / `room:playerLeft`
- `game:started` `{ boardMeta }` — só linhas/colunas/minas, nunca posições
- `game:cellRevealed` `{ cellId, value, revealedBy }` (ou batch para flood fill)
- `game:cellFlagged` `{ cellId, playerId, flagged }`
- `game:scoreUpdate` `{ playerId, delta, total }`
- `game:playerEliminated` `{ playerId }`
- `game:ended` `{ result, scoreboard }`
- `chat:message` `{ from, text, ts }`
- `error` `{ code, message }`

---

## 10. Roadmap

**Fase 0 — Fundação ✅ COMPLETA**

Setup monorepo, Tailwind 4, roteador, componentes, páginas, lógica de jogo em `packages/shared`.

**Fase 1 — Jogo single-player ✅ COMPLETA**

Board, Cell, flood fill, geração segura, scoring, timer, vitória/derrota, FX.

**Fase 2 — Backend + multiplayer 🟡 EM ANDAMENTO**

| Sub-fase | Status |
|----------|--------|
| 2.1 Stores Zustand (auth, room, game) | ✅ Concluído |
| 2.2 Servidor Express + Socket.IO + handlers | ✅ Concluído |
| 2.3 Páginas integradas com stores | ✅ Concluído |
| 2.4 Limpeza `src/styles/` legado | ✅ Concluído |
| 2.5 **Banco de dados (Postgres + Prisma)** | 🔴 **Pendente** |
| 2.6 **Auth real (JWT + OAuth)** | 🔴 **Pendente** |
| 2.7 **Sincronia stores ↔ socket real** | 🔴 **Pendente** |

**Fase 3 — Mais modos (após Fase 2)**

- Vários tabuleiros (corrida)
- Cooperativo (erros compartilhados, fases)
- Battle Royale (eliminação, rodadas)
- Fog of War (visão parcial)

**Fase 4 — Social e retenção**

- Ranking global/semanal/mensal, perfil, conquistas, missões
- Chat completo + pings, convites por link
- Replay de partidas, histórico
- Personalização (bandeiras, cursor, tema)

**Fase 5 — Polimento**

- Anti-trapaça (rate limit, validação server-side)
- Performance (lazy loading, otimizar Board)
- Acessibilidade (`prefers-reduced-motion`, contraste, teclado)
- Testes unitários da lógica de jogo

---

## 11. Próximos passos imediatos

1. ✅ Setup monorepo
2. ✅ App Vite
3. ✅ Lógica de jogo (`packages/shared`)
4. ✅ Componentes React (30+)
5. ✅ Páginas (12 rotas)
6. ✅ Stores Zustand (auth, room, game)
7. ✅ Servidor Express + Socket.IO
8. ✅ Páginas integradas com stores
9. ✅ Limpeza `src/styles/` legado
10. 🔴 **Prisma: instalar, schema, migrate**
11. 🔴 **Auth: rotas REST (register, login, oauth) + middleware JWT**
12. 🔴 **Frontend: authStore → chamadas HTTP reais + socket com token**
13. 🔴 **Server: GameManager (boards server-side autoritativos)**
14. 🔴 **Stores: roomStore + gameStore sincronizadas com socket real**
