# Task 25 Brief: Steps 25-28 - Atualizar tabelas de eventos do CLAUDE.md

## Task Context
This combines Steps 25-28 of SPEC 06 (docs/contract severity). Update CLAUDE.md with accurate socket event tables.

## Original Requirements (from SPEC 06 Passos 25-28, lines 342-373)

### File:
- `CLAUDE.md` (and `docs/ARCHITECTURE.md` if exists)

### What to do:

#### Passo 25 - Tabelas de Socket.IO (lines 101-105)
- **Client → Server**: Remove `game:ping`. Add `room:create`, `room:list` (were missing). Keep: `room:join`, `room:leave`, `room:ready`, `room:start`, `game:reveal`, `game:flag`, `chat:message`
- **Server → Client**: Add `room:created`, `game:playerBoardComplete`, `game:playerRemoved`, `game:removedForInactivity`. Keep existing. Document new fields: `teamLives?` in `game:started` and explosion `game:cellRevealed`; `actions` in `game:ended`

#### Passo 26 - Shapes do game:cellRevealed
Document the 3 shapes:
1. Single cell: `{ cellId, value: number, revealedBy }`
2. Batch: `{ batch: Array<{ cellId, value, revealedBy }> }`
3. Explosion: `{ cellId, value: 'mine', revealedBy, exploded: true, teamLives? }`

#### Passo 27 - game:ended 'eliminated'
Document that `result: 'eliminated'` is emitted ONLY to the eliminated socket (gameHandler.ts:63-73); others continue playing. Broadcast `game:ended` (index.ts:31-46) only for other reasons. Cross-ref SPEC 04 (will change to broadcast).

#### Passo 28 - Unificar payload de players do game:started
Rejoin should send same shape as initial: `room.players.map(p => ({ ...p, score: gameState.scores.get(p.id)?.score ?? 0 }))` - remove `isEligible` (unused), keep `isReady/isHost/isConnected`.

## Validation
- Verify every event in table has real emission in code: `grep -rn "socket.emit\|io.emit\|io.to" apps/server/src`
- Every emission has entry in table

## Report Contract
Write report to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-25-28-report.md`
Return ONLY:
```
STATUS: DONE/WITH_CONCERNS/BLOCKED
COMMITS: <commit SHAs>
TEST_SUMMARY: <1-line test result>
CONCERNS: <any doubts>
```