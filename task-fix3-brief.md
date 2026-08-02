# Task 3 Brief: Lint Clean + game:ping Residue

## Task Context
Fix 3 lint errors and remove residual `game:ping` string from comment.

## Files to Modify
1. `apps/web/src/store/roomStore.ts:77` - type `board?: any` → proper Board type
2. `apps/web/src/lib/api.ts:25` - remove `any` cast
3. `apps/web/src/pages/RoomPage.tsx:57` - remove `(location.state as any)`
4. `apps/server/src/sockets/gameHandler.ts:158` - rewrite comment without "game:ping" string

## Exact Fixes Required

### roomStore.ts:77
```typescript
// Change from:
board?: any
// To:
board?: import('@minado/shared').Board  // or add import at top
```

### api.ts:25
```typescript
// Change from:
throw new Error((data as any).error || `HTTP ${res.status}`)
// To:
throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
```

### RoomPage.tsx:57
```typescript
// Change from:
const [showCreatedModal, setShowCreatedModal] = useState(!!(location.state as any)?.justCreated)
// To:
const [showCreatedModal, setShowCreatedModal] = useState(!!(location.state as { justCreated?: boolean })?.justCreated)
```

### gameHandler.ts:158
```typescript
// Change from:
// game:ping handler removed - pings work via chat:message
// To:
// Ping handler removed - pings work via chat:message
```

## Validation Commands
```bash
cd apps/web && npm run lint
cd apps/server && npm run typecheck
cd apps/web && npm run typecheck
grep -rn "game:ping" apps/
```

## Report Contract
Write to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-fix3-report.md`
Return ONLY:
```
STATUS: DONE/WITH_CONCERNS/BLOCKED
COMMITS: <commit SHAs>
TEST_SUMMARY: <1-line test result>
CONCERNS: <any doubts>
```