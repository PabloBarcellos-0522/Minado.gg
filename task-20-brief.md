# Task 20 Brief: Step 20 - room:ready honra data.ready

## Task Context
This is Step 20 of SPEC 06 (low severity). Currently the server ignores the payload and always toggles; client sends hardcoded `{ready: true}`.

## Original Requirements (from SPEC 06 Passo 20, lines 291-301)

### Files:
1. `apps/server/src/rooms/RoomManager.ts`
2. `apps/server/src/sockets/roomHandler.ts`
3. `apps/web/src/store/roomStore.ts`

### What to do:

#### RoomManager.ts
- Add method `setReady(roomId, playerId, ready: boolean)` that sets `isReady` explicitly (lines ~202-210)
- `toggleReady` can remain for compatibility or be removed

#### roomHandler.ts
- Lines 184-196: read `data?.ready` as boolean
- If boolean → call `setReady`; else fallback to `toggleReady` (back-compat for old clients)

#### roomStore.ts
- `toggleReady` (lines ~162-181): compute `nextReady = !playerAtual.isReady`
- Emit `socket.emit('room:ready', { ready: nextReady })`
- Keep optimistic local update

## Validation Commands
```bash
cd apps/server && npm run typecheck
cd apps/web && npm run typecheck
```

## Manual Test
Click "Pronto" → `room:state` shows `isReady: true`; click again → `isReady: false` on server state (reflected to all players). Impossible for server state to diverge from button.

## Report Contract
Write report to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-20-report.md`
Return ONLY:
```
STATUS: DONE/WITH_CONCERNS/BLOCKED
COMMITS: <commit SHAs>
TEST_SUMMARY: <1-line test result>
CONCERNS: <any doubts>
```