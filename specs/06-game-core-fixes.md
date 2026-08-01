# SPEC 06 — Correções do Core de Jogos (Game Core Fixes)

## 1. Visão geral

Auditoria completa dos modos implementados (Competitive, Multi-board/Race, Cooperative) encontrou **24 problemas concretos** em severidades HIGH/MEDIUM/LOW, mais **mismatches de contrato** entre o servidor (Socket.IO) e o cliente. Esta spec corrige **todos**, em 28 passos ordenados por severidade (4 HIGH, 13 MEDIUM, 7 LOW, 4 docs/contratos).

Princípios:
- **Autoridade no servidor** continua intacta — o cliente nunca conhece posições de minas (correção do vazamento via payload sanitizado).
- **Validação de input no servidor** (modo, tabuleiro, jogadores, tempo) como camada anti-DoS e anti-inconsistência.
- **Um único modelo de pontuação** (vivo, via `calculateScore` de `packages/shared`) — remove o modelo de bônus de fim de jogo, que era duplicado e inconsistente.
- **Contratos documentados** no `CLAUDE.md` batendo com o que o servidor realmente emite.

Dependências com outras specs (ainda não escritas — diretório `specs/` vazio na data desta spec):
- **SPEC 02 — Match Persistence**: implementa escrita de `Match`/`MatchPlayer` (inclui `MatchPlayer.actions`). O Passo 17 desta spec produz os dados (`actions` no payload de `game:ended`); a persistência em si fica na SPEC 02. Não duplicamos implementação aqui.
- **SPEC 04 — Battle Royale**: muda `game:ended 'eliminated'` para broadcast (espectadores). Esta spec só documenta o comportamento atual (Passo 27).
- **SPEC 05 — Fog of War**: sanitização específica de visão (raio). Esta spec (Passo 1) cobre apenas o esconder de minas não reveladas — o Passo 1 deve ser **revisado** quando a SPEC 05 for implementada, para combinar os dois filtros sem conflito.

## 2. Estado atual

| Área | Problema | Evidência |
|---|---|---|
| Payload `game:started` | Envia `Board` crua (com `hasMine: true` por célula) | `apps/server/src/sockets/roomHandler.ts:220-230` (coop), `:237-247` (por jogador), `:97-114` (rejoin) |
| Criação de sala | `boardConfig`, `mode`, `maxPlayers`, `timeLimit` sem validação no servidor | `roomHandler.ts:20,29,33,35` → `generateBoard` com `while (placed < mineCount)` infinito (`packages/shared/src/index.ts:98-111`) |
| Reconexão | Cliente não re-emite `room:join` após reconnect; fallback offline simula partida online | `apps/web/src/lib/socket.ts:24-26`, `apps/web/src/store/gameStore.ts:337,348-367` |
| `revealCell` | Não rejeita célula com bandeira | `apps/server/src/game/GameManager.ts:245-247` |
| First-click | Sem safety no servidor | `GameManager.ts:98,102,109` (nunca passa `safeRow/safeCol`) |
| Bônus coop | 2 dos 3 caminhos de vitória não dão bônus | `GameManager.ts:280-283` (explosão), `:386-389` (bandeira) vs `:317-322` (reveal seguro) |
| Fórmula tempo coop | `600 * ((180 - elapsed)/60)` → 1800 em t=0 | `GameManager.ts:8,321` |
| Bônus de fim | Só aplicado em timeout | `GameManager.ts:214-220` (endByTimer) vs `:191-204` (endGame) |
| Pontuação de bandeiras | Código morto + dois sistemas | `shared/src/index.ts:59-69` (nunca chamado), `GameManager.ts:374-379` (delta 0), `:4-6` (constantes do bônus de fim) |
| Race (multi-board) | Descrição ≠ lógica | `apps/web/src/pages/CreateRoomPage.tsx:27` vs `GameManager.ts:184-189` |
| Coop "shared lives" | Não implementado | `CreateRoomPage.tsx:40`, `CLAUDE.md:97` vs `GameManager.ts:252` (penalidade individual) |
| Vazamento de GameState | Fim por timer não remove do Map | `GameManager.ts:206-225` vs `gameHandler.ts:79,106,137` |
| `room:start` | Navega sem confirmação | `apps/web/src/pages/RoomPage.tsx:104-108`, `apps/web/src/store/roomStore.ts:183-188` |
| Overlay de fim | "Tabuleiro completo" sem tabuleiro completo | `apps/web/src/pages/MatchPage.tsx:242-248` |
| Resultado por jogador | `complete` marca vitória para todos | `gameStore.ts:241`, `MatchPage.tsx:266-275`, `apps/web/src/pages/ResultPage.tsx:43-45` |
| Label de modo | Hardcoded `modeLabels.competitive` | `MatchPage.tsx:344` |
| Histórico de jogadas | `actions: []` sempre | `gameStore.ts:267`, `ResultPage.tsx:181-218`; `MatchPlayer.actions` nunca populado (Prisma: `apps/server/prisma/schema.prisma` `MatchPlayer`) |
| `game:ping` | Handler morto | `apps/server/src/sockets/gameHandler.ts:141-149`; clientes enviam pings via `chat:message` (`RoomPage.tsx:158-166`, `MatchPage.tsx:157-165`) |
| Fallback lazy `startGame` | Recria partida sem broadcast | `gameHandler.ts:29-33` |
| `room:ready` | Ignora payload | `roomHandler.ts:184-196`, `roomStore.ts:170` |
| `mode`/`maxPlayers` | `data.mode as any`; servidor aceita 1 jogador | `roomHandler.ts:29,33,208` |
| Listeners duplicados | 2ª cópia no RoomPage | `apps/web/src/App.tsx:45-46`, `RoomPage.tsx:83-86` |
| Código morto | `checkWin` não usado no servidor; `getScoreboard` com `as any` | `shared:185-192`, `GameManager.ts:410-417` |
| Contratos | Eventos emitidos fora das tabelas do `CLAUDE.md` | `CLAUDE.md:101-105` |

## 3. Requisitos e regras

**Regras globais fixadas por esta spec:**

1. **Nenhuma posição de mina vaza para o cliente.** Todo payload de tabuleiro deve passar por sanitização: `hasMine` só é `true` em células **reveladas** (a mina explodida é renderizada). Células não reveladas recebem `hasMine: false`, mantendo `isFlagged`/`adjacentMines`/`revealedBy` (públicos).
2. **Nenhuma configuração de sala é confiável.** `room:create` valida no servidor: `mode` ∈ `GameMode`; `rows/cols` ∈ [5, 50]; `mines` ∈ [1, `rows*cols − 9`] (safe area 3×3 do first click); `maxPlayers` por modo (BR: 10–50; demais: 2–16); `timeLimit` ∈ {0, 60, 120, 180, 300, 600, 900} com `0` forçado para cooperative.
3. **`generateBoard` nunca itera infinitamente**: lança `RangeError` se `mineCount <= 0 || mineCount >= rows*cols`.
4. **Partida online nunca é simulada no cliente.** Com `isOnlineMatch = true` (entrou via `game:started`), `revealCell`/`flagCell` **sempre** emitem ao servidor, mesmo desconectado; não há fallback offline.
5. **First-click safety vale online**: o primeiro reveal por tabuleiro nunca explode — a mina é realocada para outra célula (fora da vizinhança 3×3) e a contagem de adjacências recalculada. Em `competitive` (tabuleiro clonado), a realocação é propagada para **todos** os jogadores (template guardado no estado).
6. **Um único sistema de pontuação** (vivo, via `calculateScore`): `reveal +10`, `flood-fill +30`, `flag-correct +25`, `flag-wrong −15`, `explode −50`, `win +200` (coop). Bandeira: simétrico (colocar e remover bandeira revertem o delta). **Removido** o `calculateEndGameBonus` (constants `CORRECT_FLAG_POINTS/WRONG_FLAG_PENALTY/REVEALED_CELL_POINTS`).
7. **Cooperativo**: bônus de vitória `+200` + bônus de tempo nas 3 rotas de vitória (reveal seguro, explosão da última mina, bandeira da última mina); **vidas compartilhadas `N=3`**; 0 vidas → `game:ended` com `result: 'lose'` (exceto se a explosão que zerou as vidas **completar o tabuleiro** → vitória). Sem timer no coop (`timeLimit` forçado a 0).
8. **Multi-board (Race)**: termina **na hora** em que o primeiro jogador completa o tabuleiro (`endGame('complete')`); esse jogador é o vencedor (rank 1, colocado à frente no scoreboard mesmo com menos pontos).
9. **Fim de jogo unificado**: `endGame(roomId, reason)` é o único caminho — aplica `endedAt`, limpa timer, emite `onGameEnded` (que dispara `game:ended` + `room:state finished`) e **remove o estado do Map**. `endByTimer` vira wrapper (`endedByTimer = true` + `endGame('timeout')`).
10. **Resultado por jogador derivado do rank**: `game:ended` → `won` se rank 1 (ou `result: 'win'` coop para todos; `last_standing` se não eliminado); `lose` para o resto.

## 4. Passos de implementação

### Passo 1 — Sanitizar tabuleiro no payload (severity: HIGH) — Achado 1

- **Arquivos**: `apps/server/src/game/GameManager.ts`; `apps/server/src/sockets/roomHandler.ts`
- **O que fazer**: criar função pura `sanitizeBoardForClient(board: Board): Board` que zera `hasMine` de células não reveladas, e métodos `getSanitizedBoardForPlayer(roomId, playerId)` (modos individuais) / `getSanitizedSharedBoard(roomId)` (coop). Usar nos 3 pontos de emissão de `game:started` do `roomHandler`.
- **Detalhes**:
  - Sanitização: `{ ...cell, hasMine: cell.isRevealed && cell.hasMine }` para cada célula. `isFlagged`, `adjacentMines`, `revealedBy` permanecem (são públicos). A mina revelada (explodida) mantém `hasMine: true` para o render 💣.
  - `roomHandler.ts:220` (coop) → `board: gameManager.getSanitizedSharedBoard(room.id)`; `:237` (por jogador) → `getSanitizedBoardForPlayer(room.id, playerId)`; `:97` (rejoin) → idem.
  - **Cross-ref**: a SPEC 05 (FoW) adicionará filtro de visão (raio) sobre esta mesma função — naquela spec, revise o Passo 1 para composição de filtros (mine-hiding + vision) sem duplicar lógica.
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck`
  - Reprodução manual: abrir uma partida (coop e competitive) com devtools abertos → inspecionar o payload do evento socket `game:started` → **nenhum** `hasMine: true` em célula `isRevealed: false`. Após explodir uma mina, o payload `game:cellRevealed` (`value: 'mine'`) e o render mostram a mina.
  - Rejoin (F5 durante partida): payload do rejoin também sanitizado.

### Passo 2 — Validação de configuração no servidor (severity: HIGH) — Achado 2

- **Arquivos**: novo `apps/server/src/game/roomValidation.ts`; `apps/server/src/sockets/roomHandler.ts`; `packages/shared/src/index.ts`
- **O que fazer**: criar módulo de validação com `validateRoomCreate(data)` que retorna `{ ok: true } | { ok: false; code: string; message: string }`, e chamá-lo no início do handler `room:create` (após resolver o fallback de dificuldade, linha 20, e **antes** de `roomManager.createRoom`). Adicionar guarda defensiva em `generateBoard`.
- **Detalhes**:
  - Constantes no módulo: `BOARD_MIN = 5`, `BOARD_MAX = 50`, `SAFE_AREA_CELLS = 9`, `TIME_LIMITS = new Set([0, 60, 120, 180, 300, 600, 900])`, `MAX_PLAYERS: Record<GameMode, { min: number; max: number }>` com `battle-royale: {10, 50}` e demais `{2, 16}`.
  - Validações: `mode` ∈ union `GameMode` (código `INVALID_MODE`); `rows/cols` inteiros em [5, 50]; `mines` inteiro em [1, `rows*cols − 9`] (`INVALID_BOARD_CONFIG`); `maxPlayers` inteiro em [min, max] do modo (`INVALID_MAX_PLAYERS`); `timeLimit` ∈ `TIME_LIMITS`, e `timeLimit = 0` **forçado** quando `mode === 'cooperative'` (coop não tem timer — `CreateRoomPage.tsx:167` já envia 0; o servidor passa a garantir).
  - Erro emitido via `socket.emit('error', { code, message })`; sala **não** é criada.
  - `packages/shared/src/index.ts:77` — no topo de `generateBoard`: `if (mineCount <= 0 || mineCount >= rows * cols) throw new RangeError(...)` (proteção contra o loop infinito `while (placed < mineCount)` em `:98-111`; a validação acima torna inalcançável, mas o throw é a rede de segurança — proibindo regressões de quem chamar `startGame` direto, ex.: `gameHandler.ts:31`).
  - **Nota**: o fallback de dificuldade em `roomHandler.ts:20` (`DIFFICULTY_CONFIG[data.difficulty]`) pode entregar config inválida se `difficulty` vier corrompida — a validação roda **depois** da resolução, cobrindo esse caso.
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck`
  - Reprodução manual (devtools, emit manual): `socket.emit('room:create', { name: 'x', mode: 'competitive', difficulty: 'medium', isPrivate: false, maxPlayers: 8, boardConfig: { rows: 5, cols: 5, mines: 25 }, timeLimit: 180 })` → **antes**: servidor travava (loop infinito); **depois**: `error { code: 'INVALID_BOARD_CONFIG' }` e servidor responsivo.
  - Testar também: `mines: 17` em 5×5 (≥ 25−9) → rejeitado; `maxPlayers: 1` → `INVALID_MAX_PLAYERS`; `mode: 'xablau'` → `INVALID_MODE`; coop com `timeLimit: 180` → sala criada com `timeLimit: 0`.

### Passo 3 — Reconexão sem desync (severity: HIGH) — Achado 3

- **Arquivos**: `apps/web/src/store/roomStore.ts`; `apps/web/src/store/gameStore.ts`
- **O que fazer**: (a) no handler `connect` do `roomStore`, re-emitir `room:join` se houver `currentRoom`; (b) adicionar flag `inOnlineMatch` no `gameStore`, setada em `game:started` e usada como gate no lugar de `isOnline`; (c) confirmar que o rejoin do servidor restaura o mapeamento `socketToRoom`.
- **Detalhes**:
  - (a) `roomStore.ts:43-46` — handler `connect` atual faz `set({ isConnected: true }); fetchRooms()`. Adicionar: `const roomId = get().currentRoom?.id; if (roomId) socket.emit('room:join', { roomId })`. O servidor já trata rejoin com partida ativa re-enviando `game:started` (`roomHandler.ts:93-116`) e restaurando `socketToRoom`/`playerSockets`/`isConnected` (`RoomManager.ts:84-95`) — caminho consistente, falta apenas o cliente emitir.
  - (b) `gameStore.ts`: novo estado `inOnlineMatch: boolean` (default `false`); setar `true` no handler `game:started` (`:110-149`) e `false` em `resetGame` (`:480-496`) e no handler `game:ended`. Trocar os gates de `revealCell` (`:337`) e `flagCell` (`:447`) de `if (state.isOnline)` para `if (state.isOnline || state.inOnlineMatch)` — com isso, após reconnect (socket ainda `disconnected`), o cliente **emite** (o servidor descarta reveladas perdidas, mas o estado não diverge); o fallback offline de primeiro clique (`:348-367`) e a simulação single-player só existem em jogo realmente offline.
  - (c) Sem mudança no servidor: `rejoinRoom` já restaura o mapeamento. Limite documentado: jogador removido após 60s (`RoomManager.ts:186-189`) recebe `game:removedForInactivity` ao tentar rejoin (`roomHandler.ts:123-129`).
- **Como validar este passo**:
  - `cd apps/web && npm run typecheck`
  - Reprodução manual: entrar numa partida online → devtools → Network/offline (ou `socket.disconnect()` no console) → clicar em uma célula → **nada muda no tabuleiro** (sem simulação offline, sem re-roll de primeiro clique); religar → `game:started` (rejoin) chega com o estado real do servidor; reveladas perdidas durante a queda não divergem.
  - Verificar que o fallback offline continua funcionando para o modo single-player/offline (board gerado localmente).

### Passo 4 — Bloquear revelar célula com bandeira (severity: HIGH) — Achado 4

- **Arquivos**: `apps/server/src/game/GameManager.ts`
- **O que fazer**: adicionar guarda `isFlagged` em `revealCell`, antes da guarda `isRevealed`.
- **Detalhes**: em `GameManager.ts:245-247`, após `if (!cell) ...`, inserir `if (cell.isFlagged) return { success: false, error: 'Remova a bandeira antes de revelar' }`. O `gameHandler.ts:38-41` já propaga `result.error` via evento `error` — sem mudança lá. (O path offline já bloqueia: `gameStore.ts:346`.)
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck`
  - Reprodução manual: na partida online, marcar bandeira em uma célula e clicar nela → servidor responde `error { code: 'REVEAL_FAILED' }`, célula permanece com bandeira e não revelada (nada acontece visualmente).

### Passo 5 — First-click safety no servidor (severity: MEDIUM) — Achado 5

- **Arquivos**: `packages/shared/src/index.ts`; `apps/server/src/game/GameManager.ts`
- **O que fazer**: adicionar em `shared` um helper puro `relocateMine(board, safeRow, safeCol): boolean` (e recálculo de adjacências), e no `GameManager` garantir o primeiro reveal seguro em todos os modos.
- **Detalhes**:
  - `shared/src/index.ts` — novo export:
    - `relocateMine(board, safeRow, safeCol)`: procura uma célula aleatória que **não** seja mina e **não** esteja na vizinhança 3×3 de `(safeRow, safeCol)` (inclusive ela mesma); move a mina para lá (swap `hasMine`); recalcula `adjacentMines` das vizinhanças das duas células envolvidas; retorna `false` se não houver célula alvo (impossível com a regra `mines <= rows*cols − 9` do Passo 2, mas retorna `false` por segurança).
    - O cliente offline continua com a estratégia atual de **regenerar** o board com `safeRow/safeCol` (`gameStore.ts:349-355`) — sem mudança.
  - `GameManager.ts` — `GameState` ganha `firstRevealDone: Map<string, boolean>` (chave = boardId: `shared` no coop, `playerId` nos demais) e `template?: Board` (competitive). Em `startGame` (`:86-134`), para competitive guardar o template gerado (`:109`).
  - Em `revealCell` (`:227+`), **antes** do bloco `if (cell.hasMine)` (`:250`): se `firstRevealDone.get(boardId)` é falsy → marca `true` e, se a célula tem mina, chama `relocateMine` (competitive: sobre `template` e **propaga a célula alterada para todos os boards dos jogadores** — todas as cópias devem permanecer idênticas; multi-board: só o board do jogador; coop: o board compartilhado) e prossegue como reveal seguro.
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck`
  - Reprodução manual: partida competitive online → revelar uma mina como **primeiro** clique → célula abre com número (payload `game:cellRevealed` com `value` numérico, sem `exploded: true`); segundo jogador revela a mesma célula → mesmo resultado (boards sincronizados). Repetir em multi-board e coop.

### Passo 6 — Bônus de vitória cooperativo em todos os caminhos (severity: MEDIUM) — Achado 6

- **Arquivos**: `apps/server/src/game/GameManager.ts`
- **O que fazer**: extrair helper privado `awardCoopWin(state, playerId, entry)` que soma `calculateScore('win')` + bônus de tempo (fórmula corrigida no Passo 7) e chama `endGame(roomId, 'win')`; usar nos 3 caminhos.
- **Detalhes**:
  - Caminho 1 — reveal seguro: `GameManager.ts:317-322` (já soma; passa a usar o helper).
  - Caminho 2 — explosão da última mina: `:280-283` → antes de `endGame('win')`, chamar o helper para o jogador que explodiu (a vitória é da equipe, mas o bônus de `win` vai para quem completou — decisão documentada; os demais recebem apenas o bônus de fim de jogo, que será removido no Passo 9 → na prática o completador leva o `+200` + tempo).
  - Caminho 3 — bandeira da última mina: `:386-389` → idem, para o jogador que marcou a última bandeira.
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck`
  - Reprodução manual: partida coop com 1 mina restante → (a) revelar mina (explosão) e (b) marcar bandeira na última mina → em ambos, `game:ended` com `result: 'win'` e o completador com `+200` + bônus de tempo no score final (comparar com o `game:scoreUpdate` anterior).

### Passo 7 — Fórmula do bônus de tempo cooperativo (severity: MEDIUM) — Achado 7

- **Arquivos**: `apps/server/src/game/GameManager.ts`
- **O que fazer**: corrigir a fórmula de `:321` e documentar a decisão.
- **Detalhes**:
  - **Decisão (documentada no código)**: manter o bônus de tempo no coop (premia ritmo) com fórmula corrigida e clampada: `COOP_TIME_BONUS_MAX = 600` e `COOP_IDEAL_TIME_SECONDS = 300` → `timeBonus = Math.round(600 * Math.max(0, Math.min(1, (300 - elapsed) / 300)))` → em t=0 dá 600 (não 1800), decai linearmente até 0 em 300s. Motivo de 300s: o coop não tem timer (`timeLimit: 0` por design — `CreateRoomPage.tsx:79,167` e Passo 2), então a linha de base é generosa; jogos que passam de 5 min não perdem pontos do bônus de tempo, apenas não ganham.
  - A fórmula antiga tratava `elapsed` (segundos) como minutos (`/60`) e tinha "180" mágico: `600 * ((180 - elapsed) / 60)` → 1800 pontos instantâneos. Removida.
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck`
  - Reprodução manual: partida coop resolvida em < 5s → bônus exibido ≈ 600 (nunca > 600). Resolver após 300s → bônus 0. Nenhum score final acima do teto teórico.

### Passo 8 — Unificar fim de jogo: endGame é o único caminho (severity: MEDIUM) — Achado 8

- **Arquivos**: `apps/server/src/game/GameManager.ts`; `apps/server/src/sockets/gameHandler.ts`
- **O que fazer**: mover a finalização para `endGame` e transformar `endByTimer` em wrapper; **remover o bônus de fim de jogo** (consequência do Passo 9 — não há mais nada a aplicar no fim).
- **Detalhes**:
  - `endGame` (`:191-204`): mantém `endedAt`, limpa timer; depois de `onGameEnded?.(...)`, adiciona `this.games.delete(roomId)` (vazamento do Passo 12) e `this.onGameEnded` do `index.ts` já emite `game:ended` + `room:state finished` (`index.ts:31-46`).
  - `endByTimer` (`:206-225`): vira `endByTimer(roomId) { const state = ...; if (!state || state.endedAt) return []; state.endedByTimer = true; this.endGame(roomId, 'timeout'); return this.getScoreboard(roomId) }` — o loop de bônus (`:214-220`) é **removido** (bônus de fim de jogo não existe mais — ver Passo 9). Isso elimina a inconsistência "bônus só em timeout".
  - `gameHandler.ts:79,106,137` (`removeGame`) tornam-se no-ops seguros (o estado já sai do Map via `endGame`). Manter por idempotência ou remover — recomendado **remover** e manter `removeGame` apenas para uso externo (ex.: jogador remove o board, `GameManager.removePlayerBoard :171-182`).
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck`
  - Reprodução manual: partida com timer de 60s → aguardar → `game:ended result: 'timeout'` emitido, `room:state` com `status: 'finished'`, e **sem** pontuação adicional de fim (scores congelam no último `game:scoreUpdate`).

### Passo 9 — Modelo único de pontuação de bandeiras (severity: MEDIUM) — Achado 9

- **Arquivos**: `apps/server/src/game/GameManager.ts`; `apps/server/src/sockets/gameHandler.ts`; `apps/web/src/store/gameStore.ts`
- **O que fazer**: pontuar bandeiras **ao vivo** com as constantes de `shared` (`flag-correct +25`, `flag-wrong −15`), simétrico para remoção de bandeira; remover `calculateEndGameBonus` e as constantes `CORRECT_FLAG_POINTS/WRONG_FLAG_PENALTY/REVEALED_CELL_POINTS`.
- **Detalhes**:
  - **Decisão**: um só modelo — tudo é pontuado ao vivo via `calculateScore` (`shared:59-69`). O `calculateEndGameBonus` (`GameManager.ts:57-77`) duplicava a contagem (reveals já pontuam `+10/+30` ao vivo; flags já pontuam com o Passo 9) e só rodava em timeout — **removido integralmente**. Documentar no código.
  - `flagCell` (`:350-400`): ao **colocar** bandeira, `delta = calculateScore(cell.hasMine ? 'flag-correct' : 'flag-wrong')`; ao **remover**, `delta = -delta` (simétrico, evita farm por flag/unflag repetidos); somar em `entry.score`. O `boardComplete` check permanece.
  - `gameHandler.ts` `game:flag` (`:110-139`): além de `game:cellFlagged`, emitir `game:scoreUpdate` com `delta` (como em `:95-99`); propagar `result.error` via `error` quando `!result.success` (hoje é `return` silencioso em `:122`).
  - `gameStore.ts` `game:cellFlagged` (`:195-209`) e `game:scoreUpdate` (`:210-216`) já aplicam delta na lista de jogadores — sem mudança.
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck` · `cd apps/web && npm run typecheck`
  - Reprodução manual: marcar bandeira em mina → `game:scoreUpdate delta +25`; marcar em casa segura → `-15`; remover → delta reverso. Ao terminar partida por `timeout` ou `complete`, o score final **não** muda (sem bônus de fim).

### Passo 10 — Lógica de vitória do Multi-board (Race) (severity: MEDIUM) — Achado 10

- **Arquivos**: `apps/server/src/game/GameManager.ts`
- **O que fazer**: **Decisão (a)** — encerrar a partida quando o **primeiro** jogador completa o tabuleiro; o completador é o vencedor (rank 1), demais rankeados por score. Não usar mais `checkAllPlayersDone` em multi-board.
- **Detalhes**:
  - Em `revealCell` e `flagCell`, quando `boardComplete` e `mode === 'multi-board'` → `endGame(roomId, 'complete')` imediatamente (não aguardar os demais).
  - `getScoreboard` (`:410-417`) ganha parâmetro opcional `priorityPlayerId?: string`: ordena por score desc e, se `priorityPlayerId` informado, move essa entrada para o índice 0 (rank 1) — o primeiro a limpar vence mesmo com menos pontos (fiel a "Quem limpar primeiro vence", `CreateRoomPage.tsx:27`).
  - `endGame` é chamado de dentro do fluxo de reveal/flag — o `playerId` do completador é passado adiante até `onGameEnded`/`getScoreboard`.
  - Grace note (comentário no código): alternativa (b) (aguardar todos) foi descartada por contradizer a copy da UI; o fim imediato mantém a emoção da corrida.
  - Competitive continua com `checkAllPlayersDone` (`:184-189`) — todos completam e o ranking decide.
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck`
  - Reprodução manual: partida multi-board com 2 jogadores → jogador A limpa primeiro → `game:ended result: 'complete'` imediato, A rank 1 (mesmo que B tivesse mais pontos); B vê `game:ended` e vai para o resultado com rank 2.

### Passo 11 — Vidas compartilhadas no Cooperativo (severity: MEDIUM) — Achado 11

- **Arquivos**: `apps/server/src/game/GameManager.ts`; `apps/server/src/index.ts`; `apps/web/src/store/gameStore.ts`; `apps/web/src/pages/MatchPage.tsx`
- **O que fazer**: **Decisão** — implementar vidas de equipe `N = 3` (`COOP_TEAM_LIVES`): explosão decrementa; 0 → `endGame('lose')`; exceto se a explosão completar o tabuleiro → vitória (Passo 6). Copy do CreateRoomPage/CLAUDE.md permanece válida.
- **Detalhes**:
  - `GameState` ganha `teamLives?: number` (inicializado `COOP_TEAM_LIVES` quando `mode === 'cooperative'`, `:116-126`). Novo `GameEndReason: 'lose'` (`:45`).
  - Bloco de explosão (`:249-294`): se coop → `state.teamLives!--`; se `teamLives <= 0` e `!isBoardComplete(board)` → `endGame(roomId, 'lose')` (payload de explosão inclui `teamLives: 0`); se completou → caminho de vitória do Passo 6. Penalidade individual `-50` (`:252`) permanece (score é por jogador mesmo no coop).
  - `index.ts:31-46` `onGameEnded`: `reason === 'lose'` passa no broadcast normal (emite `game:ended` com `result: 'lose'`).
  - **Cross-ref**: a SPEC 05 trata regras de eliminação do FoW — esta spec mantém o mínimo para coop (vidas compartilhadas, sem eliminação individual: `game:playerEliminated` não é emitido em coop).
  - Cliente: `gameStore.ts` ganha `teamLives: number`; setado no handler `game:started` (payload `teamLives?`) e atualizado no payload de explosão de `game:cellRevealed` (`:160-168`, campo `teamLives?`). `MatchPage.tsx` HUD: quando `gameMode === 'cooperative'`, exibir `❤️ {teamLives}` (badge próximo ao timer, `:193-200`).
  - Payloads: `game:started` passa a incluir `teamLives?: number` (coop); explosão de `game:cellRevealed` inclui `teamLives?: number` (coop).
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck` · `cd apps/web && npm run typecheck`
  - Reprodução manual: partida coop → explodir 3 minas → `game:ended result: 'lose'`, todos vão para o resultado como derrotados; HUD mostra 3 → 2 → 1 → 0. Explodir a última mina com 1 vida restante → **vitória** (com bônus). Jogadores não são eliminados individualmente em nenhum momento.

### Passo 12 — Limpar GameState no fim por timer (severity: MEDIUM) — Achado 12

- **Arquivos**: `apps/server/src/game/GameManager.ts`
- **O que fazer**: garantir que `endByTimer` remova o estado do Map.
- **Detalhes**: implementado pelo Passo 8 — `endByTimer` agora delega a `endGame`, que executa `this.games.delete(roomId)` ao final. Antes, o estado vazava para sempre (só `gameHandler` removia em caminhos client-driven, `gameHandler.ts:79,106,137`).
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck`
  - Reprodução manual: partida com timer curto (60s) → aguardar timeout → no log do servidor, confirmar `removeGame`/delete do estado (adicionar `console.log` temporário se necessário) e que um `game:reveal` posterior responde `REVEAL_FAILED`/`Partida não encontrada` (após `room.status === 'finished'`, o guard de `gameHandler.ts:23` nem chega ao GameManager).

### Passo 13 — Navegar para a partida só com confirmação (severity: MEDIUM) — Achado 13

- **Arquivos**: `apps/web/src/pages/RoomPage.tsx`; `apps/web/src/store/roomStore.ts`
- **O que fazer**: remover o `setTimeout(navigate, 500)` de `handleStartGame`; a navegação passa a acontecer **apenas** quando `room.status === 'playing'` (efeito existente em `RoomPage.tsx:135-141`, alimentado pelo handler de `game:started` do `roomStore.ts:73-90`). Falhas (`NOT_ALL_READY`, `NOT_HOST`) param de navegar e ficam visíveis.
- **Detalhes**:
  - `handleStartGame` (`:104-108`): só `startGame()` (mantém `isNavigatingToMatch.current = true` para não disparar `leaveRoom` no unmount).
  - `roomStore.startGame` (`:183-188`): registrar listener one-shot de `error` (padrão idêntico ao de `createRoom`, `:119-135`) que seta `error` no store e se remove; remover o listener no próprio handler.
  - `RoomPage`: exibir `roomError` quando houver sala carregada (atualmente o erro só aparece no branch "sala não encontrada", `:179-186`): banner/alerta inline acima do roster quando `roomError` e `currentRoom` existirem.
  - **Cross-ref**: o fallback de 500ms existia porque o servidor não emitia `room:state` após `room:start` — o cliente depende de `game:started` (via roomStore) para ver `status: 'playing'`; confirmar que isso continua cobrindo o fluxo (é o caso — `roomHandler.ts:214-215` + broadcast `game:started` em `:220-250`).
- **Como validar este passo**:
  - `cd apps/web && npm run typecheck`
  - Reprodução manual: sala com 1 jogador → no console: `useRoomStore.getState().startGame()` → **nenhuma** navegação para `/partida/...`, erro `NOT_ALL_READY` visível na página. Com 2+ prontos → inicia e navega normalmente.

### Passo 14 — Overlay 'Tabuleiro completo' só quando completo (severity: MEDIUM) — Achado 14

- **Arquivos**: `apps/web/src/pages/MatchPage.tsx`
- **O que fazer**: gate do overlay por `boardComplete`, não por `timeRemaining === 0`.
- **Detalhes**: `:242` — `{(boardComplete || (timeRemaining === 0 && gameMode !== 'cooperative')) && ...}` → `{boardComplete && (...)}`. No timeout o jogo já termina via `game:ended` (`gameState 'lost'` → banner e navegação em `:104-109`), então o overlay intermediário "Tabuleiro completo" sobre tabuleiro incompleto não faz sentido.
- **Como validar este passo**:
  - `cd apps/web && npm run typecheck`
  - Reprodução manual: partida com timer (60s) sem completar o tabuleiro → ao zerar o tempo, **nenhum** overlay "Tabuleiro completo" aparece (banner de fim aparece direto). Completar o tabuleiro → overlay aparece normalmente.

### Passo 15 — Resultado por jogador derivado do rank (severity: MEDIUM) — Achado 15

- **Arquivos**: `apps/web/src/store/gameStore.ts`
- **O que fazer**: substituir o mapeamento atual (`:237-245`) por derivação per-player do scoreboard de `game:ended`.
- **Detalhes**:
  - `const rank = ev.scoreboard.find(e => e.playerId === state.currentUserId)?.rank` (scoreboard já contém `rank`, `:234`).
  - Regras: `result === 'win'` (coop) → `won` para todos; `result === 'last_standing'` → `won` se não eliminado; `result === 'lose'` (novo, Passo 11) → `lost`; `timeout`/`complete` → `won` se `rank === 1`, senão `lost`.
  - `showConfetti: isWin`; `showBoom: result === 'eliminated' || result === 'lose'` (o boom visual já é disparado pelo `game:cellRevealed` com `exploded`).
  - `winner` de `lastMatchResult` (`:263`) continua sendo `scoreboard[0]?.playerId` — consistente com o rank.
  - **Nota de copy**: com o fix, um jogador que termina em 2º vê banner `BOMBARDEADO!` (consistente, não contraditório). Ajuste de copy do banner (ex.: "PERDEU!") é opcional/fora de escopo.
- **Como validar este passo**:
  - `cd apps/web && npm run typecheck`
  - Reprodução manual: multi-board com 2 jogadores onde você termina em 2º → banner **sem** "VITÓRIA!" (não mais todos vitoriosos). Coop ganho → todos veem VITÓRIA. Coop perdido (Passo 11) → todos veem derrota.

### Passo 16 — Label de modo dinâmico no MatchPage (severity: MEDIUM) — Achado 16

- **Arquivos**: `apps/web/src/pages/MatchPage.tsx`
- **O que fazer**: `:344` — `{modeLabels.competitive}` → `{modeLabels[gameMode]}`.
- **Detalhes**: `gameMode` já vem do store (setado em `game:started`, `gameStore.ts:128`). Sem mudança de tipos (`Record<GameMode, string>` já é completo, `:20-26`).
- **Como validar este passo**:
  - `cd apps/web && npm run typecheck`
  - Reprodução manual: iniciar partida **cooperativa** → painel "Info da Partida" mostra "Modo: **Cooperativo**" (antes: "Competitivo").

### Passo 17 — Histórico de jogadas (actions) no payload de game:ended (severity: MEDIUM) — Achado 17

- **Arquivos**: `apps/server/src/game/GameManager.ts`; `apps/server/src/index.ts`; `apps/web/src/store/gameStore.ts`
- **O que fazer**: o `GameManager` registra as ações por jogador (reveal/flood-fill/flag/explode/win com coordenadas e timestamp) e as inclui no payload de `game:ended`; o cliente popula `lastMatchResult.actions` com elas.
- **Detalhes**:
  - `GameState` ganha `actions: Array<{ playerId: string; type: 'reveal' | 'flood-fill' | 'flag-correct' | 'flag-wrong' | 'explode' | 'win'; cellId?: string; points: number; timestamp: string }>` — mesmo shape de `GameAction` do cliente (`gameStore.ts:24-29`, que já inclui `timestamp`).
  - `revealCell`/`flagCell` registram a ação a cada mutação de score (usar os mesmos `calculateScore` do Passo 9; explosão → `explode`; `win` no coop → ação `win` do completador). `timestamp = new Date().toISOString()`.
  - `index.ts:31-46`: o payload de `game:ended` ganha `actions` (lido do estado **antes** do delete do Passo 8 — atenção à ordem: `onGameEnded` é chamado por `endGame` **antes** do `this.games.delete`).
  - `gameStore.ts` `game:ended` (`:231-270`): `actions: ev.actions ?? []` em vez de `actions: []` (`:267`).
  - **Dependência**: a persistência de `MatchPlayer.actions` (schema Prisma `actions Json?`) é implementada na **SPEC 02** — este passo só produz e transporta os dados; o critério de aceite final do passo depende de 02 estar implementada.
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck` · `cd apps/web && npm run typecheck`
  - Reprodução manual: jogar uma partida até o fim → página de resultado mostra "Histórico de Jogadas" com as ações reais (reveladas, explosões, bandeiras, vitória) e pontos; antes, lista vazia.

### Passo 18 — Remover handler game:ping (severity: LOW) — Achado 18

- **Arquivos**: `apps/server/src/sockets/gameHandler.ts`
- **O que fazer**: **Decisão (recomendada)**: remover o handler `game:ping` (`:141-149`) — os pings já funcionam via `chat:message` (`RoomPage.tsx:158-166`, `MatchPage.tsx:157-165`), e o handler emitia `playerId: socket.id` inconsistente com o `userId` usado no resto.
- **Detalhes**: remover o bloco `socket.on('game:ping', ...)`. Atualizar `CLAUDE.md` no Passo 25 (remover `game:ping` da tabela client→server).
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck`
  - Reprodução manual: `grep -r "game:ping" apps/` → apenas referência residual em docs (após Passo 25, nenhuma). Cliques em "Reações Rápidas" continuam chegando como `chat:message`.

### Passo 19 — Remover fallback lazy de startGame (severity: LOW) — Achado 19

- **Arquivos**: `apps/server/src/sockets/gameHandler.ts`
- **O que fazer**: **Decisão (recomendada)**: remover o fallback de `:29-33` e emitir erro.
- **Detalhes**: se `!gameManager.getGame(room.id)` → `socket.emit('error', { code: 'GAME_NOT_FOUND', message: 'Partida não encontrada' })` e `return`. O fallback recriava a partida **sem** re-emitir `game:started`, deixando os clientes com boards velhos (estado dessincronizado). Com o Passo 12, o estado só não existe em condições anômalas (ex.: restart do servidor), que devem ser um erro explícito, não uma recriação silenciosa.
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck`
  - Reprodução manual: em uma partida ativa, reiniciar o servidor → no cliente, revelar uma célula → `error { code: 'GAME_NOT_FOUND' }` (sem board recriado nem tela "quebrada").

### Passo 20 — room:ready honra data.ready (severity: LOW) — Achado 20

- **Arquivos**: `apps/server/src/rooms/RoomManager.ts`; `apps/server/src/sockets/roomHandler.ts`; `apps/web/src/store/roomStore.ts`
- **O que fazer**: servidor aplica o valor enviado; cliente envia o valor novo (não `{ready: true}` fixo).
- **Detalhes**:
  - `RoomManager` (`:202-210`): novo método `setReady(roomId, playerId, ready: boolean)` (seta `isReady` explícito; `toggleReady` permanece para compatibilidade ou é removido junto com o único caller).
  - `roomHandler.ts:184-196`: `const ready = data?.ready; if (typeof ready === 'boolean') roomManager.setReady(...) else roomManager.toggleReady(...)` (back-compat para clientes antigos).
  - `roomStore.ts:162-181` (`toggleReady`): calcular `nextReady = !playerAtual.isReady` e emitir `socket.emit('room:ready', { ready: nextReady })`; manter o update local otimista (`:173-180`).
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck` · `cd apps/web && npm run typecheck`
  - Reprodução manual: clicar "Pronto" → `room:state` com `isReady: true`; clicar de novo → `isReady: false` no estado do servidor (refletido para todos os jogadores). Com a correção, é impossível o estado do servidor divergir do botão.

### Passo 21 — Validar mode contra a union GameMode (severity: LOW) — Achado 21

- **Arquivos**: `apps/server/src/sockets/roomHandler.ts` (via módulo do Passo 2)
- **O que fazer**: usar `validateRoomCreate` para rejeitar `mode` fora da union.
- **Detalhes**: hoje `data.mode as any` (`:29`) faz modo inválido cair no clone competitive (`GameManager.ts:108-114`), e `RoomPage.tsx:213` renderiza `modeLabels[undefined]` (undefined). O Passo 2 já cobre: `INVALID_MODE` antes de criar a sala. Este passo é o fechamento do teste manual específico.
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck`
  - Reprodução manual: `socket.emit('room:create', { ..., mode: 'abc' })` → `error { code: 'INVALID_MODE' }`; sala não criada (`room:created` não emitido).

### Passo 22 — Validar maxPlayers por modo (severity: LOW) — Achado 22

- **Arquivos**: `apps/server/src/sockets/roomHandler.ts` (via módulo do Passo 2)
- **O que fazer**: clamp/validação por modo (BR 10–50; demais 2–16), espelhando o cliente (`CreateRoomPage.tsx:350-351`).
- **Detalhes**: hoje o servidor aceita `maxPlayers: 1` (sala impossível de iniciar — `roomHandler.ts:208` exige `>= 2`) ou valores gigantes. O Passo 2 valida os intervalos e rejeita com `INVALID_MAX_PLAYERS`; este passo é o fechamento do teste manual.
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck`
  - Reprodução manual: `room:create` com `maxPlayers: 1` → `error INVALID_MAX_PLAYERS`; com `maxPlayers: 99` → rejeitado; BR com `maxPlayers: 8` → rejeitado (mínimo 10).

### Passo 23 — Deduplicar listeners de socket (severity: LOW) — Achado 23

- **Arquivos**: `apps/web/src/pages/RoomPage.tsx`
- **O que fazer**: remover a segunda inscrição de `initSocketListeners`.
- **Detalhes**: `App.tsx:45-46` já registra os listeners globais de `gameStore`/`roomStore` (SocketManager roda enquanto autenticado e persiste entre rotas). `RoomPage.tsx:83-86` registra cópia duplicada a cada mount (idempotente, mas cada evento processado 2× — `room:state` setado 2×, handlers de `game:started` duplos, etc.). Remover `const cleanup = initSocketListeners()` e seu `cleanup()` no return. Manter o listener local de `chat:message` (`:73-81`) e o `joinRoom` (`:65-71`).
- **Como validar este passo**:
  - `cd apps/web && npm run typecheck` · `npm run lint`
  - Reprodução manual: montar/desmontar a página de sala várias vezes → cada evento socket processado uma única vez (adicionar `console.log` temporário no handler de `room:state` e contar ocorrências por emissão; ou inspecionar que `chat:message` não duplica mensagens).

### Passo 24 — Código morto/duplicado (severity: LOW) — Achado 24

- **Arquivos**: `apps/server/src/game/GameManager.ts`
- **O que fazer**: adicionar `rank` ao tipo `GameScoreEntry` e remover o `as any` de `getScoreboard`; documentar `checkWin`.
- **Detalhes**:
  - `GameScoreEntry` (`:12-15`): adicionar `rank: number`; `getScoreboard` (`:410-417`) mapeia `{ ...entry, rank: i + 1 }` tipado (remover `as any`). Os consumers (`index.ts:35-39`, `gameHandler.ts:67-71`) já re-mapeiam — sem quebra.
  - `checkWin` (`shared:185-192`): **manter** (é usado pelo path offline do cliente, `gameStore.ts:400`) — documentar com comentário que é client-only (o servidor usa `isBoardComplete`, `shared:171-182`).
  - `calculateScore` `flag-correct/flag-wrong` deixam de ser inalcançáveis após o Passo 9.
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck`
  - Verificação: nenhum `as any` restante em `getScoreboard`; `grep checkWin packages/shared apps/server` → uso só no cliente.

### Passo 25 — Atualizar tabelas de eventos do CLAUDE.md (severity: docs) — Achados de contrato

- **Arquivos**: `CLAUDE.md` (e `docs/ARCHITECTURE.md` se existir tabela equivalente)
- **O que fazer**: corrigir as tabelas de Socket.IO (`CLAUDE.md:101-105`).
- **Detalhes**:
  - **Client → Server**: remover `game:ping` (Passo 18). Manter: `room:create`, `room:join`, `room:leave`, `room:ready`, `room:start`, `room:list`, `game:reveal`, `game:flag`, `chat:message` (adicionar `room:create` e `room:list`, que estavam faltando).
  - **Server → Client**: adicionar `room:created` (`roomHandler.ts:40`), `game:playerBoardComplete` (`gameHandler.ts:75,102,133`), `game:playerRemoved` (`index.ts:53`), `game:removedForInactivity` (`roomHandler.ts:126`). Manter os existentes. Documentar novos campos: `teamLives?: number` em `game:started` e na explosão de `game:cellRevealed` (Passo 11); `actions` em `game:ended` (Passo 17).
- **Como validar este passo**:
  - Conferência: para cada evento da tabela, existe emissão real no código (`grep -rn "socket.emit\|io.emit\|io.to" apps/server/src`); para cada emissão, existe entrada na tabela.

### Passo 26 — Documentar as shapes do game:cellRevealed (severity: docs) — Contrato

- **Arquivos**: `CLAUDE.md`
- **O que fazer**: documentar as 3 shapes do `game:cellRevealed`.
- **Detalhes**: (1) célula única `{ cellId, value: number, revealedBy }` (`gameHandler.ts:86-90`); (2) batch `{ batch: Array<{ cellId, value, revealedBy }> }` (`:92`); (3) explosão `{ cellId, value: 'mine', revealedBy, exploded: true, teamLives? }` (`:46-51` + Passo 11). O cliente trata as 3 (`gameStore.ts:150-194`). Sem unificação de código (minimalismo); documentar como union de payloads.
- **Como validar este passo**: conferência manual dos 3 shapes contra o código e contra o handler do cliente.

### Passo 27 — Documentar game:ended 'eliminated' (severity: docs) — Contrato

- **Arquivos**: `CLAUDE.md`
- **O que fazer**: documentar que `game:ended` com `result: 'eliminated'` é emitido **somente para o socket eliminado** (`gameHandler.ts:63-73`), enquanto os demais continuam jogando; `game:ended` broadcast (`index.ts:31-46`) só ocorre para os demais reasons.
- **Detalhes**: **Cross-ref SPEC 04** — o BR mudará isso para broadcast/spectators; esta nota fica como "comportamento atual, sujeito a mudança na SPEC 04". Sem mudança de código aqui.
- **Como validar este passo**: conferência manual; nota cruzada com a SPEC 04 quando escrita.

### Passo 28 — Unificar payload de players do game:started (severity: docs) — Contrato

- **Arquivos**: `apps/server/src/sockets/roomHandler.ts`; `CLAUDE.md`
- **O que fazer**: **unificação mínima** — rejoin passa a enviar o shape de `room.players` com `score` atual.
- **Detalhes**: hoje `room:start` envia `room.players` (`:229,246`) e o rejoin envia `{ id, username, avatarUrl, isEligible, score }` (`:107-113`). Alterar o rejoin para `room.players.map(p => ({ ...p, score: gameState.scores.get(p.id)?.score ?? 0 }))` — remove `isEligible` (nunca consumido; `gameStore.ts:142-147` só lê `id/username/score`) e mantém `isReady/isHost/isConnected` públicos. Documentar o shape único no `CLAUDE.md`.
- **Como validar este passo**:
  - `cd apps/server && npm run typecheck`
  - Reprodução manual: F5 durante partida ativa → `game:started` do rejoin traz players com `score` real e mesmas chaves do início; cliente renderiza normalmente.

## 5. Contratos (socket events/types)

**Alterações de payload nesta spec:**

| Evento | Antes | Depois |
|---|---|---|
| `game:started` | `board` crua (vaza `hasMine`) | `board` sanitizada (`hasMine` só em reveladas); `teamLives?: number` (coop); players com shape unificado |
| `game:cellRevealed` (explosão) | `{ cellId, value:'mine', revealedBy, exploded:true }` | + `teamLives?: number` (coop) |
| `game:cellRevealed` (célula única / batch) | — | inalterado (documentado como union no Passo 26) |
| `game:cellFlagged` | `{ cellId, flagged }` | inalterado; **novo** `game:scoreUpdate` acompanhando (delta ao vivo, Passo 9) |
| `game:scoreUpdate` | reveal/explode | + emissão em `game:flag` (Passo 9) |
| `game:ended` | `{ result, scoreboard }` | + `actions: GameAction[]` (Passo 17); novo `result: 'lose'` (coop, Passo 11) |
| `room:ready` (client→server) | `{ ready: true }` fixo | `{ ready: boolean }` real (Passo 20) |
| `room:create` (client→server) | qualquer coisa | validado: `INVALID_MODE/INVALID_BOARD_CONFIG/INVALID_MAX_PLAYERS/INVALID_TIME_LIMIT` |
| `game:ping` | handler existente | **removido** (Passo 18) |
| `game:reveal` | fallback silencioso | `error { code:'GAME_NOT_FOUND' }` se não houver partida (Passo 19) |

**Novos tipos (server):**
- `GameScoreEntry` ganha `rank: number` (Passo 24).
- `GameEndReason` ganha `'lose'` (Passo 11).
- `GameState` ganha `teamLives?`, `firstRevealDone: Map<string, boolean>`, `template?` (competitive), `actions: GameAction[]` (Passos 5, 11, 17).
- Novo módulo `apps/server/src/game/roomValidation.ts`: `validateRoomCreate(data): { ok: true } | { ok: false; code: string; message: string }` (Passo 2).

**Shared (`packages/shared/src/index.ts`):**
- `generateBoard` lança `RangeError` em config inválida (Passo 2).
- Novo export `relocateMine(board, safeRow, safeCol): boolean` (Passo 5).

## 6. Critérios de aceite (checklist testável)

- [ ] **C1 (Passo 1)**: payload `game:started` (criação, jogador-por-jogador e rejoin) não contém `hasMine: true` em célula não revelada — verificado em coop e competitive.
- [ ] **C2 (Passos 2, 21, 22)**: `room:create` com `{5×5, 25 minas}`, `mode` inválido, `maxPlayers: 1` ou `maxPlayers: 99` → erro específico, servidor permanece responsivo (sem loop infinito).
- [ ] **C3 (Passo 3)**: após reconnect em partida ativa, cliente re-emite `room:join`, recebe `game:started` do rejoin e **nunca** simula offline; estado converge ao do servidor.
- [ ] **C4 (Passo 4)**: revelar célula com bandeira → erro `REVEAL_FAILED`, nada acontece.
- [ ] **C5 (Passo 5)**: primeiro clique em mina (online, 3 modos) → célula revela com número, sem explosão; boards competitive sincronizados.
- [ ] **C6 (Passos 6, 7, 8)**: coop vence pelas 3 rotas com `+200` + bônus de tempo (≤ 600, fórmula corrigida); timeout não soma bônus de fim; estado removido do Map.
- [ ] **C7 (Passo 9)**: bandeira correta +25, errada −15, remoção reverte; sem bônus de fim; `game:scoreUpdate` emitido em flag.
- [ ] **C8 (Passo 10)**: multi-board termina no primeiro a limpar, com este em rank 1.
- [ ] **C9 (Passo 11)**: coop com 3 vidas; 3ª explosão → `game:ended 'lose'`; explosão da última mina com 1 vida → vitória.
- [ ] **C10 (Passos 13, 14, 15)**: `room:start` sem confirmação não navega; timeout sem overlay falso; resultado por jogador derivado do rank (sem "VITÓRIA!" para perdedores).
- [ ] **C11 (Passos 16, 17)**: painel "Modo: Cooperativo" correto; "Histórico de Jogadas" populado com actions do servidor.
- [ ] **C12 (Passos 18-24)**: `game:ping` removido; sem fallback lazy; `room:ready` honra payload; listeners únicos; `GameScoreEntry.rank` tipado; typecheck/lint limpos:
  - `cd apps/server && npm run typecheck`
  - `cd apps/web && npm run typecheck` e `npm run lint`
- [ ] **C13 (Passos 25-28)**: `CLAUDE.md` com tabelas de eventos completas, 3 shapes de `game:cellRevealed` documentadas, nota do `'eliminated'` single-socket (SPEC 04), payload de players unificado.
- [ ] **C14 (SPEC 02 dependency)**: após a SPEC 02, `MatchPlayer.actions` persistido com as actions produzidas no Passo 17.

## 7. Fora de escopo

- **Persistência de Match/MatchPlayer/Stats** → SPEC 02 (este spec só produz os dados do Passo 17).
- **Battle Royale** (eliminação/spectators, shrinking boards, `game:ended 'eliminated'` broadcast) → SPEC 04.
- **Fog of War** (raio de visão, sanitização específica) → SPEC 05; o Passo 1 deve ser revisitado lá.
- **Autenticação/OAuth** e **ranking/histórico de páginas** (RankingPage/ProfilePage) → fora do escopo do core de jogo.
- Ajuste de copy de banners ("BOMBARDEADO!" para derrotas sem explosão) — opcional (nota no Passo 15).
- Regeneração do board com safe zone (estratégia do cliente offline) no servidor — descartada em favor de `relocateMine` (Passo 5), por manter o template competitive idêntico.

## 8. Riscos e notas

- **Ordem de implementação crítica**: Passos 2 (validação) e 5 (first-click) dependem um do outro conceitualmente (`mines <= rows*cols − 9` garante célula alvo para `relocateMine`). Passo 8 antes de 12 (12 é consequência de 8). Passo 9 antes de 6/8 (remover bônus de fim simplifica). Passo 11 introduz `result: 'lose'` — o cliente (Passo 15) deve ser aplicado junto, senão `lose` cai em `lost` genérico (aceitável, mas inconsistente).
- **Retrocompatibilidade**: payloads novos usam campos opcionais (`teamLives?`, `actions` com fallback `[]` no cliente) para não quebrar clientes antigos durante deploy.
- **Reconnect (Passo 3)**: reveladas feitas durante a queda são perdidas (o servidor processa apenas o que chega). Isso é intencional (evita divergência); a UI não precisa de fila offline. Jogador removido após 60s já recebe `game:removedForInactivity` — comportamento existente, documentado.
- **Competitive + first-click (Passo 5)**: a realocação de mina no template e propagação para todas as cópias adiciona um ponto de sincronização; cobrir com teste manual multi-cliente (C5) e considerar um teste unitário de `relocateMine` no `packages/shared` (não há test runner configurado hoje — fora de escopo, mas recomendado).
- **Coop time bonus (Passo 7)**: decisão documentada no código (constantes `COOP_TIME_BONUS_MAX`/`COOP_IDEAL_TIME_SECONDS`); se o produto quiser remover o bônus de tempo, a mudança é pontual (um bloco).
- **specs/02/04/05 não existem ainda** nesta data — as cross-references desta spec são nomes canônicos de arquivos planejados; ao criá-los, conferir os números de passos citados aqui.
- **Referências de linha verificadas** em 2026-08-01 contra o código atual; qualquer refactor anterior (ex.: SPEC 05) deve re-verificar os números citados.
