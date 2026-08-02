# Task 11 Brief: Step 11 - Shared Lives in Cooperative (N=3)

## Project Context
Minado.gg — Multiplayer Minesweeper (React 19 + Node.js + Socket.IO)
Monorepo: `apps/web`, `apps/server`, `packages/shared`

## Task Overview
Implement team lives = 3 for cooperative mode:
- GameState gains `teamLives: number` (initialized to 3 when mode === 'cooperative')
- GameEndReason gains `'lose'`
- Explosion decrements teamLives; 0 lives + incomplete board → `endGame('lose')`; explosion that completes board → victory (via Step 6 awardCoopWin)
- Payloads: `teamLives` in `game:started` (coop) and in `game:cellRevealed` explosion (coop)
- `index.ts` onGameEnded handles `'lose'` reason
- Client: `gameStore.teamLives` + HUD ❤️ in MatchPage (~line 193-200)

## Files to Modify
1. `apps/server/src/game/GameManager.ts` - GameState, explosion logic, game:started payload
2. `apps/server/src/index.ts` - onGameEnded handles 'lose'
3. `apps/server/src/sockets/roomHandler.ts` - include teamLives in game:started
4. `apps/web/src/store/gameStore.ts` - teamLives state, handlers
5. `apps/web/src/pages/MatchPage.tsx` - HUD display

## Exact Requirements from SPEC 06 Passo 11

### Server - GameManager.ts
- `GameState` gains `teamLives?: number` (initialized to `COOP_TEAM_LIVES = 3` when `mode === 'cooperative'`)
- `GameEndReason` gains `'lose'`
- In explosion block (`revealCell`):
  - If coop: `state.teamLives--`
  - If `teamLives <= 0` AND `!isBoardComplete(board)` → `endGame(roomId, 'lose')` (explosion payload includes `teamLives: 0`)
  - If explosion completes board → awardCoopWin (victory, Step 6)
  - Individual penalty `-50` (`calculateScore('explode')`) remains (score is per-player even in coop)
- `game:started` payload includes `teamLives?: number` (coop)

### Server - index.ts
- `onGameEnded` callback: `reason === 'lose'` passes through in broadcast normal (emits `game:ended` with `result: 'lose'`)

### Server - roomHandler.ts
- `game:started` emission for coop includes `teamLives` from game state

### Client - gameStore.ts
- New state: `teamLives: number` (default 3)
- Set in `game:started` handler (read `teamLives` from payload)
- Update in `game:cellRevealed` explosion handler (read `teamLives` from payload)
- Reset in `resetGame` to 3

### Client - MatchPage.tsx
- When `gameMode === 'cooperative'`, display `❤️ {teamLives}` badge near timer (~line 193-200)

## Validation Commands
```bash
cd apps/server && npm run typecheck
cd apps/web && npm run typecheck
```

## Manual Test Scenario
1. Start cooperative game
2. Explode 3 mines → `game:ended result: 'lose'`, all players go to result as defeated
3. HUD shows 3 → 2 → 1 → 0
4. Explode last mine with 1 life remaining → **victory** (with bonus)
5. Players never individually eliminated in coop (no `game:playerEliminated` emitted)

## Report Contract
Write full report to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-11-report.md`
Return ONLY: status (DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED), commits, one-line test summary, concerns.