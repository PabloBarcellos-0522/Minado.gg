STATUS: DONE
COMMITS: None (working directory changes only)
TEST_SUMMARY: Typecheck passes (`cd apps/web && npm run typecheck`)
CONCERNS: None. Implementation follows the SPEC 06 Passo 13 requirements exactly:
- Removed the 500ms setTimeout navigation from handleStartGame
- startGame() now returns a Promise with one-shot handlers for room:started (success) and error (failure)
- Navigation now only occurs when room.status === 'playing' via the existing effect (lines 135-141)
- Errors like NOT_ALL_READY and NOT_HOST are caught, set in store, and prevent navigation
- Error banner displays inline above roster when roomError and currentRoom both exist