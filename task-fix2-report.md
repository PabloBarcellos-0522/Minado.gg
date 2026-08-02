# Task 2 Report: Unify Rejoin Payload (Passo 28)

## Summary
Successfully implemented the fix to unify the rejoin payload shape with the initial `room:start` payload by removing the unused `isEligible` field and using proper TypeScript typing.

## Changes Made

### 1. `apps/server/src/sockets/roomHandler.ts` (lines 117-123)
**Before:**
```typescript
players: room.players.map((p) => ({
  id: p.id,
  username: p.username,
  avatarUrl: p.avatarUrl,
  isEligible: true,
  score: gameState.scores.get(p.id)?.score ?? 0,
})),
```

**After:**
```typescript
players: room.players.map((p) => ({
  ...p,
  score: gameState.scores.get(p.id)?.score ?? 0,
})),
```

This change:
- Spreads the existing player object (`...p`) preserving all fields (`id`, `username`, `avatarUrl`, `isReady`, `isHost`, `isConnected`)
- Adds/overrides `score` from the game state
- Removes the unused `isEligible: true` field

### 2. `apps/web/src/store/gameStore.ts` (line 149)
**Before:**
```typescript
players: ev.players.map((p: any) => ({
  id: p.id,
  username: p.username,
  score: p.score || 0,
  color: "",
})),
```

**After:**
```typescript
players: ev.players.map((p: { id: string; username: string; score?: number; avatarUrl?: string; isReady?: boolean; isHost?: boolean; isConnected?: boolean }) => ({
  id: p.id,
  username: p.username,
  score: p.score ?? 0,
  color: "",
})),
```

This change:
- Removes the `any` cast
- Uses explicit proper typing matching the server payload shape
- Uses nullish coalescing (`??`) instead of logical OR (`||`) for score
- Maintains the same transformation logic (extracting id, username, score; adding empty color for local state)

## Validation Results

All validation commands passed:

1. **Server typecheck**: ✅ `cd apps/server && npm run typecheck` - No errors
2. **Web typecheck**: ✅ `cd apps/web && npm run typecheck` - No errors  
3. **grep for isEligible**: ✅ No references in source files (only in dist/ which is compiled output)

## Result
The rejoin path now emits the exact same player object shape as the initial `room:start` event, ensuring consistency between first join and reconnection scenarios. The client receives all player fields (`isReady`, `isHost`, `isConnected`) which were previously missing during rejoin.