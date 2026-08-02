# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Minado.gg** — Multiplayer Minesweeper built as a real-time social game with 5 distinct game modes. Built on React 19 + Node.js + Socket.IO with authoritative server-side game logic.

## Architecture

```
Minado.gg/
├── apps/
│   ├── web/                    # React frontend (Vite 6)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/         # 10 atomic components (Button, Input, Card, Modal, Tabs, Badge, Avatar, Alert, Switch, Progress/Skeleton)
│   │   │   │   ├── blocks/     # 8 composite blocks (Navbar, RoomCard, ChatPanel, Leaderboard, ProfileCard, MatchCard, PlayerRoster, GameModeCard)
│   │   │   │   └── game/       # 7 game-specific components (Board, Cell, Mascote, Banner, PingRow, FxBoom, FxConfetti)
│   │   │   ├── pages/          # 12 route pages
│   │   │   ├── store/          # Zustand stores (auth, room, game)
│   │   │   ├── lib/            # socket.ts, api.ts
│   │   │   └── styles/         # index.css with Tailwind 4 @theme (design tokens)
│   │   └── index.html
│   └── server/                 # Node.js backend (Express 5 + Socket.IO)
│       ├── src/
│       │   ├── sockets/        # roomHandler.ts, gameHandler.ts
│       │   ├── game/           # GameManager.ts (authoritative boards, scoring)
│       │   ├── routes/         # REST: auth.ts, oauth.ts, users.ts
│       │   ├── middleware/     # auth.ts (JWT verification)
│       │   ├── db/             # prisma.ts (singleton)
│       │   ├── generated/prisma/  # Prisma Client
│       │   └── rooms/          # RoomManager.ts
│       ├── prisma/             # schema.prisma
│       └── package.json
└── packages/
    └── shared/                 # Shared types, constants, pure game functions
        └── src/index.ts
```

## Key Technical Decisions

- **Monorepo**: npm workspaces (`apps/*`, `packages/*`)
- **Game logic runs authoritatively on server** — client never knows mine positions
- **`packages/shared`** ensures identical types/contracts on both ends
- **Zustand 5** for client state with socket synchronization
- **Socket.IO** for real-time communication (rooms, game actions, chat)
- **PostgreSQL (Neon) + Prisma** for persistence
- **JWT + OAuth** (Google, Discord, GitHub) for authentication

## Common Commands

From repository root:

```bash
# Development
npm run dev              # Start web dev server (Vite on :3000)
npm run dev-server       # Start server dev server (tsx watch on :3001)

# Build & Quality
npm run build            # Type-check + Vite production build (web)
npm run typecheck        # TypeScript compiler checks (web)
npm run lint             # ESLint (web)

# Server-specific (run from apps/server)
npm run dev              # tsx watch src/index.ts
npm run build            # tsc
npm run typecheck        # tsc --noEmit
npm run start            # node dist/index.js

# Database (from apps/server)
npx prisma generate      # Generate Prisma Client
npx prisma db push       # Push schema to Neon
npx prisma studio        # Open Prisma Studio
```

## Design System

Complete custom design system defined in `apps/web/src/index.css` using Tailwind 4 `@theme`:

- **Colors**: Primary (green/verde campo), Secondary (purple), Accent (gold), Neutral (slate) + semantic variants
- **Typography**: Baloo 2 (headings, weight 700/800) + Comic Neue (body, weight 400)
- **Spacing**: 4px base unit, tokens 1–24
- **Radius**: sm(8px), md(14px), lg(22px), xl(30px), full(999px)
- **Shadows**: sm, md, lg
- **Motion**: duration-fast(140ms), base(220ms), slow(420ms); ease-bounce, ease-standard
- **Dark mode**: class-based on `<html>` with inverted brand scales

Component reference in `DESIGN.md` — use token references (`{colors.primary-500}`, `{rounded.full}`) not raw values.

## Game Modes (from `packages/shared/src/index.ts`)

| Mode | Type |
|------|------|
| Competitive | Same board, race for score |
| Multi-board (Race) | Own board each, first to clear |
| Cooperative | Shared board, shared lives |
| Battle Royale | Shrinking boards, elimination |
| Fog of War | Limited vision radius |

## Socket.IO Events

**Client → Server**: `room:create`, `room:join`, `room:leave`, `room:ready`, `room:start`, `room:list`, `game:reveal`, `game:flag`, `chat:message`

**Server → Client**: `room:created`, `room:list`, `room:state`, `room:playerJoined`, `room:playerLeft`, `game:started`, `game:cellRevealed`, `game:cellFlagged`, `game:scoreUpdate`, `game:playerBoardComplete`, `game:playerEliminated`, `game:playerRemoved`, `game:removedForInactivity`, `game:ended`, `chat:message`, `error`

### game:cellRevealed shapes (3 variants)
1. **Single cell**: `{ cellId: string, value: number, revealedBy: string }`
2. **Batch (flood-fill)**: `{ batch: Array<{ cellId: string, value: number, revealedBy: string }> }`
3. **Explosion**: `{ cellId: string, value: 'mine', revealedBy: string, exploded: true, teamLives?: number }`

### game:started payload notes
- Includes `teamLives` (number) for cooperative mode
- `players` array shape (rejoin sends same shape as initial): `room.players.map(p => ({ id, username, avatarUrl, isReady, isHost, isConnected, score: gameState.scores.get(p.id)?.score ?? 0 }))` — `isEligible` removed (unused)

### game:ended 'eliminated' behavior
- Emitted ONLY to the eliminated player's socket (see `gameHandler.ts:78-85`)
- Other players continue playing; they do NOT receive `game:ended` for this reason
- Broadcast `game:ended` (see `index.ts:31-46`) only for other reasons: `'win'`, `'timeout'`, `'complete'`, `'last_standing'`, `'lose'`
- `game:ended` payload includes `actions?: MatchPlayerAction[]` (for match persistence)

## Database Models (Prisma)

- `User` — accounts, stats, matches, achievements
- `Account` — OAuth providers
- `Stats` — victories, defeats, streak, rank
- `Match` — mode, board config, status, timestamps
- `MatchPlayer` — score, exploded, rank, actions (JSON)
- `Achievement` / `UserAchievement` — unlockable achievements

## Environment Variables

**Server** (`apps/server/.env`):
```
DATABASE_URL=postgresql://... (Neon)
JWT_SECRET=...
CLIENT_ORIGIN=http://localhost:3000
PORT=3001
# OAuth credentials
GOOGLE_CLIENT_ID/SECRET
DISCORD_CLIENT_ID/SECRET
GITHUB_CLIENT_ID/SECRET
```

**Web** (`apps/web/.env`):
```
VITE_SERVER_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

## Development Notes

- **Ports**: Web on 3000 (Vite), Server on 3001 (Express + Socket.IO)
- **CORS**: Server allows `CLIENT_ORIGIN` with credentials
- **Auth**: Socket connections require JWT in `handshake.auth.token`
- **Board cells**: 44×44px with 3D pop shadow (`0 3px 0 primary-500`)
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` disables all animations

## Current Status (per Plano_Implementacao_Minado.gg.md)

- ✅ Phases 0–2 complete: monorepo, UI, shared logic, 12 pages, Zustand stores, Express+Socket.IO server, Prisma+Neon, JWT+OAuth, socket auth, authoritative GameManager, store↔socket sync
- 🔹 Next: test real auth flow, implement remaining 4 game modes, persist matches, ranking/history

## Files to Reference

- `DESIGN.md` — Complete design system specification
- `Plano_Implementacao_Minado.gg.md` — Implementation roadmap and current status
- `packages/shared/src/index.ts` — Shared types, game logic (generateBoard, floodFill, scoring, win check)
- `apps/server/src/game/GameManager.ts` — Authoritative server game logic
- `apps/server/src/rooms/RoomManager.ts` — Room lifecycle management
- `apps/web/src/store/*.ts` — Zustand stores (auth, room, game)
- `apps/web/src/lib/socket.ts` — Socket.IO client setup with auth