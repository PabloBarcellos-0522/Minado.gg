# Task 1 Review Brief: Part A - Critical Fixes Review

## Task Context
Part A fixed 3 critical defects from the already-implemented Steps 4-10 batch. This review validates spec compliance and code quality.

## Original Requirements (from task-1-brief.md)
### A1. `relocateMine` - `packages/shared/src/index.ts:197-270`
- Must move mine FROM clicked cell `(safeRow, safeCol)` specifically (not search for any mine)
- Verify: precondition check, target excludes 3x3 of clicked cell, swap, adjacentMines recalc, boolean return

### A2. Competitive propagation - `GameManager.ts` (~lines 247-256)
- After `relocateMine(template, row, col)`, propagate FULL layout (hasMine + adjacentMines for ALL cells) to all player boards
- Must preserve player cell state (isRevealed, isFlagged, revealedBy)
- Verify: nested loops over all rows/cols, merge template layout with player state

### A3. `endByTimer` return - `GameManager.ts` (~lines 209-217)
- `endGame` returns `GameScoreEntry[]` (scoreboard)
- `endByTimer` returns `endGame` result
- Guards: `!state || state.endedAt → []`

## Spec References
- SPEC 06 Passo 5 (First-click safety): "primeiro reveal por tabuleiro nunca explode — a mina é realocada... Em competitive (tabuleiro clonado), a realocação é propagada para TODOS os jogadores (template guardado no estado)"
- SPEC 06 Passo 8 (Unified endGame): "endGame é o único caminho... endByTimer vira wrapper... return this.getScoreboard(roomId)"

## Validation Evidence Required
1. Typechecks pass (server + web) ✓ (implementer reported)
2. Manual test: competitive first-click mine → number, second player sees same number
3. Code review: no regressions, clean implementation

## Report Contract
Write review to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-1-review.md`
Return ONLY: SPEC_COMPLIANCE (PASS/FAIL), CODE_QUALITY (PASS/FAIL), findings (if any), verdict.