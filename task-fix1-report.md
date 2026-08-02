# Task 1 Report: Fix First-Click Competitive Bug

## Summary
Fixed the critical bug in competitive mode where a non-host player's first click on a mine would incorrectly cause an explosion. The issue was that the `cell` reference was captured **before** the first-click safety block propagated the updated board layout to all player boards.

## Root Cause
In `GameManager.ts`, line 260 captured `const cell = board[row]?.[col]` before the first-click safety logic (lines 265-300). In competitive mode, when a mine is clicked as the first click:
1. The template board has the mine relocated
2. The new layout is propagated to ALL player boards (lines 278-292)
3. However, the original `cell` variable still pointed to the **old** cell object with `hasMine: true`
4. At line 303, `if (cell.hasMine)` incorrectly evaluated to `true`, triggering an explosion

## Fix Applied
After the first-click safety block ends (after line 300), added:
```typescript
// Re-read cell from board after first-click safety propagation
// In competitive mode, the board was updated with the new layout
const updatedCell = board[row]?.[col]
```

Then replaced all subsequent uses of `cell` in the explosion check and safe reveal logic with `updatedCell`:
- Line 307: `if (updatedCell.hasMine)`
- Line 308: `updatedCell.isRevealed = true`
- Line 418: `if (updatedCell.adjacentMines === 0)`
- Line 427: `updatedCell.isRevealed = true`
- Line 428: `value: updatedCell.adjacentMines`
- Line 435: `const revealType = updatedCell.adjacentMines === 0 ? 'flood-fill' : 'reveal'`

## Validation
- ✅ Server typecheck: `npm run typecheck` — **PASSED**
- ✅ Server build: `npm run build` — **PASSED**
- ✅ Web typecheck: `npm run typecheck` — **PASSED**
- ✅ Web build: `npm run build` — **PASSED**

## Manual Test (C5)
Competitive game with 2 players, player 2 (non-host) reveals a mine as FIRST click → cell opens with number, NO explosion, NO -50; player 1 sees same layout.

## Files Modified
- `apps/server/src/game/GameManager.ts` (lines ~265-300, 302-435)