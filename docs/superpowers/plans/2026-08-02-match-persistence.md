# Match Persistence (SPEC 02) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement match persistence with Stats/XP updates and period-based ranking as defined in SPEC 02

**Architecture:** 8-step implementation following the exact SPEC 02 pasos. Each step validates independently. Shared constants → GameManager action tracking → GameState passed to onGameEnded → Prisma schema roomId index → gamePersistence module → index.ts wiring → ranking endpoint → integration test.

**Tech Stack:** Node.js/Express 5, Socket.IO, Prisma ORM (PostgreSQL/Neon), TypeScript, npm workspaces (monorepo)

## Global Constraints

- Monorepo: apps/server, apps/web, packages/shared (npm workspaces)
- Game logic authoritative on server (GameManager) — client never knows mine positions
- packages/shared ensures identical types/contracts; main/types point to src/index.ts (no build needed, just tsx reload)
- Zustand 5 client state with socket synchronization
- Socket.IO for real-time (rooms, game actions, chat)
- JWT + OAuth (Google, Discord, GitHub) auth; socket handshake.auth.token required
- Dark mode class-based on <html>
- SPEC 02 constants: XP_BASE_BY_MODE, XP_WIN_BONUS=200, XP_PER_SCORE_UNIT=10, levelForXp(xp)=floor(sqrt(max(0,xp)/100))+1
- Idempotency: in-memory Set + Match.roomId + startedAt DB guard
- Fire-and-forget: persistMatch.catch(err => console.error('[persistMatch]', err)); never await in socket handler
- Victory rules: Competitive/Multi-board/Battle-royale/Fog-of-war → rank 1 wins; Cooperative → all win if reason='win'
- Streaks: win=+1 current, max=max(max,current); loss=current=0, max unchanged
- Stats.rank = best (min) rank ever; default 0 means "never set"
- Ranking: global (xp desc), weekly (7d score sum), monthly (30d score sum); tiebreaker xp desc, victories desc; top 100
- Shared edits require server restart (tsx watch)

---

### Task 1: Add XP/Level Constants to Shared Package

**Files:**
- Modify: `packages/shared/src/index.ts` (append to end)

**Interfaces:**
- Produces: `XP_BASE_BY_MODE: Record<GameMode, number>`, `XP_WIN_BONUS: number`, `XP_PER_SCORE_UNIT: number`, `levelForXp(xp: number): number`

- [ ] **Step 1: Append constants to shared/index.ts**

```typescript
// XP / level (SPEC 02)
export const XP_BASE_BY_MODE: Record<GameMode, number> = {
  competitive: 100,
  'multi-board': 100,
  cooperative: 150,
  'battle-royale': 150,
  'fog-of-war': 120,
}
export const XP_WIN_BONUS = 200
export const XP_PER_SCORE_UNIT = 10

export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd apps/server && npm run typecheck`
Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "feat(shared): add XP/level constants per SPEC 02"
```### Task 2: Add Action Tracking + Exploded Players to GameManager

**Files:**
- Modify: `apps/server/src/game/GameManager.ts`

**Interfaces:**
- Consumes: `PlayerAction`, `MAX_ACTIONS_PER_PLAYER` from same file
- Produces: `GameState.actions` (Map<string, PlayerAction[]>), `GameState.explodedPlayers` (Set<string>), `recordAction(state, playerId, action)` helper

- [ ] **Step 1: Add PlayerAction type and MAX_ACTIONS constant (after line 43)**

```typescript
export type PlayerAction =
  | { type: 'reveal'; row: number; col: number; ts: number }
  | { type: 'flood-fill'; row: number; col: number; ts: number }
  | { type: 'flag'; row: number; col: number; ts: number }
  | { type: 'explode'; row: number; col: number; ts: number }

export const MAX_ACTIONS_PER_PLAYER = 500
```

- [ ] **Step 2: Add actions and explodedPlayers to GameState (around line 30-43)**

```typescript
// Inside GameState interface, add:
actions: Map<string, PlayerAction[]>
explodedPlayers: Set<string>
```

- [ ] **Step 3: Initialize actions and explodedPlayers in startGame (after line 92)**

```typescript
state.actions = new Map()
state.explodedPlayers = new Set()
```

- [ ] **Step 4: Add recordAction helper (private, after startGame)**

```typescript
function recordAction(state: GameState, playerId: string, action: PlayerAction) {
  const arr = state.actions.get(playerId) ?? []
  arr.push(action)
  if (arr.length > MAX_ACTIONS_PER_PLAYER) arr.shift()
  state.actions.set(playerId, arr)
}
```

- [ ] **Step 5: Call recordAction in revealCell for mine (around line 250-259)**

```typescript
// After setting cell.revealed = true and before emitting explosion
recordAction(state, playerId, { type: 'explode', row, col, ts: Date.now() })
state.explodedPlayers.add(playerId)
```

- [ ] **Step 6: Call recordAction in revealCell for flood-fill (around line 300-307)**

```typescript
// After floodFill completes, record single entry for clicked cell
recordAction(state, playerId, { type: 'flood-fill', row, col, ts: Date.now() })
```

- [ ] **Step 7: Call recordAction in revealCell for single reveal (around line 308-312)**

```typescript
recordAction(state, playerId, { type: 'reveal', row, col, ts: Date.now() })
```

- [ ] **Step 8: Call recordAction in flagCell (after line 372, after toggle)**

```typescript
recordAction(state, playerId, { type: 'flag', row, col, ts: Date.now() })
```

- [ ] **Step 9: Verify typecheck passes**

Run: `cd apps/server && npm run typecheck`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add apps/server/src/game/GameManager.ts
git commit -m "feat(GameManager): add action tracking and explodedPlayers per SPEC 02"
```### Task 3: Pass GameState to onGameEnded Callback

**Files:**
- Modify: `apps/server/src/game/GameManager.ts` (line 82, 203, 223)
- Modify: `apps/server/src/index.ts` (line 31)

**Interfaces:**
- Consumes: Updated callback signature from GameManager
- Produces: `onGameEnded` receives full `GameState` as 4th argument

- [ ] **Step 1: Update onGameEnded signature in GameManager.ts (line 82)**

```typescript
onGameEnded?: (roomId: string, scoreboard: GameScoreEntry[], reason: GameEndReason, game: GameState) => void
```

- [ ] **Step 2: Pass state in endGame (line 203)**

```typescript
this.config.onGameEnded?.(roomId, scoreboard, reason, state)
```

- [ ] **Step 3: Pass state in endByTimer (line 223)**

```typescript
this.config.onGameEnded?.(roomId, scoreboard, 'timeout', state)
```

- [ ] **Step 3: Update callback in index.ts to accept game parameter (line 31)**

```typescript
onGameEnded: (roomId, scoreboard, reason, game) => {
  // existing code unchanged, game available as 4th param
}
```

- [ ] **Step 5: Verify typecheck passes**

Run: `cd apps/server && npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/game/GameManager.ts apps/server/src/index.ts
git commit -m "feat: pass GameState to onGameEnded callback per SPEC 02"
```### Task 4: Add roomId + Indexes to Prisma Schema

**Files:**
- Modify: `apps/server/prisma/schema.prisma` (Match model)

**Interfaces:**
- Produces: `roomId String? @index`, `@@index([startedAt])` on Match model

- [ ] **Step 1: Add roomId and index to Match model (after line 60)**

```prisma
model Match {
  id        String   @id @default(cuid())
  mode      String
  boardRows Int
  boardCols Int
  mineCount Int
  status    String   @default("playing")
  startedAt DateTime @default(now())
  endedAt   DateTime?
  roomId    String?  @index          // NOVO (SPEC 02)
  players   MatchPlayer[]

  @@index([startedAt])               // NOVO (SPEC 02)
}
```

- [ ] **Step 2: Apply schema changes**

Run: `cd apps/server && npx prisma db push && npx prisma generate`
Expected: Success (Prisma Client regenerated with new fields)

- [ ] **Step 3: Verify typecheck passes**

Run: `cd apps/server && npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/server/prisma/schema.prisma
git commit -m "feat(prisma): add roomId and startedAt index to Match per SPEC 02"
```### Task 5: Create gamePersistence Module

**Files:**
- Create: `apps/server/src/db/gamePersistence.ts`

**Interfaces:**
- Consumes: `GamePersistenceInput`, `PlayerAction`, `GameEndReason`, `GameMode`, `BoardConfig`, `XP_BASE_BY_MODE`, `XP_WIN_BONUS`, `XP_PER_SCORE_UNIT`, `levelForXp` from shared, Prisma client
- Produces: `persistMatch(input): Promise<string | null>`, `computeIsVictory`, `computeXp`, `computeStreak`

- [ ] **Step 1: Create gamePersistence.ts with full implementation**

```typescript
import { PrismaClient } from '@prisma/client'
import {
  GameMode,
  BoardConfig,
  GameEndReason,
  PlayerAction,
  XP_BASE_BY_MODE,
  XP_WIN_BONUS,
  XP_PER_SCORE_UNIT,
  levelForXp,
} from '@minado/shared'

const prisma = new PrismaClient()

export interface GamePersistenceInput {
  roomId: string
  mode: GameMode
  config: BoardConfig
  startedAt: Date
  endedAt: Date
  reason: GameEndReason
  scoreboard: Array<{ playerId: string; score: number; rank: number }>
  actions: Record<string, PlayerAction[]>
  explodedPlayers: string[]
}

const persistedKeys = new Set<string>()

function isAlreadyPersisted(input: GamePersistenceInput): boolean {
  const key = `${input.roomId}:${input.startedAt.getTime()}`
  return persistedKeys.has(key)
}

export function computeIsVictory(mode: GameMode, reason: GameEndReason, rank: number): boolean {
  if (mode === 'cooperative') {
    return reason === 'win'
  }
  return rank === 1
}

export function computeXp(mode: GameMode, score: number, isVictory: boolean): number {
  const base = XP_BASE_BY_MODE[mode] ?? 100
  const winBonus = isVictory ? XP_WIN_BONUS : 0
  const fromScore = Math.floor(score / XP_PER_SCORE_UNIT)
  return base + winBonus + fromScore
}

export function computeStreak(currentStreak: number, maxStreak: number, isVictory: boolean) {
  if (isVictory) {
    return {
      currentStreak: currentStreak + 1,
      maxStreak: Math.max(maxStreak, currentStreak + 1),
    }
  }
  return {
    currentStreak: 0,
    maxStreak,
  }
}

export async function persistMatch(input: GamePersistenceInput): Promise<string | null> {
  if (input.scoreboard.length === 0) {
    console.warn('[persistMatch] empty scoreboard, nothing to persist')
    return null
  }

  if (isAlreadyPersisted(input)) {
    return null
  }

  // Guard no banco
  const existing = await prisma.match.findFirst({
    where: { roomId: input.roomId, startedAt: input.startedAt },
  })
  if (existing) {
    const key = `${input.roomId}:${input.startedAt.getTime()}`
    persistedKeys.add(key)
    return null
  }

  const matchId = await prisma.$transaction(async (tx) => {
    // 1. Create Match
    const match = await tx.match.create({
      data: {
        mode: input.mode,
        boardRows: input.config.rows,
        boardCols: input.config.cols,
        mineCount: input.config.mines,
        status: 'finished',
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        roomId: input.roomId,
        players: {
          create: input.scoreboard.map((entry) => ({
            userId: entry.playerId,
            score: entry.score,
            rank: entry.rank,
            exploded: input.explodedPlayers.includes(entry.playerId),
            actions: input.actions[entry.playerId] ?? [],
          })),
        },
      },
    })

    // 2-3. Update Stats + User XP/Level for each player
    for (const entry of input.scoreboard) {
      const isVictory = computeIsVictory(input.mode, input.reason, entry.rank)
      const xpGain = computeXp(input.mode, entry.score, isVictory)

      // Stats upsert
      const currentStats = await tx.stats.findUnique({ where: { userId: entry.playerId } })
      const curStreak = currentStats?.currentStreak ?? 0
      const maxStreak = currentStats?.maxStreak ?? 0
      const curRank = currentStats?.rank ?? 0
      const newStreak = computeStreak(curStreak, maxStreak, isVictory)
      const newRank = curRank === 0 ? entry.rank : Math.min(curRank, entry.rank)

      await tx.stats.upsert({
        where: { userId: entry.playerId },
        create: {
          userId: entry.playerId,
          victories: isVictory ? 1 : 0,
          defeats: isVictory ? 0 : 1,
          matchesPlayed: 1,
          currentStreak: newStreak.currentStreak,
          maxStreak: newStreak.maxStreak,
          rank: newRank,
        },
        update: {
          victories: { increment: isVictory ? 1 : 0 },
          defeats: { increment: isVictory ? 0 : 1 },
          matchesPlayed: { increment: 1 },
          currentStreak: { set: newStreak.currentStreak },
          maxStreak: { set: newStreak.maxStreak },
          rank: { set: newRank },
        },
      })

      // User XP + Level
      const user = await tx.user.findUnique({ where: { id: entry.playerId } })
      if (user) {
        const newXp = user.xp + xpGain
        await tx.user.update({
          where: { id: entry.playerId },
          data: { xp: newXp, level: levelForXp(newXp) },
        })
      }
    }

    return match.id
  })

  const key = `${input.roomId}:${input.startedAt.getTime()}`
  persistedKeys.add(key)
  return matchId
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd apps/server && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/db/gamePersistence.ts
git commit -m "feat(db): create gamePersistence module with transaction per SPEC 02"
```### Task 6: Wire persistMatch in index.ts onGameEnded

**Files:**
- Modify: `apps/server/src/index.ts` (lines 31-46)

**Interfaces:**
- Consumes: `persistMatch` from `./db/gamePersistence.js`, `game` parameter from callback
- Produces: Fire-and-forget persistMatch call after existing emits

- [ ] **Step 1: Add import at top of index.ts**

```typescript
import { persistMatch } from './db/gamePersistence.js'
```

- [ ] **Step 2: Update onGameEnded callback (lines 31-46) to add persistence after emits**

```typescript
onGameEnded: (roomId, scoreboard, reason, game) => {
  // Existing emits unchanged
  if (reason === 'eliminated') return // defensive, never fires from onGameEnded

  io.to(roomId).emit('game:ended', { reason, scoreboard })
  if (room) {
    room.status = 'finished'
    io.to(roomId).emit('room:state', room.toJSON())
  }

  // NEW: Fire-and-forget persistence
  if (scoreboard.length > 0) {
    const endedAt = game.endedAt ? new Date(game.endedAt) : new Date()
    const board = room?.boardConfig
    if (board) {
      persistMatch({
        roomId,
        mode: game.mode,
        config: board,
        startedAt: new Date(game.startedAt),
        endedAt: new Date(game.endedAt ?? endedAt.getTime()),
        reason,
        scoreboard: scoreboard.map((e, i) => ({ playerId: e.playerId, score: e.score, rank: i + 1 })),
        actions: Object.fromEntries(game.actions),
        explodedPlayers: Array.from(game.explodedPlayers),
      }).catch((err) => console.error('[persistMatch]', err))
    }
  }
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `cd apps/server && npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/index.ts
git commit -m "feat(index): wire persistMatch fire-and-forget in onGameEnded per SPEC 02"
```### Task 7: Implement Period-Based Ranking in users.ts

**Files:**
- Modify: `apps/server/src/routes/users.ts` (lines 6-20)

**Interfaces:**
- Consumes: Prisma Client with groupBy support
- Produces: GET /api/users/ranking?period=global|weekly|monthly with periodScore for weekly/monthly

- [ ] **Step 1: Rewrite GET /api/users/ranking handler**

```typescript
import { Request, Response } from 'express'
import { prisma } from '../db/prisma.js'

export async function getRanking(req: Request, res: Response) {
  const period = (req.query.period as string) ?? 'global'
  const validPeriods = ['global', 'weekly', 'monthly']
  const p = validPeriods.includes(period) ? period : 'global'

  if (p === 'global') {
    // Existing behavior: top 100 by xp desc
    const users = await prisma.user.findMany({
      take: 100,
      orderBy: { xp: 'desc' },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        xp: true,
        level: true,
        stats: { select: { victories: true, matchesPlayed: true } },
      },
    })
    return res.json(users.map((u, i) => ({ rank: i + 1, ...u })))
  }

  // Weekly / Monthly: aggregate MatchPlayer.score by user over period
  const days = p === 'weekly' ? 7 : 30
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const agg = await prisma.matchPlayer.groupBy({
    by: ['userId'],
    where: { match: { startedAt: { gte: since } } },
    _sum: { score: true },
  })

  const ids = agg.map((a) => a.userId)
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      xp: true,
      level: true,
      stats: { select: { victories: true, matchesPlayed: true } },
    },
  })

  const scored = users.map((u) => ({
    ...u,
    periodScore: agg.find((a) => a.userId === u.id)?._sum.score ?? 0,
  }))

  scored.sort(
    (a, b) =>
      b.periodScore - a.periodScore ||
      b.xp - a.xp ||
      (b.stats?.victories ?? 0) - (a.stats?.victories ?? 0)
  )

  res.json(scored.slice(0, 100).map((u, i) => ({ rank: i + 1, ...u })))
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd apps/server && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/users.ts
git commit -m "feat(routes): add period-based ranking to /api/users/ranking per SPEC 02"
```### Task 8: Integration Validation

**Files:**
- None (procedure)

**Interfaces:**
- Validates: All previous tasks work together end-to-end

- [ ] **Step 1: Typecheck full server**

Run: `cd apps/server && npm run typecheck`
Expected: PASS (zero errors)

- [ ] **Step 2: Apply DB schema (if not done in Task 4)**

Run: `cd apps/server && npx prisma db push && npx prisma generate`
Expected: Success

- [ ] **Step 3: Start dev servers**

Terminal 1: `npm run dev-server` (from root)
Terminal 2: `npm run dev` (from root, starts web on :3000)

- [ ] **Step 4: Play full match and verify in Prisma Studio**

1. Create account, room with 2+ tabs
2. Play to completion (win/timer/battle-royale last_standing)
3. Open `npx prisma studio` and verify:
   - Match: status='finished', endedAt, roomId, board dims correct
   - MatchPlayer: each player has score, rank, exploded, actions (≤500, non-null)
   - Stats: victories/defeats/matchesPlayed, streaks, rank updated
   - User: xp increased, level = levelForXp(xp)

- [ ] **Step 5: Test idempotency (restart same room)**

1. Same room, new game (new startedAt) → new Match row (expected)
2. Simulate duplicate event (same roomId:startedAt) → no duplicate (guard works)

- [ ] **Step 6: Test ranking endpoint**

Run:
```bash
curl "http://localhost:3001/api/users/ranking?period=weekly"
curl "http://localhost:3001/api/users/ranking?period=monthly"
curl "http://localhost:3001/api/users/ranking?period=global"
curl "http://localhost:3001/api/users/ranking?period=invalid"
```
Expected: weekly/monthly show periodScore, sorted correctly; global/invalid same behavior

- [ ] **Step 7: Verify fire-and-forget (no socket blocking)**

During match play, socket events (reveal, flag, chat) continue responsive while persistMatch runs async

- [ ] **Step 8: Commit validation**

```bash
git add -A
git commit -m "test: SPEC 02 integration validation - all criteria pass"
```

---

## Spec Coverage Check

| SPEC Section | Task |
|---|---|
| Paso 1: XP/level constants | Task 1 |
| Paso 2: Action tracking + exploded | Task 2 |
| Paso 3: Pass GameState to onGameEnded | Task 3 |
| Paso 4: Schema roomId + indexes | Task 4 |
| Paso 5: gamePersistence module | Task 5 |
| Paso 6: Wire in index.ts | Task 6 |
| Paso 7: Ranking por período | Task 7 |
| Paso 8: Validação integrada | Task 8 |

All 8 SPEC steps covered. No gaps.

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-08-02-match-persistence.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**