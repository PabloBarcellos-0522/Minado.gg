# Task 29 Brief: Final Validation - typecheck, lint, README update

## Task Context
Final validation after all SPEC 06 steps are complete.

## Requirements

### Commands to run:
```bash
cd apps/server && npm run typecheck
cd apps/web && npm run typecheck && npm run lint
```

### Checklist from SPEC 06 Section 6 (Critérios de aceite):
- [ ] C1: Payload `game:started` no `hasMine: true` in unrevealed cells
- [ ] C2: `room:create` validation rejects invalid configs
- [ ] C3: Reconnect works without desync
- [ ] C4: Flagged cell reveal blocked
- [ ] C5: First-click safety works online
- [ ] C6: Coop wins via 3 routes with correct bonus
- [ ] C7: Flags scored live, no end-game bonus
- [ ] C8: Multi-board ends on first complete
- [ ] C9: Coop team lives (3) work correctly
- [ ] C10: room:start confirmation, no false overlay, per-player result
- [ ] C11: Dynamic mode label, actions history populated
- [ ] C12: Typecheck/lint clean
- [ ] C13: CLAUDE.md tables complete

### README update
If there's a README.md, update with any relevant changes from SPEC 06.

## Validation Commands
```bash
# From repo root
cd apps/server && npm run typecheck
cd apps/web && npm run typecheck && npm run lint
```

## Report Contract
Write report to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-final-report.md`
Return ONLY:
```
STATUS: DONE/WITH_CONCERNS/BLOCKED
COMMITS: <commit SHAs>
TEST_SUMMARY: <1-line test result>
CONCERNS: <any doubts>
```