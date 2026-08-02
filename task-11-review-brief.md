# Task 11 Review Brief: Step 11 - Shared Lives Cooperative Review

## Task Context
Step 11 implements shared lives (N=3) in cooperative mode. This review validates spec compliance and code quality.

## Original Requirements (from task-11-brief.md)
### Server - GameManager.ts
- GameState has teamLives (initialized to 3 for coop)
- GameEndReason includes 'lose'
- Explosion in coop decrements teamLives
- 0 lives + incomplete board → endGame('lose')
- Explosion completing board → awardCoopWin (victory)
- teamLives in game:started payload (coop)

### Server - index.ts
- onGameEnded handles 'lose' (passes through to broadcast)

### Server - roomHandler.ts
- game:started includes teamLives for coop

### Client - gameStore.ts
- teamLives state, handlers, reset

### Client - MatchPage.tsx
- Shows ❤️ {teamLives} when coop

## Spec References
- SPEC 06 Passo 11: "Decisão — implementar vidas de equipe N = 3 (COOP_TEAM_LIVES): explosão decrementa; 0 → endGame('lose'); exceto se a explosão completar o tabuleiro → vitória (Passo 6). Copy do CreateRoomPage/CLAUDE.md permanece válida."
- "Cliente: gameStore.ts ganha teamLives: number; setado no handler game:started (payload teamLives?) e atualizado no payload de explosão de game:cellRevealed (:160-168, campo teamLives?). MatchPage.tsx HUD: quando gameMode === 'cooperative', exibir ❤️ {teamLives} (badge próximo ao timer, :193-200)."

## Validation Evidence Required
1. Typechecks pass (server + web) ✓ (implementer reported)
2. Manual test: coop game, explode mines → HUD counts down, lose at 0, win if last mine
3. No game:playerEliminated in coop

## Report Contract
Write review to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-11-review.md`
Return ONLY:
```
SPEC_COMPLIANCE: PASS/FAIL
CODE_QUALITY: PASS/FAIL
FINDINGS: <list any critical/important issues, or "none">
VERDICT: APPROVED/NEEDS_FIXES
```