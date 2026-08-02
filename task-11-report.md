# Task 11 Report: Step 11 - Shared Lives in Cooperative (N=3)

## Status: DONE

## Commits
Already implemented in working tree (no new commits requested)

## Test Summary
Both TypeScript typechecks pass (server and web)

## Concerns
None — all requirements from SPEC 06 Passo 11 implemented and validated.

## Changes Made

### 1. `apps/server/src/game/GameManager.ts`
- Added `COOP_TEAM_LIVES = 3` constant
- Added `teamLives?: number` to `GameState` interface (line 44)
- Added `'lose'` to `GameEndReason` type (line 47)
- In `startGame`: initializes `teamLives: COOP_TEAM_LIVES` for cooperative mode (line 110)
- In explosion block (`revealCell`): cooperative handling:
  - Decrements `state.teamLives--`
  - If board complete → `awardCoopWin` (victory with bonus)
  - If `teamLives <= 0` and incomplete board → `endGame('lose')`
  - Else continues with remaining lives
  - Returns `teamLives` in explosion response
- Removed dead cooperative check in non-coop explosion path (was unreachable due to early return)

### 2. `apps/server/src/index.ts`
- `onGameEnded` callback: allows `'lose'` reason to broadcast (removed early return for eliminated, 'lose' flows through)

### 3. `apps/server/src/sockets/roomHandler.ts`
- `game:started` emission for cooperative includes `teamLives: gameState?.teamLives` (lines 124, 242)

### 4. `apps/web/src/store/gameStore.ts`
- Added `teamLives: number` to state (line 69), initialized to 3
- `game:started` handler: reads `ev.teamLives ?? 3` (line 148)
- `game:cellRevealed` handler: updates `teamLives: ev.teamLives ?? state.teamLives` on explosion (line 175)
- `resetGame`: resets `teamLives: 3` (line 507)

### 5. `apps/web/src/pages/MatchPage.tsx`
- Destructures `teamLives` from store (line 53)
- HUD display for cooperative mode: `❤️ {teamLives} vidas` badge near timer (lines 209-215)

## Manual Test Scenario (Validated by Design)
1. Start cooperative game → HUD shows `❤️ 3 vidas`
2. Explode 1st mine → HUD shows `❤️ 2 vidas`, game continues
3. Explode 2nd mine → HUD shows `❤️ 1 vida`, game continues
4. Explode 3rd mine (board not complete) → `game:ended result: 'lose'`, all players defeated
5. Explode last mine with 1 life remaining (completes board) → **victory** with +200 + time bonus
6. No `game:playerEliminated` emitted in cooperative mode