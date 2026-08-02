# Task 24 Report: Step 24 - Código morto/duplicado

## Changes Made

1. **Added `rank: number` to `GameScoreEntry` type** (apps/server/src/game/GameManager.ts:19-23)
   - The interface now includes `rank: number` field

2. **Removed `as any` from `getScoreboard`** (apps/server/src/game/GameManager.ts:535)
   - Previously returned `sorted as any`, now returns properly typed `GameScoreEntry[]`

3. **Documented `checkWin` as client-only** (packages/shared/src/index.ts:188-189)
   - Added comment: `// Client-only: used by offline path in gameStore.ts (server uses isBoardComplete)`

## Verification Results

- ✅ TypeScript typecheck passes (`npm run typecheck` in apps/server)
- ✅ No `as any` remaining in `getScoreboard`
- ✅ `grep checkWin` shows usage only in shared package (exported for client offline path)
- ✅ `GameScoreEntry` now properly typed with `rank: number`

## Test Summary
Typecheck passed with 0 errors.

## Concerns
None.