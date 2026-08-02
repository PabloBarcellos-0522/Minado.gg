STATUS: DONE
COMMITS: None (working directory changes only)
TEST_SUMMARY: Typecheck passes (`npm run typecheck`)
CONCERNS: None. Implementation follows the SPEC 06 Passo 14 requirements exactly:
- Changed line 250 in MatchPage.tsx from `{(boardComplete || (timeRemaining === 0 && gameMode !== 'cooperative')) && (` to `{boardComplete && (`
- The "Tabuleiro completo" overlay now only appears when `boardComplete` is true
- When time runs out on an incomplete board, the game ends via `game:ended` with `gameState 'lost'` which shows the end banner directly (lines 104-109), making the intermediate overlay unnecessary