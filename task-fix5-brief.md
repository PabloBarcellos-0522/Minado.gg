# Task 5 Brief: Optional Nits (Grace Note + Flag Removal Action Documentation)

## Task Context
Optional improvements noted in audit: add "grace" note flag for cooperative first-click mine explosion, document flag removal action in spec vs code alignment.

## Files to Consider
1. `apps/server/src/game/GameManager.ts` - Cooperative explosion handling (could add `grace: true` flag when firstRevealDone was false)
2. `specs/06-game-core-fixes.md` - Step 9 doc mentions "symmetric flag scoring" - ensure code matches

## Exact Fixes Required (Optional - Only if trivial)

### GameManager.ts - Cooperative First-Click Grace
In the cooperative block after first-click safety (lines ~308-355), if `firstRevealDone` was false for that board (i.e., this was the first click), the player shouldn't lose a team life and should get `grace: true` in the result. This is a nice-to-have UX improvement.

```typescript
// In cooperative explosion block:
// Check if this was the first reveal (and mine was relocated)
const wasFirstClick = !state.firstRevealDone.get('shared') // or track before setting
// If wasFirstClick, don't decrement teamLives, add grace: true to result
```

### Specs Alignment
Ensure Step 9 "symmetric flag scoring" documentation in SPEC 06 matches the implementation in `flagCell` (lines 496-523) - removing a flag reverses the delta.

## Validation Commands
```bash
cd apps/server && npm run typecheck
# Verify flag removal logic in flagCell (lines 504-507)
```

## Report Contract
Write to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-fix5-report.md`
Return ONLY:
```
STATUS: DONE/WITH_CONCERNS/BLOCKED
COMMITS: <commit SHAs>
TEST_SUMMARY: <1-line test result>
CONCERNS: <any doubts>
```