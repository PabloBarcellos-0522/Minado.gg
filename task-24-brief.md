# Task 24 Brief: Step 24 - Código morto/duplicado

## Task Context
This is Step 24 of SPEC 06 (low severity). Clean up dead code and improve types in GameManager.ts.

## Original Requirements (from SPEC 06 Passo 24, lines 330-340)

### File:
- `apps/server/src/game/GameManager.ts`

### What to do:
1. Add `rank: number` to `GameScoreEntry` type (lines 12-15)
2. Remove `as any` from `getScoreboard` (lines 410-417) - it should map `{ ...entry, rank: i + 1 }` typed
3. Document `checkWin` (shared:185-192) - keep it (used by client offline path at gameStore.ts:400) - add comment that it's client-only (server uses `isBoardComplete` at shared:171-182)
4. After Step 9, `calculateScore` flag-correct/flag-wrong are no longer unreachable

## Validation Commands
```bash
cd apps/server && npm run typecheck
```

## Verification
- No `as any` remaining in `getScoreboard`
- `grep checkWin packages/shared apps/server` → usage only in client

## Report Contract
Write report to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-24-report.md`
Return ONLY:
```
STATUS: DONE/WITH_CONCERNS/BLOCKED
COMMITS: <commit SHAs>
TEST_SUMMARY: <1-line test result>
CONCERNS: <any doubts>
```