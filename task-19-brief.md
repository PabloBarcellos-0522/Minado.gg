# Task 19 Brief: Step 19 - Remover fallback lazy de startGame

## Task Context
This is Step 19 of SPEC 06 (low severity). The fallback in `gameHandler.ts:29-33` silently recreated a game without broadcasting `game:started`, causing client desync.

## Original Requirements (from SPEC 06 Passo 19, lines 282-289)

### File:
- `apps/server/src/sockets/gameHandler.ts`

### What to do:
- Remove the fallback block at lines 29-33
- Instead, emit error if no game exists:
  ```typescript
  if (!gameManager.getGame(room.id)) {
    socket.emit('error', { code: 'GAME_NOT_FOUND', message: 'Partida não encontrada' })
    return
  }
  ```
- With Step 12 (cleanup on timer), the state only doesn't exist in anomalous conditions (e.g. server restart) - should be explicit error, not silent recreation.

## Validation Commands
```bash
cd apps/server && npm run typecheck
```

## Manual Test
In active game, restart server → client reveals cell → receives `error { code: 'GAME_NOT_FOUND' }` (no recreated board, no broken UI)

## Report Contract
Write report to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-19-report.md`
Return ONLY:
```
STATUS: DONE/WITH_CONCERNS/BLOCKED
COMMITS: <commit SHAs>
TEST_SUMMARY: <1-line test result>
CONCERNS: <any doubts>
```