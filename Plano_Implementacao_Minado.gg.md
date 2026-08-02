# Plano de Implementação — Minado.gg (ATUALIZADO)

> ⚠️ **Revisado em 25/07/2026.** Frontend ~95% completo. Backend (Express + Socket.IO + Prisma + JWT + OAuth) **completo**. Banco Postgres **ao vivo no Neon**. Stores sincronizadas com socket real.

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
| **Zustand stores** (auth, room, game)                                            | ✅ **Criadas** + socket listeners |
| **Servidor Express + Socket.IO** (handlers de sala/jogo)                         | ✅ **Completo** (RoomManager, GameManager) |
| **Páginas integradas com stores** (Navbar, Login, Lobby, Sala, Partida, Resultado)| ✅ **Integradas** |
| **`src/styles/` legado na raiz**                                                 | ✅ **Removido** |
| **Auth real** (JWT + OAuth Google/Discord/GitHub)                                | ✅ **Rotas REST + middleware + socket auth** |
| **Banco de dados** (Postgres + Prisma)                                           | ✅ **Schema criado + Neon ativo** |
| **GameManager server-side** (boards autoritativos, score real)                   | ✅ **Criado** |
| **Store ↔ Socket sync** (eventos reais substituindo mocks)                       | ✅ **Implementado** (fallback mock ainda existe para dev offline) |

**Conclusão:** Fase 2 completa. Próximos passos: testes integrados, modos multiplayer avançados (Fase 3), e features sociais (Fase 4).

---

## 2. Stack (confirmada)

- **Frontend:** React 19 + TypeScript + Vite 6 + Tailwind 4 + React Router 7
- **Estado global:** Zustand 5
- **Realtime:** Socket.IO (cliente + servidor)
- **Backend:** Node.js + Express + Socket.IO
- **Banco de dados:** PostgreSQL (via Prisma ORM) — **Neon (Serverless)**
- **Auth:** JWT (local) + OAuth (Google, Discord, GitHub)
- **Hospedagem:** Vercel (frontend) + Railway/Render (servidor) + Neon (Postgres)

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
│   │   │   ├── lib/                  # socket.ts + api.ts
│   │   │   └── styles/               # index.css com Tailwind 4 @theme
│   │   └── index.html
│   └── server/                       # Backend Express + Socket.IO
│       ├── src/
│       │   ├── sockets/              # Handlers: roomHandler, gameHandler
│       │   ├── game/                 # GameManager (boards server-side)
│       │   ├── routes/               # REST: auth, profile, ranking, oauth
│       │   ├── middleware/           # JWT middleware
│       │   ├── db/                   # Prisma client singleton
│       │   ├── generated/prisma/     # Prisma Client (gerado)
│       │   └── rooms/               # RoomManager
│       ├── prisma/                   # Schema Prisma
│       ├── prisma.config.ts
│       ├── .env                      # DATABASE_URL (Neon)
│       ├── package.json
│       └── tsconfig.json
└── packages/
    └── shared/                       # Tipos + funções puras
```

---

## 4. Páginas e rotas (TODAS IMPLEMENTADAS)

| Rota                     | Página                           | Status |
| ------------------------ | -------------------------------- | ------ |
| `/`                      | Home / Landing                    | ✅ |
| `/login`                 | Login (com cadastro + OAuth)      | ✅ |
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

## 5. Componentes React

**Atômicos (10):** Button, Input, Badge, Avatar, Card, Tabs, Modal, Progress, Skeleton, Alert.
**Blocos (8):** Navbar, RoomCard, Leaderboard, ProfileCard, MatchCard, ChatPanel, PlayerRoster, GameModeCard.
**Jogo (7):** Board, Cell, Mascote, Banner, PingRow, FxBoom, FxConfetti.

---

## 6. Lógica de jogo

### 6.1 Núcleo ✅
- `generateBoard`, `floodFill`, `checkWin`, `calculateScore` em `packages/shared`

### 6.2 Multiplayer — arquitetura ✅
- **Competitivo:** servidor gera board, valida cada jogada, pontua, detecta win/lose
- **Vários tabuleiros (corrida):** pendente de implementação
- **Cooperativo:** pendente
- **Battle Royale:** pendente
- **Fog of War:** pendente (mais complexo — visão parcial por socket)

### 6.3 Sala ✅
- CRUD completo via Socket.IO (RoomManager + roomHandler)
- Ready/Start com validação server-side (mín 2 jogadores, todos prontos)

### 6.4 Anti-trapaça ✅ (parcial)
- Mina nunca enviada antes de revelada ✅
- Jogada validada no servidor ✅
- Rate limit: pendente
- Fog of War: pendente

---

## 7. Sistema de pontuação

| Ação                      | Pontos |
| ------------------------- | ------ |
| Abrir casa segura         | +10    |
| Área grande (flood fill)  | +30    |
| Marcar bomba corretamente | +25    |
| Marcar bomba errada       | −15    |
| Explodir                  | −50    |
| Vitória                   | +200   |

Função `calculateScore()` em `packages/shared`, usada pelo GameManager (servidor).

---

## 8. Modelo de dados (Postgres — Neon + Prisma)

```prisma
// 7 models: User, Account (OAuth), Stats, Match, MatchPlayer, Achievement, UserAchievement
// Schema completo em apps/server/prisma/schema.prisma
// Banco ativo no Neon via Prisma db push
```

---

## 9. Eventos Socket.IO — contrato

**Cliente → Servidor:** `room:create`, `room:join`, `room:leave`, `room:ready`, `room:start`, `room:list`, `game:reveal`, `game:flag`, `chat:message`

**Servidor → Cliente:** `room:list`, `room:state`, `room:playerJoined`, `room:playerLeft`, `game:started`, `game:cellRevealed`, `game:cellFlagged`, `game:scoreUpdate`, `game:playerBoardComplete`, `game:playerEliminated`, `game:ended`, `chat:message`, `error`

---

## 10. Roadmap

**Fase 0 — Fundação ✅**
**Fase 1 — Jogo single-player ✅**
**Fase 2 — Backend + multiplayer ✅ COMPLETA**

| Sub-fase | Status |
|----------|--------|
| 2.1 Stores Zustand | ✅ |
| 2.2 Servidor Express + Socket.IO + handlers | ✅ |
| 2.3 Páginas integradas com stores | ✅ |
| 2.4 Limpeza `src/styles/` legado | ✅ |
| 2.5 Banco de dados (Postgres + Prisma) | ✅ **Neon ativo** |
| 2.6 Auth real (JWT + OAuth) | ✅ |
| 2.7 Sincronia stores ↔ socket real | ✅ |

**Fase 3 — Mais modos**
- Vários tabuleiros (corrida)
- Cooperativo (erros compartilhados, fases)
- Battle Royale (eliminação, rodadas)
- Fog of War (visão parcial)

**Fase 4 — Social e retenção**
- Ranking, perfil, conquistas, missões diárias
- Chat completo + pings, convites por link
- Replay de partidas, histórico
- Personalização (bandeiras, cursor, tema)

**Fase 5 — Polimento**
- Anti-trapaça (rate limit)
- Performance (lazy loading, otimizar Board)
- Acessibilidade (`prefers-reduced-motion`, contraste, teclado)
- Testes unitários

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
10. ✅ **Prisma: schema, generate, db push (Neon)**
11. ✅ **Auth: JWT + OAuth + middleware**
12. ✅ **Frontend: authStore real + socket com token**
13. ✅ **Server: GameManager autoritativo**
14. ✅ **Stores sincronizadas com socket**
15. 🔹 **Testar login/registro reais**
16. 🔹 **Implementar modos: corrida, coop, BR, FoW**
17. 🔹 **Ranking + histórico (persistir Match/MatchPlayer)**
