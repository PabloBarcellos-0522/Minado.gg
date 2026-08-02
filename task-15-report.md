STATUS: DONE
COMMITS: (no commits made - working changes only)
TEST_SUMMARY: Typecheck passes (tsc -b --noEmit completed successfully)
CONCERNS: None. The game:ended handler now correctly derives per-player result from scoreboard rank according to SPEC 06 rules:
- result === 'win' (coop) → won for ALL players
- result === 'last_standing' → won if not eliminated
- result === 'lose' (new from Step 11) → lost for ALL players
- result === 'timeout' or 'complete' → won if rank === 1, else lost
- showConfetti: isWin
- showBoom: result === 'eliminated' || result === 'lose'
- winner for lastMatchResult remains scoreboard[0]?.playerId (unchanged, already correct)