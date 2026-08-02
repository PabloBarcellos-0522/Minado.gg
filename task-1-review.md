# Task 1 Review: Part A - Critical Fixes

## SPEC_COMPLIANCE: PASS
## CODE_QUALITY: PASS
## FINDINGS: none
## VERDICT: APPROVED

---

## Detailed Analysis

### A1: `relocateMine` — `packages/shared/src/index.ts:199-264`
- ✅ **Precondition check**: Line 204 verifies `board[safeRow][safeCol].hasMine` before proceeding
- ✅ **Target excludes 3x3**: Lines 210-215 check `Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1` and skip cells in the safe zone
- ✅ **Swap from clicked cell**: Lines 224-225 move mine FROM `(safeRow, safeCol)` TO target
- ✅ **AdjacentMines recalc both neighborhoods**: Lines 227-261 collect affected cells from both neighborhoods and recalculate counts
- ✅ **Boolean return**: Returns `true` on success, `false` on failure (lines 204, 221, 263)

### A2: Competitive Propagation — `GameManager.ts:250-270`
- ✅ **Nested loops over all rows/cols**: Lines 258-268 iterate `state.config.rows` × `state.config.cols`
- ✅ **Merge template layout with player state**: Lines 262-266 spread `...playerCell` preserving `isRevealed`, `isFlagged`, `revealedBy` while overwriting `hasMine` and `adjacentMines` from `templateCell`
- ✅ **Skips template key**: Line 257 guards `pid !== 'template'`

### A3: `endByTimer` Return — `GameManager.ts:193-218`
- ✅ **`endGame` returns `GameScoreEntry[]`**: Signature at line 193, returns `scoreboard` at line 208
- ✅ **`endByTimer` returns `endGame` result**: Line 217 returns `this.endGame(roomId, 'timeout')`
- ✅ **Guards**: Lines 195-196 check `!state` and `state.endedAt` returning `[]`; lines 212-214 replicate guards in wrapper

### Code Quality
- **No dead code**: Removed `calculateEndGameBonus`, `CORRECT_FLAG_POINTS`, `REVEALED_CELL_POINTS`, `WRONG_FLAG_PENALTY`, `EndGameBonus` interface
- **No `as any` hacks**: Single deliberate `sorted as any` at line 482 for rank mutation is explicitly allowed per review criteria
- **Clear WHY comments**: "Precondition: the clicked cell MUST have a mine", "Swap: move mine FROM clicked cell TO target cell", "Propagate the ENTIRE layout (hasMine + adjacentMines) to all player boards, preserving each player's game state"
- **Consistent style**: Matches existing TypeScript patterns
- **No regressions**: End-game bonus removal aligns with SPEC 06 single scoring model (live flag scoring +25/-15 symmetric, no end-game bonus)

---

All three critical defects are fixed and validated. Implementation is spec-compliant and production-ready.