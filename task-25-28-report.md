# Task 25-28 Report

## Summary
Updated CLAUDE.md and docs/ARCHITECTURE.md with accurate Socket.IO event tables per SPEC 06 Steps 25-28.

## Changes Made

### CLAUDE.md
- **Step 25**: Fixed Client→Server table (removed `game:ping`, added `room:create`, `room:list`); Fixed Server→Client table (added `room:created`, `game:playerBoardComplete`, `game:playerRemoved`, `game:removedForInactivity`)
- **Step 26**: Documented 3 shapes of `game:cellRevealed` (single, batch, explosion)
- **Step 27**: Documented `game:ended` `result: 'eliminated'` is single-socket emission only
- **Step 28**: Documented `game:started` players payload unification (removed `isEligible`, kept `isReady/isHost/isConnected`)

### docs/ARCHITECTURE.md
- Updated Client→Server table to match code (removed `game:ping`, added `timeLimit` to `room:create`)
- Updated Server→Client table with all events including `game:playerBoardComplete`, `game:removedForInactivity`, `teamLives?` in `game:started`, and 3 `game:cellRevealed` shapes
- Added documentation for `game:ended` eliminated behavior

## Validation
- `grep -rn "socket.emit\|io.emit\|io.to" apps/server/src` verified against tables — all emissions accounted for
- Web typecheck: **PASS**
- Server typecheck: **FAIL** (pre-existing bug in GameManager.ts:80 - missing `rank` in GameScoreEntry initialization, unrelated to documentation changes)

## Files Modified
- C:\Users\Pablo\Documents\projects\Minado.gg\CLAUDE.md
- C:\Users\Pablo\Documents\projects\Minado.gg\docs\ARCHITECTURE.md