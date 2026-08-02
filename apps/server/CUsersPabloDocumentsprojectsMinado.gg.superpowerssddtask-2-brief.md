### Task 2: Add Action Tracking + Exploded Players to GameManager

**Files:**
- Modify: `apps/server/src/game/GameManager.ts`

**Interfaces:**
- Consumes: `PlayerAction`, `MAX_ACTIONS_PER_PLAYER` from same file
- Produces: `GameState.actions` (Map<string, PlayerAction[]>), `GameState.explodedPlayers` (Set<string>), `recordAction(state, playerId, action)` helper

- [ ] **Step 1: Add PlayerAction type and MAX_ACTIONS constant (after line 43)**

```typescript
export type PlayerAction =
  | { type: 'reveal'; row: number; col: number; ts: number }
  | { type: 'flood-fill'; row: number; col: number; ts: number }
  | { type: 'flag'; row: number; col: number; ts: number }
  | { type: 'explode'; row: number; col: number; ts: number }

export const MAX_ACTIONS_PER_PLAYER = 500
```

- [ ] **Step 2: Add actions and explodedPlayers to GameState (around line 30-43)**

```typescript
// Inside GameState interface, add:
actions: Map<string, PlayerAction[]>
explodedPlayers: Set<string>
```

- [ ] **Step 3: Initialize actions and explodedPlayers in startGame (after line 92)**

```typescript
state.actions = new Map()
state.explodedPlayers = new Set()
```

- [ ] **Step 4: Add recordAction helper (private, after startGame)**

```typescript
function recordAction(state: GameState, playerId: string, action: PlayerAction) {
  const arr = state.actions.get(playerId) ?? []
  arr.push(action)
  if (arr.length > MAX_ACTIONS_PER_PLAYER) arr.shift()
  state.actions.set(playerId, arr)
}
```

- [ ] **Step 5: Call recordAction in revealCell for mine (around line 250-259)**

```typescript
// After setting cell.revealed = true and before emitting explosion
recordAction(state, playerId, { type: 'explode', row, col, ts: Date.now() })
state.explodedPlayers.add(playerId)
```

- [ ] **Step 6: Call recordAction in revealCell for flood-fill (around line 300-307)**

```typescript
// After floodFill completes, record single entry for clicked cell
recordAction(state, playerId, { type: 'flood-fill', row, col, ts: Date.now() })
```

- [ ] **Step 7: Call recordAction in revealCell for single reveal (around line 308-312)**

```typescript
recordAction(state, playerId, { type: 'reveal', row, col, ts: Date.now() })
```

- [ ] **Step 8: Call recordAction in flagCell (after line 372, after toggle)**

```typescript
recordAction(state, playerId, { type: 'flag', row, col, ts: Date.now() })
```

- [ ] **Step 9: Verify typecheck passes**

Run: `cd apps/server && npm run typecheck`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add apps/server/src/game/GameManager.ts
git commit -m "feat(GameManager): add action tracking and explodedPlayers per SPEC 02"
```

