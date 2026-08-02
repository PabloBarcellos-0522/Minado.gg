# Task 2 Brief: Unify Rejoin Payload (Passo 28)

## Task Context
The rejoin path in `roomHandler.ts` still emits `isEligible: true` which is unused by the client. It should emit the same shape as the initial `room:start` which uses `room.players` with score.

## Files to Modify
1. `apps/server/src/sockets/roomHandler.ts` (lines 117-123)
2. `apps/web/src/store/gameStore.ts` (line 149 - remove `any` cast)

## Exact Fix Required

### roomHandler.ts:117-123
Change from:
```typescript
players: room.players.map((p) => ({
  id: p.id,
  username: p.username,
  avatarUrl: p.avatarUrl,
  isEligible: true,
  score: gameState.scores.get(p.id)?.score ?? 0,
})),
```
To:
```typescript
players: room.players.map((p) => ({
  ...p,
  score: gameState.scores.get(p.id)?.score ?? 0,
})),
```

### gameStore.ts:149
Change from:
```typescript
players: ev.players.map((p: any) => ({
  id: p.id,
  username: p.username,
  score: p.score || 0,
  color: "",
})),
```
To properly typed:
```typescript
players: ev.players.map((p: { id: string; username: string; score?: number; avatarUrl?: string; isReady?: boolean; isHost?: boolean; isConnected?: boolean }) => ({
  id: p.id,
  username: p.username,
  score: p.score ?? 0,
  color: "",
})),
```

## Validation Commands
```bash
cd apps/server && npm run typecheck
cd apps/web && npm run typecheck
grep -rn "isEligible" apps/
```

## Report Contract
Write to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-fix2-report.md`
Return ONLY:
```
STATUS: DONE/WITH_CONCERNS/BLOCKED
COMMITS: <commit SHAs>
TEST_SUMMARY: <1-line test result>
CONCERNS: <any doubts>
```