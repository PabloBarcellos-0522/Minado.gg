# Task 13 Brief: Step 13 - Navegar para a partida só com confirmação

## Task Context
This is Step 13 of SPEC 06 (Core fixes da auditoria dos modos). Removes the 500ms setTimeout navigation and makes navigation happen only when `room.status === 'playing'` via the existing effect fed by the `game:started` handler.

## Original Requirements (from SPEC 06 Passo 13, lines 214-225)

### Files:
- `apps/web/src/pages/RoomPage.tsx`
- `apps/web/src/store/roomStore.ts`

### What to do:
1. Remove `setTimeout(navigate, 500)` from `handleStartGame` in RoomPage.tsx
2. Navigation should only happen when `room.status === 'playing'` (existing effect in RoomPage.tsx:135-141, fed by `roomStore.ts:73-90` handler for `game:started`)
3. Failures (`NOT_ALL_READY`, `NOT_HOST`) should stop navigating and stay visible
4. `roomStore.startGame` should register one-shot error listener (pattern identical to `createRoom` at lines 119-135) that sets `error` in store and removes itself
5. RoomPage: display `roomError` when room loaded (banner/alert inline above roster when `roomError` and `currentRoom` exist)

## Spec References
- SPEC 06 Passo 13: "Navegar para a partida só com confirmação: remover o setTimeout(navigate, 500) de handleStartGame; a navegação passa a acontecer APENAS quando room.status === 'playing'"

## Validation Evidence Required
1. Typecheck passes (`cd apps/web && npm run typecheck`)
2. Manual test: room with 1 player → call startGame() in console → NO navigation, error NOT_ALL_READY visible; with 2+ ready → starts and navigates normally

## Report Contract
Write report to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-13-report.md`
Return ONLY:
```
STATUS: DONE/WITH_CONCERNS/BLOCKED
COMMITS: <commit SHAs>
TEST_SUMMARY: <1-line test result>
CONCERNS: <any doubts>
```