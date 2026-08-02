# Task 18 Brief: Step 18 - Remover handler game:ping

## Task Context
This is Step 18 of SPEC 06 (low severity). The `game:ping` handler is dead code - pings work via `chat:message`.

## Original Requirements (from SPEC 06 Passo 18, lines 273-280)

### File:
- `apps/server/src/sockets/gameHandler.ts`

### What to do:
- Remove the handler block at lines 141-149: `socket.on('game:ping', ...)`
- The handler emitted `playerId: socket.id` inconsistent with `userId` used elsewhere
- After removal, `CLAUDE.md` will be updated in Step 25 (remove `game:ping` from client→server table)

## Validation Commands
```bash
cd apps/server && npm run typecheck
```

## Manual Test
```bash
grep -r "game:ping" apps/
```
→ Only residual references in docs (after Step 25, none). Quick reactions (RoomPage.tsx:158-166, MatchPage.tsx:157-165) continue arriving as `chat:message`.

## Report Contract
Write report to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-18-report.md`
Return ONLY:
```
STATUS: DONE/WITH_CONCERNS/BLOCKED
COMMITS: <commit SHAs>
TEST_SUMMARY: <1-line test result>
CONCERNS: <any doubts>
```