STATUS: DONE
COMMITS:
TEST_SUMMARY: Typecheck passes; lint shows pre-existing errors only (no new errors from this change)
CONCERNS: None. Removed duplicate initSocketListeners call (lines 83-86) and its import. Kept local chat:message listener and joinRoom effect as specified. App.tsx:45-46 already registers global listeners from gameStore/roomStore.