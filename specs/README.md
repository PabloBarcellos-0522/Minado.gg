# Specs — Minado.gg

Especificações de correções e implementações pendentes do projeto. Cada spec é um arquivo `.md` numerado, auto-contido e executável por um desenvolvedor sem acesso ao contexto da conversa original.

## Índice

| # | Spec | Prioridade | Depende de | Status |
|---|------|-----------|------------|--------|
| 01 | [Criar Sala: modal + Switch + scrollbar](01-criar-sala-modal.md) | P1 | — | Pronta para execução |
| 02 | [Persistência de partidas (Match/MatchPlayer/Stats/xp)](02-match-persistence.md) | P1 | — | Pronta para execução |
| 03 | [Lobby com dados reais (presença + ranking)](03-lobby-dados-reais.md) | P2 | 02 | Pronta para execução |
| 04 | [Battle Royale (rodadas, eliminação, dificuldade progressiva)](04-battle-royale.md) | P2 | 06 (sanitização do board) | Pronta para execução |
| 05 | [Fog of War (peões, visão limitada, anti-cheat)](05-fog-of-war.md) | P3 | 06 (sanitização do board) | Pronta para execução |
| 06 | [Core fixes da auditoria dos modos (24 itens)](06-game-core-fixes.md) | P1 | 02 (item 17) | Em execução — Passo 1 ✓, Passo 2 concluído (validação room:create) |

## Prioridades de execução

1. **P1 — Fundação** (ordem sugerida):
   1. `06` — itens HIGH (1–4): vazamento de minas, DoS do `boardConfig`, desync no reconnect, flag revelável. *(Muitos passos de 04/05 dependem da sanitização do board do item 1.)*
   2. `01` — modal de criar sala + Switch + scrollbar (independente, valor visível rápido).
   3. `02` — persistência de partidas (desbloqueia dados reais no Lobby e no ranking).
2. **P2 — Features**:
   4. `03` — Lobby com dados reais (depende de 02 para o período semanal/mensal).
   5. `04` — Battle Royale.
3. **P3**:
   6. `05` — Fog of War (maior; requer sanitização de 06 item 1).

## Grafo de dependências

```
06 (HIGH) ──► 04 (Battle Royale)
    │            05 (Fog of War)
02 ──► 03 (Lobby dados reais)
06 item 17 (actions) ──► 02 (MatchPlayer.actions)
```

## Convenções

- **Idioma**: PT-BR, termos técnicos em inglês.
- **Referências**: `arquivo:linha` verificadas contra o código no momento da escrita — se o código mudar, revalidar antes de executar.
- **Validação**: toda spec inclui passos de verificação (typecheck/lint/teste manual).
- **Cross-references**: specs que dependem de outras citam o arquivo pelo nome canônico (ex.: "ver `02-match-persistence.md`").

## Progresso

- 2026-08-01 — SPEC 06 Passo 1 concluído: sanitização do board em game:started (3 pontos de emissão) + métodos getSanitizedBoardForPlayer/getSanitizedSharedBoard. Validado com typecheck + teste manual. Nota: SPEC 05 (FoW) revisará este passo para composição de filtros (mine-hiding + vision) sem duplicar lógica.
- 2026-08-01 — SPEC 06 Passo 2 concluído: módulo roomValidation.ts + guarda RangeError em generateBoard. Validado com typecheck + testes de rejeição.
- 2026-08-01 — SPEC 06 Passo 2 (ajuste): timeLimit forçado a 0 no coop agora propagado por validateRoomCreate ao createRoom (antes era descartado).
