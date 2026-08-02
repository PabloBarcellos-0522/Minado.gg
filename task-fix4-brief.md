# Task 4 Brief: Documentation Alignment

## Task Context
Align CLAUDE.md, ARQUITETURA.md, Plano, and README with actual code after SPEC 06 fixes.

## Files to Modify
1. `CLAUDE.md` - Fix game:ended broadcast reasons (line 119), verify unified player shape note (line 114)
2. `docs/ARQUITETURA.md` - Remove game:ping from event tables (~line 583, 601), fix prose (~239, 475)
3. `Plano_Implementacao_Minado.gg.md:158` - Same as ARQUITETURA.md
4. `specs/README.md` - Update Progress section with honest state of steps 11-28 + fixes

## Exact Fixes Required

### CLAUDE.md:119
Change from:
```
Broadcast game:ended (see index.ts:31-46) only for other reasons: 'victory', 'last_standing', 'all_exploded', 'time_up', 'board_cleared'
```
To:
```
Broadcast game:ended (see index.ts:31-46) only for other reasons: 'win', 'timeout', 'complete', 'last_standing', 'lose'
```

### ARQUITETURA.md
- Remove any `game:ping` references from event tables
- Fix any prose mentions
- Ensure `teamLives?` and `actions?` are documented consistently

### Plano_Implementacao_Minado.gg.md:158
Same cleanup as ARQUITETURA.md

### specs/README.md
Add dated progress line for each Step 11-28 (format matching existing), including:
- "12 coberto pelo 8", "21/22 cobertos pelo 2", "18 removido (handler + docs)"
- Passo 5 fix, Passo 28 fix, lint fixes, docs fixes
- Update line 14 index: "Concluída — Passos 1–28 ✓ (fixes de auditoria aplicados)"

## Validation Commands
```bash
grep -n "game:ping" docs/ARQUITETURA.md Plano_Implementacao_Minado.gg.md
grep -n "victory\|all_exploded\|time_up\|board_cleared" CLAUDE.md
```

## Report Contract
Write to: `C:\Users\Pablo\Documents\projects\Minado.gg\task-fix4-report.md`
Return ONLY:
```
STATUS: DONE/WITH_CONCERNS/BLOCKED
COMMITS: <commit SHAs>
TEST_SUMMARY: <1-line test result>
CONCERNS: <any doubts>
```