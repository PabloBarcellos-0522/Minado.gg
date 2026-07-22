# Minado.gg

Multiplayer Minesweeper — compete, cooperate, and clear the board together.

Minado.gg reimagines the classic Minesweeper as a real-time multiplayer experience with 5 distinct game modes, built on a modern React + Node.js + Socket.IO stack.

## Game Modes

| Mode | Description |
|------|-------------|
| **Competitive** | Same board, same mines — players race to reveal cells and flag bombs for the highest score. Each revealed cell is colored by the player who opened it. |
| **Race** | Each player gets their own board with the same difficulty. First to clear wins. Exploding incurs a time penalty. |
| **Cooperative** | One shared board, one shared life counter. Work together using chat and pings to clear the board without hitting a mine. |
| **Battle Royale** | Large lobbies, shrinking boards. Explode = eliminated. Last player standing wins. |
| **Fog of War** | Each player sees only a limited radius around their cursor. Cooperation is essential — one mistake ends the game for everyone. |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS 4 + custom CSS design tokens |
| State | Zustand |
| Backend | Node.js + Express + Socket.IO |
| Database | PostgreSQL + Redis |
| Auth | OAuth (Google, Discord, GitHub) + email/password |
| Monorepo | npm workspaces |

## Architecture

```
Minado.gg/
├── apps/
│   ├── web/              # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/      # Atomic design system (Button, Input, Card, Modal, Tabs...)
│   │   │   │   ├── blocks/   # Composite blocks (Navbar, ChatPanel, Leaderboard, RoomCard...)
│   │   │   │   └── game/    # Game-specific (Board, Cell, Mascote, Banner, FX...)
│   │   │   ├── pages/       # Route pages (Home, Login, Lobby, Room, Match, Result...)
│   │   │   └── styles/      # Global CSS (tokens, components, game)
│   └── server/              # Node.js backend (Express + Socket.IO)
│       └── src/             # Socket handlers, game logic, REST routes, Prisma schema
└── packages/
    └── shared/              # Shared types, constants, and pure game functions
```

The game logic runs **authoritatively on the server**. The client never knows mine positions — it renders only what the server sends. The `packages/shared` package ensures the same types and contracts are used on both ends.

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Development

```bash
# Start the frontend dev server (Vite)
npm run dev

# Or from the web workspace directly
npm run dev --workspace=apps/web
```

The app will be available at `http://localhost:5173`.

### Build

```bash
npm run build
```

### Lint & Typecheck

```bash
npm run typecheck
npm run lint
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + Vite production build |
| `npm run typecheck` | Run TypeScript compiler checks |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## Design System

The project includes a complete custom design system with:

- **Design tokens** — colors, spacing, typography, shadows, border radius, transitions
- **UI components** — Button, Input, Card, Modal, Badge, Avatar, Tabs, Switch, Alert, Label
- **Game components** — Board, Cell, Mascote, Banner, PingRow, FxBoom, FxConfetti
- **Composite blocks** — Navbar, ChatPanel, Leaderboard, PlayerRoster, ProfileCard, RoomCard, GameModeCard, MatchCard
- **Dark mode** — Built-in theme toggle with system preference detection

## Planned Features

- Replay system with scrub controls
- Daily missions and achievements
- Customizable cursors and flags
- Spectator mode
- Friend invites and link sharing
- Ranked matchmaking

## License

MIT
