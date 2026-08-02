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
| 06 | [Core fixes da auditoria dos modos (24 itens)](06-game-core-fixes.md) | P1 | 02 (item 17) | Concluída — Passos 1–28 ✓ (fixes de auditoria aplicados) |

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
- 2026-08-01 — SPEC 06 Passo 3 concluído: re-emit de room:join no reconnect + flag inOnlineMatch (sem fallback offline em partida online). Validado com typecheck + teste de reconnect.
- 2026-08-01 — SPEC 06 Passo 4 concluído: bloqueio de revelar célula com bandeira em GameManager.revealCell. Validado com typecheck.
- 2026-08-01 — SPEC 06 Passo 5 concluído: first-click safety no servidor com helper relocateMine em shared + firstRevealDone Map + template competitive. Validado com typecheck.
- 2026-08-01 — SPEC 06 Passo 7 concluído: fórmula do bônus de tempo cooperativo corrigida (COOP_TIME_BONUS_MAX=600, COOP_IDEAL_TIME_SECONDS=300). Validado com typecheck.
- 2026-08-01 — SPEC 06 Passo 9 concluído: modelo único de pontuação de bandeiras ao vivo (+25/-15 simétrico), remoção de calculateEndGameBonus e constantes relacionadas, game:scoreUpdate emitido em flag. Validado com typecheck.
- 2026-08-01 — SPEC 06 Passo 6 concluído: helper awardCoopWin usado nas 3 rotas de vitória coop (reveal seguro, explosão última mina, bandeira última mina). Validado com typecheck.
- 2026-08-01 — SPEC 06 Passo 8 concluído: fim de jogo unificado — endGame remove estado do Map, endByTimer vira wrapper, removeGame removido dos handlers. Validado com typecheck.
- 2026-08-01 — SPEC 06 Passo 10 concluído: Race multi-board termina no primeiro completar + getScoreboard com priorityPlayerId para rank 1. Validado com typecheck.
- 2026-08-01 — SPEC 06 Passo 11 concluído: batalha do tempo — timer server-side com timeLimit do roomConfig + game:timeUpdate a cada segundo.
- 2026-08-01 — SPEC 06 Passo 12 coberto pelo 8: fim de jogo unificado já trata timeUp.
- 2026-08-01 — SPEC 06 Passo 13 concluído: playerEliminated emitido antes de game:ended + removeGame limpa estado.
- 2026-08-01 — SPEC 06 Passo 14 concluído: scoreboard final com rank por prioridade de jogador + actions persistidas.
- 2026-08-01 — SPEC 06 Passo 15 concluído: verificação de win no cooperativo usa checkWin do shared + awardCoopWin.
- 2026-08-01 — SPEC 06 Passo 16 concluído: battle-royale usa lógica competitive + eliminação por vidas.
- 2026-08-01 — SPEC 06 Passo 17 concluído: actions persistidas no MatchPlayer (JSON) para replay/histórico.
- 2026-08-01 — SPEC 06 Passo 18 removido (handler + docs): game:ping handler morto, pings via chat:message.
- 2026-08-01 — SPEC 06 Passo 19 concluído: validação de room:ready honra payload + listener único.
- 2026-08-01 — SPEC 06 Passo 20 concluído: GameScoreEntry tipado com rank opcional.
- 2026-08-01 — SPEC 06 Passo 21/22 cobertos pelo 2: persistência de Match/MatchPlayer/Stats/xp é a Spec 02.
- 2026-08-01 — SPEC 06 Passo 23 concluído: roomValidation exportado e usado em createRoom.
- 2026-08-01 — SPEC 06 Passo 24 concluído: timeLimit propagado ao RoomManager.createRoom.
- 2026-08-01 — SPEC 06 Passo 25 concluído: documentação Socket.IO atualizada (game:ping removido, room:create/list adicionados).
- 2026-08-01 — SPEC 06 Passo 26 concluído: lint errors corrigidos (GameManager, gameHandler, roomHandler).
- 2026-08-01 — SPEC 06 Passo 27 concluído: fixes de documentação (CLAUDE.md, ARQUITETURA.md, Plano).
- 2026-08-01 — SPEC 06 Passo 28 concluído: verificação final typecheck + lint limpas.
