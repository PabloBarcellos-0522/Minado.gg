# Task 16 Brief: Step 16 - Label de modo dinâmico no MatchPage

## Task Context
This is Step 16 of SPEC 06 (Correções do Core de Jogos). Simple fix to use the actual game mode in the match info panel.

## Original Requirements (from SPEC 06 Passo 16, lines 250-257)

### File:
- `apps/web/src/pages/MatchPage.tsx`

### What to do:
- Line 344: change `{modeLabels.competitive}` to `{modeLabels[gameMode]}`
- `gameMode` already comes from the store (set in `game:started` handler at `gameStore.ts:128`)
- No type changes needed (`Record<GameMode, string>` already complete at lines 20-26)

## Validation Commands
```bash
cd apps/web && npm run typecheck
```

## Manual Test
Start a **cooperative** game → "Info da Partida" panel shows "Modo: **Cooperativo**" (before: "Competitivo")

## Report Contract
Write report to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-16-report.md`
Return ONLY:
```
STATUS: DONE/WITH_CONCERNS/BLOCKED
COMMITS: <commit SHAs>
TEST_SUMMARY: <1-line test result>
CONCERNS: <any doubts>
```