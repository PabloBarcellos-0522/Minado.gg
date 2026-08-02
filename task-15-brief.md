# Task 15 Brief: Step 15 - Resultado por jogador derivado do rank

## Task Context
This is Step 15 of SPEC 06 (Core fixes da auditoria dos modos). Must be implemented immediately after Step 11 since the new 'lose' reason needs proper client handling.

## Original Requirements (from SPEC 06 Passo 15, lines 236-248)

### Client - gameStore.ts (`apps/web/src/store/gameStore.ts`)
- Replace the current mapping in `game:ended` handler (lines ~237-245) with per-player derivation from scoreboard
- Scoreboard already contains `rank` from server (line ~234)

### Rules:
1. `result === 'win'` (coop) → `won` for ALL players
2. `result === 'last_standing'` → `won` if not eliminated
3. `result === 'lose'` (new from Step 11) → `lost` for ALL
4. `timeout` / `complete` → `won` if `rank === 1`, else `lost`
5. `showConfetti: isWin`
6. `showBoom: result === 'eliminated' || result === 'lose'` (visual boom already triggered by `game:cellRevealed` with `exploded`)
4. `winner` of `lastMatchResult` remains `scoreboard[0]?.playerId`

## Spec References
- SPEC 06 Passo 15: "Resultado por jogador derivado do rank: substituir o mapeamento atual por derivação per-player do scoreboard de game:ended"
- Cross-ref with Step 11: new `result: 'lose'` for cooperative team loss

## Validation Evidence Required
1. Typecheck passes (`cd apps/web && npm run typecheck`)
2. Manual test: multi-board 2 players, finish 2nd → banner WITHOUT "VITÓRIA!"; coop win → all see VITÓRIA; coop loss (Step 11) → all see defeat

## Report Contract
Write report to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-15-report.md`
Return ONLY:
```
STATUS: DONE/WITH_CONCERNS/BLOCKED
COMMITS: <commit SHAs>
TEST_SUMMARY: <1-line test result>
CONCERNS: <any doubts>
```