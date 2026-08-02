# Task 23 Brief: Step 23 - Deduplicar listeners de socket

## Task Context
This is Step 23 of SPEC 06 (low severity). RoomPage.tsx registers a second copy of `initSocketListeners` on every mount, causing duplicate event processing.

## Original Requirements (from SPEC 06 Passo 23, lines 321-328)

### File:
- `apps/web/src/pages/RoomPage.tsx`

### What to do:
- Remove lines 83-86: `const cleanup = initSocketListeners()` and its `cleanup()` in the return
- `App.tsx:45-46` already registers global listeners from `gameStore`/`roomStore` (SocketManager runs while authenticated and persists across routes)
- Keep local `chat:message` listener (lines 73-81) and `joinRoom` effect (lines 65-71)

## Validation Commands
```bash
cd apps/web && npm run typecheck && npm run lint
```

## Manual Test
Mount/unmount room page multiple times → each socket event processed once (add temporary console.log in `room:state` handler and count occurrences per emission; or verify `chat:message` doesn't duplicate messages)

## Report Contract
Write report to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-23-report.md`
Return ONLY:
```
STATUS: DONE/WITH_CONCERNS/BLOCKED
COMMITS: <commit SHAs>
TEST_SUMMARY: <1-line test result>
CONCERNS: <any doubts>
```