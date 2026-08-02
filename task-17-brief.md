# Task 17 Brief: Step 17 - Histórico de jogadas (actions) no payload de game:ended

## Task Context
This is Step 17 of SPEC 06 (14s remaining. The server must track actions per player and include them in the `game:ended` payload.

## Original Requirements (from SPEC 06 Passo 17, lines 259-271)

### Files:
1. `apps/server/src/game/GameManager.ts`
2. `apps/server/src/index.ts`
3. `apps/web/src/store/gameStore.ts`

### What to do:

#### GameManager.ts
- Add `actions` array to `GameState`:
  ```typescript
  actions: Array<{ 
    playerId: string; 
    type: 'reveal' | 'flood-fill' | 'flag-correct' | 'flag-wrong' | 'explode' | 'win'; 
    cellId?: string; 
    points: number; 
    timestamp: string 
  }>
  ```
- In `revealCell`/`flagCell`, record action at each score mutation (use same `calculateScore` from Step 9; explosion → `explode`; coop `win` → action `win` for completer)
- `timestamp = new Date().toISOString()`

#### index.ts
- `onGameEnded` callback: include `actions` from state **before** `this.games.delete(roomId)` in `endGame`
- Payload of `game:ended` gains `actions` array

#### gameStore.ts
- `game:ended` handler (lines ~231-270): use `actions: ev.actions ?? []` instead of `actions: []`

## Validation Commands
```bash
cd apps/server && npm run typecheck
cd apps/web && npm run typecheck
```

## Manual Test
Play a game to completion → Result page shows "Histórico de Jogadas" with actual actions (reveals, explosions, flags, win) and points; before was empty list.

## Report Contract
Write report to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-17-report.md`
Return ONLY:
```
STATUS: DONE/WITH_CONCERNS/BLOCKED
COMMITS: <commit SHAs>
TEST_SUMMARY: <1-line test result>
CONCERNS: <any doubts>
```