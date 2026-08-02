# Task 1 Brief: Fix First-Click Competitive Bug (Passo 5)

## Task Context
Critical bug from SPEC 06 audit: In competitive mode, the first-click safety captures `cell` BEFORE the relocation/propagation block. When a non-host player clicks a mine as first click, the captured `cell` reference still has `hasMine: true` because it was captured before the template propagation updated all boards. This causes the player to explode incorrectly.

## Files to Modify
- `apps/server/src/game/GameManager.ts` (lines ~260-310)

## Exact Fix Required
In `revealCell` method, after the first-click safety block (lines 265-300), RE-READ the cell from the board before the explosion check at line 303:
```typescript
// After the first-click safety block ends (after line 300), add:
const updatedCell = board[row]?.[col]  // Re-read from the already-propagated board
// Then change line 303 from:
if (cell.hasMine) {
// To:
if (updatedCell.hasMine) {
```

## Validation Commands
```bash
cd apps/server && npm run typecheck
```
Manual test C5: Competitive game with 2 players, player 2 (non-host) reveals a mine as FIRST click → cell opens with number, NO explosion, NO -50; player 1 sees same layout.

## Report Contract
Write to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-fix1-report.md`
Return ONLY:
```
STATUS: DONE/WITH_CONCERNS/BLOCKED
COMMITS: <commit SHAs>
TEST_SUMMARY: <1-line test result>
CONCERNS: <any doubts>
```