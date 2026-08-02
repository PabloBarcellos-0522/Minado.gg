# Task 15 Review Brief: Step 15 - Resultado por jogador derivado do rank

## Task Context
Step 15 implements per-player result derivation from rank in the `game:ended` handler. This must work correctly with the new `result: 'lose'` from Step 11.

## Original Requirements (from task-15-brief.md)
### Client - gameStore.ts (`apps/web/src/store/gameStore.ts`)
- Replace the current mapping in `game:ended` handler with per-player derivation from scoreboard
- Scoreboard already contains `rank` from server

### Rules:
1. `result === 'win'` (coop) → `won` for ALL players
2. `result === 'last_standing'` → `won` if not eliminated
3. `result === 'lose'` (new from Step 11) → `lost` for ALL
4. `timeout` / `complete` → `won` if `rank === 1`, else `lost`
5. `showConfetti: isWin`
6. `showBoom: result === 'eliminated' || result === 'lose'` (visual boom already triggered by `game:cellRevealed` with `exploded`)
7. `winner` of `lastMatchResult` remains `scoreboard[0]?.playerId`

## Spec References
- SPEC 06 Passo 15: "Resultado por jogador derivado do rank: substituir o mapeamento atual por derivação per-player do scoreboard de game:ended"
- Cross-ref with Step 11: new `result: 'lose'` for cooperative team loss

## Validation Evidence Required
1. Typecheck passes (`cd apps/web && npm run typecheck`)
2. Manual test: multi-board 2 players, finish 2nd → banner WITHOUT "VITÓRIA!"; coop win → all see VITÓRIA; coop loss (Step 11) → all see defeat

## Report Contract
Write review to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-15-review.md`
Return ONLY:
```
SPEC_COMPLIANCE: PASS/FAIL
CODE_QUALITY: PASS/FAIL
FINDINGS: <list any critical/important issues, or "none">
VERDICT: APPROVED/NEEDS_FIXES
```