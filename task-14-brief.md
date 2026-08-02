# Task 14 Brief: Step 14 - Overlay 'Tabuleiro completo' só quando completo

## Task Context
This is Step 14 of SPEC 06 (Core fixes da auditoria dos modos). The "Tabuleiro completo" overlay currently shows incorrectly when time runs out on an incomplete board.

## Original Requirements (from SPEC 06 Passo 14, lines 227-234)

### File:
- `apps/web/src/pages/MatchPage.tsx`

### What to do:
- Gate the overlay by `boardComplete`, not by `timeRemaining === 0`
- Current line 242: `{(boardComplete || (timeRemaining === 0 && gameMode !== 'cooperative')) && ...}`
- Change to: `{boardComplete && (...) }`
- In timeout the game already ends via `game:ended` (`gameState 'lost'` → banner and navigation in lines 104-109), so the intermediate overlay "Tabuleiro completo" over incomplete board makes no sense

## Spec References
- SPEC 06 Passo 14: "Overlay 'Tabuleiro completo' só quando completo: gate do overlay por boardComplete, não por timeRemaining === 0"

## Validation Evidence Required
1. Typecheck passes (`cd apps/web && npm run typecheck`)
2. Manual test: game with timer (60s) without completing board → time runs out, NO "Tabuleiro completo" overlay appears (end banner appears directly). Complete board → overlay appears normally.

## Report Contract
Write report to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-14-report.md`
Return ONLY:
```
STATUS: DONE/WITH_CONCERNS/BLOCKED
COMMITS: <commit SHAs>
TEST_SUMMARY: <1-line test result>
CONCERNS: <any doubts>
```