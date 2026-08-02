STATUS: DONE
COMMITS: 7290c80
TEST_SUMMARY: Handler removed; only docs comment remains. Pre-existing TS errors unrelated to this task.
CONCERNS: None. The game:ping handler was already removed in the current working state (reflected in commit 7290c80). Typecheck shows pre-existing errors in GameManager.ts, gameHandler.ts, and roomHandler.ts unrelated to this removal.