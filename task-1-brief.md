# Task 1 Brief: Part A - Critical Fixes to Steps 4-10

## Project Context
Minado.gg — Multiplayer Minesweeper (React 19 + Node.js + Socket.IO)
Monorepo: `apps/web`, `apps/server`, `packages/shared`

## Task Overview
Fix 3 critical defects found in the already-implemented Steps 4-10 batch. These are **must-fix** before proceeding to Steps 11-28.

## Files to Modify
1. `packages/shared/src/index.ts` - `relocateMine` function (lines 197-270)
2. `apps/server/src/game/GameManager.ts` - competitive propagation (lines ~247-256) and `endByTimer` return (lines ~209-217)

## Exact Requirements

### A1. Fix `relocateMine` — `packages/shared/src/index.ts:197-270`
**Current bug**: The function searches for ANY mine outside the 3x3 safe zone to relocate. This is wrong.

**Correct behavior**: The function MUST move the mine FROM the clicked cell `(safeRow, safeCol)` specifically — i.e., `mineCell` MUST be `(safeRow, safeCol)`. The clicked cell HAS a mine (that's why first-click safety triggered). We relocate THAT mine.

**Algorithm**:
1. Verify `board[safeRow][safeCol].hasMine === true` (precondition)
2. Find a target cell: NOT a mine, NOT in 3x3 neighborhood of `(safeRow, safeCol)`
3. Swap: `board[safeRow][safeCol].hasMine = false`, `board[targetRow][targetCol].hasMine = true`
4. Recalculate `adjacentMines` for both neighborhoods (already correct in current code)
5. Return `boolean` (false if no valid target)

**Keep**: function signature, target search logic, adjacentMines recalculation, boolean return.

### A2. Fix Competitive Mode Propagation — `GameManager.ts` (~lines 247-256)
**Current bug**: After `relocateMine(template, row, col)`, only the single clicked cell is propagated to player boards.

**Correct behavior**: After relocation on the template, propagate the **ENTIRE layout** (hasMine + adjacentMines for ALL cells) to every player's board, while **preserving each player's game state** (isRevealed, isFlagged, revealedBy).

**Code pattern**:
```typescript
// After relocateMine(template, row, col)
for (const [pid, boardData] of state.playerBoards) {
  if (pid === 'template') continue
  for (let r = 0; r < state.config.rows; r++) {
    for (let c = 0; c < state.config.cols; c++) {
      const playerCell = boardData.board[r][c]
      const templateCell = template[r][c]
      boardData.board[r][c] = {
        ...playerCell,           // preserves isRevealed, isFlagged, revealedBy
        hasMine: templateCell.hasMine,
        adjacentMines: templateCell.adjacentMines,
      }
    }
  }
}
```

### A3. Fix `endByTimer` Return Value — `GameManager.ts` (~lines 209-217)
**Current bug**: `endGame` doesn't return scoreboard; `endByTimer` returns `[]` because state is already deleted from Map.

**Correct behavior**:
- `endGame(roomId, reason, priorityPlayerId?)` **returns** `GameScoreEntry[]` (the scoreboard it computes for `onGameEnded`)
- `endByTimer(roomId)` returns `this.endGame(roomId, 'timeout')` (the scoreboard)
- Keep existing guards: `if (!state || state.endedAt) return []`

## Validation Commands
```bash
cd apps/server && npm run typecheck
cd apps/web && npm run typecheck
```

## Manual Test (Critical)
1. Start competitive game online
2. First click on a mine → cell opens with NUMBER (no explosion)
3. Second player reveals same cell → SAME number (boards synchronized)
4. Verify no TypeScript errors

## Report Contract
Write full report to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-1-report.md`
Return only: status (DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED), commits, one-line test summary, concerns.