# SPEC 05 — Fog of War (modo completo + anti-cheat)

## 1. Visão geral

O modo **Fog of War** hoje é selecionável de ponta a ponta na UI, porém roda o caminho genérico competitivo: o cliente recebe o **tabuleiro completo com todas as posições de minas** em `game:started` (anti-cheat quebrado) e o modo não tem nenhuma mecânica própria.

Esta spec implementa o modo final conforme regras do product owner:

- Um **único tabuleiro gigante compartilhado** para o time inteiro (mesma mecânica do cooperativo: um board só, autoridade no servidor).
- Cada jogador controla um **peão** posicionado no board, com o **nome acima do peão**.
- Cada peão tem **raio de visão limitado** (R células), definido pelo **host na criação da sala**.
- Fora do campo de visão: o jogador **não vê** outros jogadores nem células já exploradas (**re-fog** quando sai do raio).
- Movimento por **setas/WASD**, passo a passo (grade, 1 célula por tecla).
- **Reveal** = clique esquerdo em célula dentro do raio; **flag** = clique direito dentro do raio.
- Mina revelada elimina **somente aquele jogador** (peão desaparece, vira espectador). O time continua.
- **Vitória**: todas as células seguras reveladas. **Derrota**: todos eliminados.
- **Anti-cheat obrigatório**: o servidor **nunca** envia posições de mina. Todo payload de visibilidade é **calculado e filtrado por jogador no servidor**.

## 2. Estado atual

- `GameMode` já inclui `'fog-of-war'` (`packages/shared/src/index.ts:4`); a UI de criação (`CreateRoomPage.tsx:62-73`), lobby (`LobbyPage.tsx:20`, `:222`), sala (`RoomPage.tsx:23,38`) e partida (`MatchPage.tsx:25`) já conhecem o modo.
- **Vazamento do board**: `apps/server/src/sockets/roomHandler.ts`:
  - `room:start` cooperativo envia o `Board` cru com `hasMine` em `game:started` (linhas 218–230; `io.to(room.id).emit` na 220).
  - Branch não-coop envia `board` por-socket (linhas 231–250). Fog of War cai **neste** branch (clone por jogador, `GameManager.ts:108–114`).
  - Caminho de rejoin envia `board` novamente (linhas 93–116, `getPlayerBoard` na 96).
- Cliente guarda o board verbatim: `apps/web/src/store/gameStore.ts:121–122` (handler de `game:started` aborta se `!ev.board`, linhas 116–119). A renderização só mostra mina quando `isRevealed` (`Cell.tsx:23–46`) — invisível, mas explorável via devtools/cheat.
- `GameManager.ts` (426 linhas): `startGame` 86–134 (coop com board compartilhado 101–107; demais com clone 108–114); `revealCell` 227–348; `flagCell` 350–400; `endGame` 191–204; `checkAllPlayersDone` 184–189; `getScoreboard` 410–417; `PlayerStatus` 10; `GameEndReason` 45. Callbacks `onPlayerEliminated`/`onPlayerBoardComplete` (83–84) nunca são wire-ados em `apps/server/src/index.ts` (só `onGameEnded`, 31–46).
- `gameHandler.ts`: `emitToTarget` 8–14 (coop → broadcast na sala; senão → `socket.emit` por jogador — o plumbing por-socket existe e será reutilizado); `game:reveal` 21–108; `game:flag` 110–139; `game:ping` 141–149.
- Board 44px/célula (`game.css:74–92`), sem estilos de fog; `Board.tsx` renderiza todas as células (19–31) e usa só `--board-cols` (17).
- `MatchPage.tsx:344` mostra label fixo `{modeLabels.competitive}` (bug — ver Passo 7; cross-ref SPEC 06 #16).
- `LobbyPage.tsx:222` descrição do quick-card FoW: "Visão limitada, 1 erro = game over" — **desatualizada** (a regra final é eliminação por jogador, não game over do time).

### Design decisions (valores concretos propostos — válidos como FINAL)

1. **Tabuleiro gigante**: novo preset `gigante: { rows: 30, cols: 30, mines: 150 }` em `DIFFICULTY_CONFIG` (15.6% de densidade; respeita a constraint de `generateBoard` — 150 < 900−9). **E** custom board com máximo elevado de 50 → **60** linhas/colunas. *Por quê*: FoW pede área explorável; 30×30 é o piso razoável para 2–16 peões; 60×60 (máx.) cabe em telas desktop com célula menor (ver Passo 6). Células do FoW: **26px** (`.board--fog`), wrapper com `overflow-x-auto`.
2. **Raio de visão**: novo campo `visionRadius: number` na `Room` (range **2–6**, default **3**), escolhido pelo host na criação, **independente de dificuldade**.
3. **Formato da visão**: **quadrado (Chebyshev)**, R células em cada direção. *Por quê*: checagem de bounds trivial (`|dr|<=R && |dc|<=R`), sem surpresas de geometria de losango, combina com a grade 8-direções do Minesweeper.
4. **Spawn**: células **seguras** (sem mina), sorteadas sem repetição entre peões (Set de ocupados). Board com 900 células e máx. 16 jogadores → colisão praticamente impossível; fallback: se não houver célula livre após N tentativas, empilhar (documentado em Passo 2).
5. **Movimento não dispara mina**: andar sobre célula não revelada (inclusive mina) é permitido; só o **reveal** (clique) dispara a mina. Peão sobre mina não revelada não morre — a mina só ativa quando revelada.
6. **Flood fill limitado ao raio**: o reveal de célula com 0 adjacentes faz flood, mas **só dentro do raio de visão do peão**; células além do raio permanecem fechadas (e não expandem o flood). Implementado como `floodFillLimited` no servidor (Passo 2) — `floodFill` compartilhado fica intacto.
7. **Vitória usa `checkWin`** (todas as seguras reveladas; minas ignoradas — `shared:185–192`), **não** `isBoardComplete` (que exige minas bandeireadas/reveladas, `shared:171–182`). *Por quê*: no FoW as minas são invisíveis — exigir flags tornaria a vitória inalcançável. Bônus de vitória + tempo (padrão coop, `GameManager.ts:317–322`) distribuído a **todos os jogadores vivos**.
8. **Eventos filtrados por visão**: `game:cellRevealed` e `game:cellFlagged` (com valor `'mine'` inclusive) são emitidos **apenas** para sockets cuja visão cobre a célula. `game:playerEliminated` (sem posição de célula) segue broadcast na sala. `game:scoreUpdate` segue broadcast (não vaza posição de mina). Espectador elimina a posição do peão localmente ao receber `game:playerEliminated`.
9. **Eliminado = espectador**: não navega para resultado (diferente de `MatchPage.tsx:111–115`); overlay "Eliminado — assistindo", inputs desabilitados, visão congela (não recebe mais updates — eventos continuam filtrados por visão de peão que não existe mais). Mesmo padrão de espectador da SPEC 04 (aplicar igualmente ao modo da SPEC 04 quando existir).
10. **Eliminação de todos**: `endGame(roomId, 'eliminated')`; como `index.ts:32` ignora `reason === 'eliminated'` no `onGameEnded`, o `gameHandler` emite `game:ended` com `result: 'eliminated'` **para a sala toda** (sobreviventes + eliminados). Cliente trata como `lost` (`gameStore.ts:237–245`).
11. **FoW reusa board compartilhado**: `sharedBoardId = 'shared'` igual ao coop; **todos os lookups** que hoje testam `mode === 'cooperative'` passam a incluir `'fog-of-war'` (`getPlayerBoard` 158, `getBoard` 165, `removePlayerBoard` 174, `revealCell` 241, `flagCell` 364, `endByTimer` 215).
12. **Time limit**: mantém default 300s (`CreateRoomPage.tsx:81`); timeout = derrota por `'timeout'` (cliente já trata como lost). Host pode zerar... (range mínimo 60s no slider atual; manter como está — fora de escopo ajustar).
13. **Cliente mantém array `board`** para o FoW, porém **em branco** (células unrevealed, sem minas), montado no client; os dados reais de visão ficam em mapas separados (`visible`, `fowCells`, `pawns`). Isso preserva o guard de `MatchPage.tsx:124–147` e a renderização de `Board.tsx` sem reescrita estrutural.
14. **Estado de visão por jogador** (servidor): `{ row, col, radius, visible: Set<cellId> }`; conhecimento ("já viu") é derivado do board compartilhado + filtro de visão. O client substitui `pawns` e `visible` **integralmente** a cada `game:visionUpdate` (sync por snapshot, não por diff — mais robusto, custo ínfimo para ≤16 peões).

## 3. Requisitos e regras

- R1 — Um board gigante compartilhado; todos no mesmo time.
- R2 — Peão por jogador com nome acima; movimento por setas/WASD, 1 célula por tecla, 4 direções.
- R3 — Raio de visão R (2–6, default 3), configurado pelo host na criação; independente de dificuldade.
- R4 — Fora da visão: nada de peões alheios nem células reveladas (re-fog). Explorado re-foga ao sair do raio.
- R5 — Reveal/flag só em célula dentro do raio; célula já revelada/bandeirada não aceita reveal.
- R6 — Mina revelada elimina só o autor do reveal (peão some; vira espectador); time continua.
- R7 — Vitória: todas as células seguras reveladas (`checkWin`). Derrota: todos eliminados. Timeout: derrota.
- R8 — Anti-cheat: `game:started` nunca inclui board com `hasMine`; visibilidade sempre computada/filtrada no servidor; server re-valida raio em `game:reveal`/`game:flag`/`game:pawnMove`.
- R9 — Andar não dispara mina; peão pode ocupar célula não revelada (mesmo mina).

## 4. Passos de implementação

### Passo 1 — Shared types: visionRadius, preset Gigante, payloads FoW
- **Arquivos**: `packages/shared/src/index.ts`
- **O que fazer**:
  1. Adicionar `'gigante'` ao union `Difficulty` (linha 5) e ao `DIFFICULTY_CONFIG` (163–168): `gigante: { rows: 30, cols: 30, mines: 150 }`.
  2. Adicionar campo opcional à interface `Room` (36–47): `visionRadius?: number`.
  3. Exportar tipos de payload FoW:
     ```ts
     export interface FoWCellInfo { cellId: string; value: number | 'mine'; isFlagged?: boolean }
     export interface FoWPawnInfo { playerId: string; row: number; col: number }
     export interface FoWStartedPayload {
       boardMeta: { rows: number; cols: number; mines: number; mode: GameMode; timeLimit: number; visionRadius: number }
       position: { row: number; col: number }
       radius: number
       cells: FoWCellInfo[]          // células visíveis e já reveladas (valores apenas)
       pawns: FoWPawnInfo[]          // peões de colegas dentro da visão (sem o próprio)
       players: Array<{ id: string; username: string; score: number; eliminated?: boolean }>
       eliminated?: boolean          // rejoin de jogador já eliminado
     }
     ```
- **Detalhes**: `Difficulty` é usado em `CreateRoomPage`, `LobbyPage`, `RoomPage`, `roomStore` — o typecheck força os mapas a ganharem a chave `'gigante'` (ver Passos 8 e 9). `visionRadius` opcional evita quebrar payloads existentes de `room:list`/`room:state` (só salas FoW enviam). **Não** alterar `generateBoard`/`floodFill` (77–160).
- **Como validar este passo**: `npx tsc --noEmit` em `packages/shared` (se houver tsconfig) ou `npm run typecheck` no server/web — erro de tipo nos mapas de `Difficulty` é o sinal esperado (corrigir nos Passos 8/9). Conferir `DIFFICULTY_CONFIG.gigante.mines < 30*30 - 9`.

### Passo 2 — GameManager: estado FoW, spawn, movimento, reveal/flag com raio, eliminação, vitória/derrota
- **Arquivos**: `apps/server/src/game/GameManager.ts`
- **O que fazer**:
  1. Novos tipos:
     ```ts
     export interface FoWPawn { row: number; col: number }
     export interface FoWData { visionRadius: number; pawns: Map<string, FoWPawn> }
     ```
     Adicionar `fow?: FoWData` a `GameState` (30–43).
  2. `startGame` (86–134): novo branch `else if (mode === 'fog-of-war')` — gerar **um** board compartilhado e setar `sharedBoardId: 'shared'` (igual coop, 101–107); montar `state.fow = { visionRadius, pawns }` e spawnar peões:
     - Coletar células seguras (`!hasMine`), embaralhar, atribuir uma célula única por jogador (Set de ocupados); se esgotar as opções após `players.length * 5` tentativas, aceitar empilhamento.
     - Assinatura: adicionar parâmetro `visionRadius?: number` (default 3) — **os dois call sites** precisam passar: `roomHandler.ts:214` e o fallback `gameHandler.ts:31`.
  3. Todos os lookups de board compartilhado passam a aceitar FoW: `getPlayerBoard` (158), `getBoard` (165), `removePlayerBoard` (174), `revealCell` boardId (241), `flagCell` boardId (364) e `endByTimer` (215): condição `state.mode === 'cooperative' || state.mode === 'fog-of-war'`.
  4. Helper de visão (Chebyshev):
     ```ts
     isInVision(state: GameState, playerId: string, row: number, col: number): boolean
     ```
     e `fowPawnAt(state, playerId)` para leituras de `fow.pawns`.
  5. Novo método `movePawn(roomId, playerId, direction: 'up'|'down'|'left'|'right')`:
     - Valida: game ativo, `playerStatus === 'playing'`, peão existe.
     - `dr/dc` da direção; `0 <= nr < rows && 0 <= nc < cols`; sem outros bloqueios (R9: mina não bloqueia, andar não dispara).
     - Atualiza `pawns`, retorna `{ success: true, from: {row,col}, to: {row,col} }`.
  6. `revealCell` (227–348) — branch FoW (antes do fluxo existente):
     - Rejeitar se `!isInVision(pawn, row, col)` → `{ success: false, error: 'Célula fora do alcance da visão' }`; rejeitar `cell.isRevealed`.
     - **Mina** (249–294): marca `isRevealed` no board compartilhado (mantém visual da explosão), aplica `calculateScore('explode')`, seta `playerStatus 'eliminated'`, chama `this.onPlayerEliminated?.(roomId, playerId)`, apaga o peão de `fow.pawns`, e:
       - se `countAlivePlayers(state) === 0` → `endGame(roomId, 'eliminated')` e retorna `{ ..., eliminated: true, gameEnded: true }`;
       - senão retorna `{ ..., eliminated: true }` (sem `boardComplete`).
     - **Segura**: flood com raio — implementar `floodFillLimited(board, row, col, inRadius: (r,c) => boolean)` privado: DFS idêntico ao `floodFill` (`shared:135–160`) mas que **não revela nem expande** células que falham `inRadius` (células fora do raio = fronteira). `inRadius = (r,c) => isInVision(...)` em relação ao peão. Valor do bônus via `calculateScore` (reaproveitar `reveal`/`flood-fill`, 307).
     - **Vitória**: usar **`checkWin`** (import de `@minado/shared`, atualmente não importado) em vez de `isBoardComplete` (Decisão 7): aplicar bônus `win` + `timeBonus` (padrão 316–322) a **todos** com `playerStatus === 'playing'`, `endGame(roomId, 'win')`, retornar `gameEnded: true`.
  7. `flagCell` (350–400) — branch FoW: exigir `isInVision`; resto do fluxo atual (toggle, sem bônus). Vitória por flag **não** se aplica no FoW (checkWin ignora minas) — não chamar `isBoardComplete` no branch FoW.
- **Detalhes**: `getScoreboard` (410–417) e `countAlivePlayers` (402–408) não mudam. `endByTimer` (206–225) já percorre `getPlayerBoard` — com o passo 3, o bônus de fim funciona para FoW também.
- **Como validar este passo**: `npm run typecheck` em `apps/server` (erros de assinatura de `startGame` nos call sites são esperados até o Passo 3/4). Teste unitário rápido via `tsx`: gerar game FoW com 3 jogadores, verificar spawns únicos e sem mina; `movePawn` respeita bounds; `revealCell` fora do raio falha; mina elimina só 1; eliminar todos → `endGame('eliminated')` disparado; reveal de célula 0 com raio 2 não revela célula a distância 3.

### Passo 3 — roomHandler: visionRadius no create + game:started FoW sem minas + rejoin
- **Arquivos**: `apps/server/src/sockets/roomHandler.ts`
- **O que fazer**:
  1. `room:create` (10–54): payload aceita `visionRadius?: number`; clamp `[2,6]` (default 3) e passar a `roomManager.createRoom(...)` (24–36); incluir `visionRadius: room.visionRadius` no payload de `room:created` (40–51).
  2. `room:start` (198–252): novo branch `if (room.mode === 'fog-of-war')` **antes** do branch coop (218):
     - `gameManager.startGame(room.id, room.boardConfig, room.players, room.mode, room.timeLimit, room.visionRadius)` (214).
     - Buscar sockets com `io.in(room.id).fetchSockets()` (padrão existente, 232) e, para cada um, montar o payload FoW **per-socket** com **novo método do GameManager**: `getFoWStartedPayload(roomId, playerId)` retornando `FoWStartedPayload` — `position` do peão do jogador, `cells` = células `isRevealed` **dentro da visão** (valor = `adjacentMines`, ou `'mine'` se a célula explodiu; `isFlagged` incluso), `pawns` = colegas **vivos** dentro da visão (nunca o próprio, nunca eliminados), `eliminated: true` se `playerStatus === 'eliminated'` (sem position/cells/pawns).
     - **Não** incluir campo `board` em hipótese alguma (anti-cheat).
  3. Rejoin (93–116): para `room.mode === 'fog-of-war'`, em vez do `getPlayerBoard` cru (96–114), emitir o mesmo `getFoWStartedPayload` per-socket (mesmo payload do item 2).
  4. `roomManager.createRoom` (`RoomManager.ts:21–61`): aceitar e gravar `visionRadius` em `RoomData`.
- **Detalhes**: reutilizar/duplicar a sanitização que a SPEC 06 #1 define para os outros modos — se a SPEC 06 introduzir `sanitizeBoard(board): Board` (board sem `hasMine`), aplicar também no branch coop/não-coop para consistência; o FoW vai além: **nem envia board**. FoW deve ser o branch mais restrito.
- **Como validar este passo**: `npm run typecheck` server. Com 2 clients, iniciar sala FoW e inspecionar em devtools o payload `game:started` de cada um: **não** existe chave `board`, existe `position`, `radius`, `cells`, `pawns`; `cells` contém apenas valores (nunca `hasMine`). Reload da página do jogador (rejoin) → mesmo payload, sem `board`.

### Passo 4 — gameHandler: game:pawnMove + filtragem por-socket de reveal/flag + derrota do time
- **Arquivos**: `apps/server/src/sockets/gameHandler.ts`
- **O que fazer**:
  1. Novo handler `game:pawnMove` (`{ direction: 'up'|'down'|'left'|'right' }`):
     - Só `room.mode === 'fog-of-war'` e `room.status === 'playing'`; chama `gameManager.movePawn`.
     - Em sucesso: emitir `game:pawnMoved` **por-socket** para sockets cuja visão cobre `from` **ou** `to` (novo método `gameManager.isCellVisibleTo(roomId, playerId, r, c)` — Chebyshev). Preciso: quem via o peão antes vê a saída; quem vê o destino vê a chegada.
     - Em seguida, **para o próprio jogador**: emitir `game:visionUpdate` com snapshot completo `{ position, added: cells[], removed: cellIds[], pawns }` — `added` = células reveladas dentro do novo raio (com `isFlagged`), `removed` = cellIds visíveis no raio antigo e fora do novo (re-fog), `pawns` = colegas vivos no novo raio. Fica mais simples e correto emitir `game:visionUpdate` (com `pawns` incluso) **sempre**, independente do movimento (spawn inicial também usa o mesmo método).
  2. `game:reveal` (21–108): após `revealCell` com sucesso, se FoW:
     - Substituir `emitToTarget` por loop per-socket: para cada célula do resultado (`cells` ou o `{cellId, value}` único, incluindo `value: 'mine'`), emitir `game:cellRevealed` apenas para sockets com `isCellVisibleTo` naquela célula (fetchSockets, padrão da linha 232 de roomHandler).
     - `game:scoreUpdate` segue `io.to(room.id)` (52–56, 95–99) — seguro.
     - `game:playerEliminated` segue broadcast (61–64) — seguro.
     - **Derrota do time**: se `result.eliminated && result.gameEnded` (todos eliminados), emitir `game:ended` `{ result: 'eliminated', scoreboard }` **para a sala toda** (o `onGameEnded` de `index.ts:32` ignora `'eliminated'`, então o evento NÃO chega sozinho). Cuidar para não duplicar: no branch atual o `game:ended` é emitido só para o socket eliminado (65–72) — no FoW, emitir para a sala (o socket eliminado recebe junto).
  3. `game:flag` (110–139): para FoW, filtrar `game:cellFlagged` per-socket com `isCellVisibleTo`.
  4. Fallback de `startGame` (29–33): passar `room.visionRadius` como 6º arg.
- **Detalhes**: `io.in(room.id).fetchSockets()` é async — o handler `game:reveal` já é síncrono; manter a ordem (resultado → busca sockets → emits) usando `await` e transformando o listener em async (o socket.io não espera, mas o `await` interno não quebra nada; alternativamente usar `io.sockets.sockets` filtrado por room — citar como opção). Número de sockets por sala é ≤16 → custo trivial.
- **Como validar este passo**: `npm run typecheck` server. Teste manual 2 jogadores com raios 2 e 4: A revela célula perto de B e longe de B — B recebe `game:cellRevealed` só da célula na visão de B (conferir via listener temporário no console); A anda → A recebe `game:visionUpdate` com `removed`/`added`/`pawns` corretos; A pisa fora do raio de B → B recebe `game:pawnMoved` removendo o peão de A (via `to`/`from`); B elimina em mina → todos recebem `game:playerEliminated`; eliminar os 2 → ambos recebem `game:ended` `result: 'eliminated'`.

### Passo 5 — Client gameStore: estado FoW, listeners, input de movimento
- **Arquivos**: `apps/web/src/store/gameStore.ts`
- **O que fazer**:
  1. Novo estado FoW:
     ```ts
     position: { row: number; col: number } | null
     visionRadius: number
     visible: Record<string, true>           // cellIds iluminados (dentro do raio)
     fowCells: Record<string, { value: number | 'mine'; isFlagged: boolean }>
     fowPawns: Record<string, { row: number; col: number; username: string; color: string }>
     isSpectator: boolean
     ```
     (`visible` como Record evita custo de `Set` no re-render; alternativamente `string[]`.)
  2. `game:started` (110–149): **branchear por modo**:
     - FoW: NÃO abortar por falta de `ev.board` (116–119). Montar board em branco client-side (`rows×cols`, células unrevealed sem mina — helper `blankBoard(rows, cols)` local) para manter `board`/`boardConfig` e o guard do MatchPage. Aplicar `position`, `visionRadius`, `visible` (de `cells`), `fowCells` (valor + flag), `fowPawns` (com username/color dos `players`), `players`, `isSpectator: !!ev.eliminated`.
     - Demais modos: fluxo atual intacto.
  3. `game:visionUpdate`: substituir integralmente `position`, `visible` (reconstruir), `fowCells` (merge `added`, `delete` de `removed` — re-fog), `fowPawns` (substituir snapshot).
  4. `game:cellRevealed` (150–194): para FoW, aplicar em `fowCells` em vez do board (o evento só chega se a célula está na visão — confiar no servidor; remover a célula de `visible` se `exploded` e o peão era o próprio? **Não** — célula explodida continua visível como 💣).
  5. `game:cellFlagged` (195–209): para FoW, atualizar `fowCells[cellId].isFlagged`; `flagsPlaced` contar flags visíveis (HUD local).
  6. `game:playerEliminated` (224–230): para FoW, se `playerId === currentUserId` → `isSpectator: true` (não usa `eliminated` para não navegar — ver Passo 7); sempre: `delete fowPawns[playerId]`.
  7. `game:ended` (231–270): já trata `'win'`→won e `'eliminated'`/timeout→lost ✓ (nada a mudar).
  8. Novo action `movePawn(direction)`: guardas (`gameState === 'playing'`, `!isSpectator`, `gameMode === 'fog-of-war'`, `!boardComplete`); `getSocket().emit('game:pawnMove', { direction })`.
  9. `revealCell`/`flagCell` (333–467): no path online + FoW, validar client-side `visible[`${row}-${col}`]` (feedback imediato; o servidor revalida — R8) antes de emitir.
- **Detalhes**: `resetGame` (480–496) e `initBoard` (313–331) zeram os novos campos. Ações locais (offline/`!isOnline`) não se aplicam ao FoW (modo é online-only; bloquear reveal/flag offline no FoW).
- **Como validar este passo**: `npm run typecheck` web + `npm run lint`. Logar `useGameStore.getState()` após `game:started` FoW: **nenhuma** chave `hasMine`/`isRevealed` com valor real no board; `fowCells` só com células visíveis; `visible` bate com o raio declarado.

### Passo 6 — Board/Cell: fog layer, peões + nomes, cores; CSS do FoW
- **Arquivos**: `apps/web/src/components/game/Board.tsx`, `apps/web/src/components/game/Cell.tsx`, `apps/web/src/styles/game.css`
- **O que fazer**:
  1. `Board.tsx`: novas props `mode`, `position`, `visible`, `fowCells`, `fowPawns`, `currentUserId`, `boardComplete`, `isSpectator` (opcionais). Adicionar `--board-rows` ao style (17). Renderizar célula via `Cell` com props extras (fog/pawn/known).
  2. `Cell.tsx`: nova prop `fog?: boolean`; classes:
     - `board-cell--fog` quando FoW e célula **não** em `visible` (parece célula coberta; `cursor: default`; clique/contexto ignorados).
     - Célula em `visible` e em `fowCells` com `isFlagged` → estado flagged.
     - Célula em `visible` e em `fowCells` com `value: 'mine'` → `board-cell--mine` com 💣 (célula explodida — informação pública para quem enxerga, Decisão 14; nunca vem via board).
     - Célula em `visible` e em `fowCells` com número → estado revelado com o número (reusar `numberClasses`, 9–18).
     - Demais (visível, sem dado) → coberta normal.
  3. `Board.tsx` — camada de peões: overlay grid no mesmo `--board-cols/--board-rows`; cada peão de `fowPawns` + o próprio (`position` se não espectador) renderizado como `<div className="board-pawn">` com `grid-row/col` calculados, sprite emoji (ex.: 🟢/♟ estilo peça — usar ♟ ou avatar circular) e **rótulo com o nome acima** (`board-pawn__name`, `transform: translateY(-100%)`), cor do time (`p.color` já existe no store). Peão eliminado nunca aparece (store já removeu).
  4. `game.css`: em `.board` (64–73) trocar largura fixa das células por variável: `.board-cell { width: var(--cell-size, 44px); height: var(--cell-size, 44px) }` (74–76); novo `.board--fog { --cell-size: 26px; }` + `.board--fog .board-cell { width: 26px; height: 26px; border-radius: var(--radius-sm); box-shadow: 0 2px 0 var(--color-primary-500); }`; `.board-cell--fog` (escurecido, pointer-events none); `.board-pawn`/`.board-pawn__name` (position absolute ou grid-area; z-index acima das células; nome em `font-heading` bold, `text-[0.6rem]`).
- **Detalhes**: com 26px, 30 colunas ≈ 900px e 60 colunas ≈ 1800px — envolver o board num wrapper `overflow-x-auto` no MatchPage (Passo 7) para telas menores. Reduzir `gap` para `--spacing-1` mantido (custo ok). Células do FoW não têm hover "pop" (`:hover` transform, 93–96) para não confundir com interação real — aplicar hover apenas em células `visible`.
- **Como validar este passo**: `npm run typecheck` + `npm run lint` web. Manual: jogador vê apenas círculo iluminado (raio) com células; fora dele tudo cinza-escuro; próprio peão + nome acima; colega entra no raio → peão com nome aparece; sai → some; célula explorada pelo time fora do raio aparece coberta (re-fog).

### Passo 7 — MatchPage: teclado, HUD de visão, espectador, label do modo, wrapper scroll
- **Arquivos**: `apps/web/src/pages/MatchPage.tsx`
- **O que fazer**:
  1. **Label fixo** (344): `{modeLabels.competitive}` → `{modeLabels[gameMode]}` (também cross-ref SPEC 06 #16 — se a SPEC 06 fizer o mesmo, seguir a versão dela).
  2. **Teclado**: `useEffect` com `keydown` (window): se `gameMode === 'fog-of-war' && gameState === 'playing' && !isSpectator && !boardComplete` → mapear ArrowUp/W/KeyW → `up`, etc.; `e.preventDefault()` **antes** de `movePawn` (evita scroll da página). Cleanup no unmount.
  3. **HUD**: ao lado do timer, badge "Visão: R" (`visionRadius`) quando FoW; na "Info da Partida" (339–357) exibir "Raio de visão" = `visionRadius` (e "Modo" já corrigido no item 1).
  4. **Espectador**: `isSpectator` no lugar de `eliminated` para FoW: **não** navegar em `useEffect` 111–115 quando FoW (condicionar: `if (eliminated && gameMode !== 'fog-of-war') navigate(...)`); overlay fixo (padrão do Banner/SPEC 04) "Eliminado — assistindo 👁" com botão "Voltar ao Lobby"; `handleReveal`/`handleFlag` no-op quando `isSpectator`; board com `pointer-events-none` para o espectador (peão próprio oculto).
  5. Board: passar as novas props do Passo 6; envolver em `<div className="overflow-x-auto max-w-full">` (giant boards).
  6. Guard (124–147): para FoW o board em branco existe, então o guard atual funciona; adicionar `timeout` de carregamento específico se `gameMode === 'fog-of-war' && !position` (agora 'Reconectando...' cobre).
- **Detalhes**: movimento do peão animar com transição CSS simples (`transition: grid-area 140ms var(--ease-bounce)` ou left/top) — opcional; manter funcional primeiro.
- **Como validar este passo**: `npm run typecheck` + `npm run lint`. Manual: setas/WASD movem o peão sem rolar a página (com página rolável); badge "Visão: 3"; ao explodir, overlay de espectador aparece, jogador NÃO é redirecionado, não move peão; Info da Partida mostra "Fog of War" e o raio.

### Passo 8 — CreateRoomPage: seletor de raio (FoW) + preset Gigante + custom até 60
- **Arquivos**: `apps/web/src/pages/CreateRoomPage.tsx`
- **O que fazer**:
  1. `difficultyOptions` (93–98): adicionar `{ value: 'gigante', label: 'Gigante', description: '30×30, 150 minas — Mapa gigante' }`; grid de dificuldade (237) de `sm:grid-cols-4` → `sm:grid-cols-5` (5 opções).
  2. Ao trocar para `'fog-of-war'` em `handleModeChange` (119–122): default `selectedDifficulty = 'gigante'` e `useCustomBoard = false`.
  3. Validações custom (144–161): 5–50 → **5–60** (linhas e colunas), mensagens e `min/max` dos `<Input>` (278–306) sincronizados; `maxMines` (155) já deriva de `rows*cols-1` (ok).
  4. Seletor de raio: bloco novo na seção "Configurações da Sala" (315–402), visível **apenas** quando `selectedMode === 'fog-of-war'`: `visionRadius` state (default 3), `<input type="range" min=2 max=6>` com label "Raio de visão: {n} células" + texto "Distância máxima que seu peão enxerga (2–6)".
  5. `handleCreateRoom` (127–175): passar `visionRadius` para `useRoomStore.getState().createRoom(...)` (168) — assinatura do `roomStore.createRoom` (18, 109–134) ganha parâmetro opcional e o emite em `room:create` (134).
  6. Preview (404–427): exibir raio quando FoW.
- **Detalhes**: `roomStore.ts` precisa do mesmo clamp `[2,6]` (defensivo). A descrição do modo FoW (65) continua válida ("Cooperativo puro") — opcionalmente ajustar para "Time, um peão, visão limitada".
- **Como validar este passo**: `npm run typecheck` + `npm run lint`. Manual: criar sala FoW com raio 4 → `room:created`/`room:state` trazem `visionRadius: 4`; sala competitiva não mostra o seletor; custom board aceita 60×60 e rejeita 61; preset Gigante selecionável e pré-selecionado ao entrar em FoW.

### Passo 9 — Copy e labels: LobbyPage quick-card + mapas de dificuldade
- **Arquivos**: `apps/web/src/pages/LobbyPage.tsx`, `apps/web/src/pages/RoomPage.tsx`
- **O que fazer**:
  1. `LobbyPage.tsx:222` — descrição do quick-card FoW: `'Visão limitada, 1 erro = game over'` → **`'Tabuleiro gigante, peão com visão limitada'`** (regra final: eliminação por jogador).
  2. `LobbyPage.tsx` `difficultyFilters` (23–29): adicionar `{ value: 'gigante', label: 'Gigante' }`.
  3. `RoomPage.tsx` `difficultyLabels` (26–31): adicionar `gigante: 'Gigante'` (senão exibe undefined no cabeçalho da sala, 214).
  4. Opcional: `RoomPage.tsx` card "Configuração da Partida" (256–285) — exibir "Raio de visão" quando `currentRoom.mode === 'fog-of-war' && currentRoom.visionRadius`.
- **Detalhes**: typecheck força os itens 2 e 3 (o union `Difficulty` cresceu).
- **Como validar este passo**: `npm run typecheck` + `npm run lint`. Visual: lobby mostra a nova descrição; filtro "Gigante" filtra salas com essa dificuldade; sala FoW no RoomPage mostra "Gigante" e o raio.

### Passo 10 — Verificação anti-cheat (mandatory gate)
- **Arquivos**: nenhum (verificação manual)
- **O que fazer**:
  1. Com 2 abas (jogadores A e B, sala FoW iniciada): DevTools → Network → WS → inspecionar frames de `game:started` de **ambos**: NÃO pode existir chave `board` nem qualquer `hasMine`; só `boardMeta`, `position`, `radius`, `cells`, `pawns`, `players`.
  2. No console: `useGameStore.getState().board` → todas as células `hasMine: false`/`undefined`; `fowCells`/`visible`/`fowPawns` com dados apenas da visão.
  3. Listeners de teste (temporários): `socket.on('game:cellRevealed')` durante uma partida com A longe de B: A nunca recebe `cellId` de célula fora da visão de A; nunca recebe `value: 'mine'` de célula fora da visão de A.
  4. `socket.emit('game:reveal', { cellId: '0-0' })` com o peão longe de (0,0): servidor responde `error` `REVEAL_FAILED` e **não** revela (server é autoridade — R8).
  5. Repetir os itens 1–2 no **rejoin** (reload do cliente durante a partida).
- **Como validar este passo**: todos os itens acima passam; se qualquer `hasMine` aparecer em payload/store, o passo falhou e o vazamento deve ser rastreado (suspeitos: `game:started`, `game:visionUpdate`, `game:cellRevealed` broadcast).

## 5. Contratos (socket events/types)

### Client → Server
| Evento | Payload | Handler |
|---|---|---|
| `room:create` | `{ ..., visionRadius?: number }` | `roomHandler.ts:10` |
| `game:pawnMove` | `{ direction: 'up' \| 'down' \| 'left' \| 'right' }` | novo, `gameHandler.ts` |
| `game:reveal` | `{ cellId: string }` (inalterado) | `gameHandler.ts:21` |
| `game:flag` | `{ cellId: string }` (inalterado) | `gameHandler.ts:110` |

### Server → Client
| Evento | Payload | Destino |
|---|---|---|
| `game:started` (FoW) | `FoWStartedPayload` (Passo 1) — **sem `board`** | per-socket |
| `game:visionUpdate` | `{ position, added: FoWCellInfo[], removed: string[], pawns: FoWPawnInfo[] }` | jogador movido/rejoin |
| `game:pawnMoved` | `{ playerId, from: {row,col}, to: {row,col} }` | sockets com visão em `from` **ou** `to` |
| `game:cellRevealed` | inalterado (`{ cellId, value, revealedBy, exploded? }` ou `{ batch }`) | per-socket, filtrado por visão no FoW |
| `game:cellFlagged` | `{ cellId, playerId, flagged }` (inalterado) | per-socket, filtrado por visão no FoW |
| `game:playerEliminated` | `{ playerId }` (inalterado) | broadcast na sala |
| `game:scoreUpdate` | `{ playerId, delta, total }` (inalterado) | broadcast na sala |
| `game:ended` | `{ result: 'win' \| 'eliminated' \| 'timeout', scoreboard }` | **sala toda** no FoW (inclusive derrota) |

### Tipos compartilhados novos (`packages/shared/src/index.ts`)
`Difficulty` + `'gigante'`; `Room.visionRadius?: number`; `FoWCellInfo`, `FoWPawnInfo`, `FoWStartedPayload`; `DIFFICULTY_CONFIG.gigante`.

## 6. Critérios de aceite (checklist testável)

- [ ] `npm run typecheck` e `npm run lint` passam em `apps/web` e `apps/server`.
- [ ] Sala FoW criada com raio 2–6 persiste o raio em `room:created`/`room:state` e o host escolhe antes de iniciar.
- [ ] `game:started` FoW não contém `board` nem `hasMine` (payload e store) — inclusive no rejoin.
- [ ] Cada jogador recebe peão em célula segura, único entre jogadores, com nome acima.
- [ ] Setas/WASD movem 1 célula por tecla, sem scroll da página; movimento respeita bounds do board.
- [ ] Visão é quadrada (Chebyshev) do tamanho configurado; células fora do raio aparecem como fog.
- [ ] Célula explorada pelo time re-foga ao sair do raio do jogador (e volta com o valor quando re-entra).
- [ ] Peão de colega visível somente dentro do raio (aparece/some conforme o raio); nome exibido acima.
- [ ] Reveal só funciona dentro do raio (client bloqueia e server rejeita com `REVEAL_FAILED`).
- [ ] Flood em célula com 0 adjacentes não revela células fora do raio.
- [ ] Mina revelada elimina **apenas** o autor; peão desaparece; os demais continuam jogando.
- [ ] Eliminado vira espectador (overlay, sem redirect, sem inputs) e sua visão congela.
- [ ] Eliminação de todos os jogadores → todos recebem `game:ended` `result: 'eliminated'` → tela de derrota do time.
- [ ] Todas as células seguras reveladas → `game:ended` `result: 'win'` → confete; bônus para todos os vivos.
- [ ] `game:cellRevealed`/`game:cellFlagged` nunca chegam para jogador cuja visão não cobre a célula (2 jogadores distantes).
- [ ] Partida FoW em andamento com reload → rejoin restaura posição/visão/cells/peões (ou estado de espectador se eliminado).
- [ ] MatchPage mostra "Fog of War" (não "Competitivo") e o raio de visão no HUD.
- [ ] Lobby: descrição do FoW atualizada e filtro "Gigante" funcional.

## 7. Fora de escopo

- Persistência de partidas/ranking (SPEC futura); stats e achievements.
- Chat/sistema de ping (já funcionam via `chat:message`).
- Animações de movimento do peão (transição suave) — item de polish posterior.
- Modos restantes do plano (`multi-board`, `battle-royale` completos) e demais SPECs (04/06).
- Respawn/revive de eliminados; itens/power-ups; visão compartilhada de aliados (linha de visão, sombras).
- Mudança de raio de visão em meio à partida (config do host fica na criação).
- Cliente offline (local) para FoW (modo é online-only).

## 8. Riscos e notas

- **Vazamento residual de minas**: qualquer broadcast não filtrado de `game:cellRevealed`/`game:cellFlagged` com `value: 'mine'` reabre o anti-cheat — a filtragem per-socket (Passo 4) é o ponto crítico; cobrir com teste manual dos critérios 12 e 16.
- **`endGame('eliminated')` silencioso**: `index.ts:31–46` ignora `'eliminated'` — se o `game:ended` manual do FoW (Passo 4.2) for esquecido, a sala fica sem feedback de derrota (clients presos em "playing"). Validar com o checklist 11.
- **Gigantismo**: 60×60 com 26px ≈ 1800px — o wrapper `overflow-x-auto` (Passo 7) é obrigatório; considerar renderização preguiçosa só se houver lentidão perceptível (Reac t/React 19 lida bem com 3600 nós).
- **`gameHandler` fallback de startGame (29–33)**: cria game sem peões se chamado antes do `room:start` — passar `room.visionRadius` (Passo 4.4) e garantir que `startGame` sempre spawna peões para FoW (independente do caller).
- **Flags visíveis vs. globais**: `fowCells.isFlagged` reflete flags de qualquer colega na visão; um colega pode desbandeirar célula que outro bandeirou (comportamento existente do flag compartilhado no coop — aceito, documentar na UI se necessário).
- **Reconexão do espectador**: rejoin de eliminado envia `eliminated: true` sem `position` — o client deve tratar sem crash (guard em `game:started` FoW).
- **`checkWin` vs `isBoardComplete`**: decisão 7 diverge do coop (que exige minas bandeireadas para vencer). Não "harmonizar" os modos sem aval do product owner — o FoW segue a regra 8 literal ("all safe cells revealed").
- **Especs paralelas**: SPEC 04 (espectador) e SPEC 06 (sanitização de board / labels) podem sobrepor passos — coordenar: SPEC 06 #1 fornece `sanitizeBoard` reutilizável; SPEC 04 define o padrão de overlay de espectador que o Passo 7 referencia.
