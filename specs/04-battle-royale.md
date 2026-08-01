# SPEC 04 — Battle Royale (rodadas, dificuldade progressiva, espectadores)

## 1. Visão geral

Implementar o modo **Battle Royale** de ponta a ponta no monorepo Minado.gg. Hoje o modo é selecionável na UI e ~20% da gameplay existe (eliminação ao explodir + fim por `last_standing`), mas faltam: rodadas, dificuldade progressiva entre rodadas e lógica de vencedor por timeout.

Regras finais do product owner (NÃO inventar alternativas):

1. Tamanho do tabuleiro e limite de tempo são **FIXOS**, escolhidos pelo host na criação da sala (sem tabuleiros encolhendo).
2. Partidas com muitos jogadores (10–50) e tabuleiros pequenos.
3. Explosão de mina → **morte instantânea** daquele jogador; todos os outros continuam.
4. Quando uma rodada termina, uma **NOVA RODADA** é criada com um novo tabuleiro para os sobreviventes.
5. Rodadas começam fáceis e ficam **progressivamente mais difíceis** (mais minas a cada rodada).
6. O último sobrevivente **vence**.
7. Timeout com 2+ sobreviventes → sobreviventes avançam. Timeout com exatamente 1 sobrevivente → esse jogador vence. Timeout com 0 sobreviventes (todos morreram na rodada) → vence o jogador com **maior score ACUMULADO** em todas as rodadas.
8. Cada jogador joga em seu próprio tabuleiro (estratégia existente de competitive-clone — manter).
9. **DECISÃO a documentar:** o limite de tempo escolhido pelo host vale **POR RODADA** (cada rodada tem o mesmo limite de tempo). Ver §8.
10. Jogadores eliminados viram **espectadores** pelo resto da partida (NÃO podem ser jogados para a tela de resultados enquanto outros ainda jogam).

## 2. Estado atual

### 2.1 Compartilhado (`packages/shared/src/index.ts`)
- `GameMode` inclui `'battle-royale'` (L4). `Room` (L36–47) não tem campo de rodada.
- `generateBoard` (L77–132): sem safe zone usada pelo servidor; **loop infinito** no `while (placed < mineCount)` (L99–111) se `mineCount >= rows * cols` — qualquer progressão de minas do BR deve respeitar `mines < rows * cols`.
- `DIFFICULTY_CONFIG` (L163–168), `calculateScore` (L59–69), `isBoardComplete` (L171–182), `checkWin` (L185–192) — sem mudanças necessárias.
- `GameEndReason` **NÃO está no shared** — está em `apps/server/src/game/GameManager.ts:45`.

### 2.2 Servidor — `GameManager.ts` (426 linhas)
- `PlayerStatus = 'playing' | 'boardComplete' | 'eliminated'` (L10); `GameEndReason` (L45) inclui `'eliminated'`, que **nunca é passado para `endGame`** (o handler envia `game:ended` direto por socket — ver 2.3).
- `startGame` (L86–134): multi-board L96–100, cooperative L101–107, demais (inclui BR) usam competitive-clone L108–114. Timer global L128–130 chama `endByTimer`.
- `endByTimer` (L206–225): **mode-agnostic** — aplica `calculateEndGameBonus` no tabuleiro de **todos** os jogadores do `scores` (inclusive eliminados!) e chama `onGameEnded(..., 'timeout')` direto (não passa por `endGame`). No BR, timeout precisa de outra semântica (rodada termina, partida continua).
- `revealCell` (L227–348): ramo de explosão BR (L261–273) seta `'eliminated'`, chama `onPlayerEliminated`, conta vivos; se `<= 1` chama `endGame('last_standing')` **sem indicar vencedor**.
  - **BUG (corrigir nesta spec):** `countAlivePlayers` (L402–408) conta só `'playing'`. Se um jogador completou o tabuleiro (`'boardComplete'`) e outro explodir, `aliveCount` ignora o `'boardComplete'` → partida pode terminar com 0 "vivos" mesmo com um sobrevivente legítimo.
  - **BUG (corrigir nesta spec):** no BR, o ramo board-complete (L334–345 e L381–397) pode chamar `endGame('complete')` via `checkAllPlayersDone` (L184–189) — no BR, completar o tabuleiro = **sobreviver**, não vencer.
- Callbacks `onPlayerEliminated`/`onPlayerBoardComplete` declarados em L82–84, **nunca ligados** no `index.ts` (lá só há `onGameEnded` L31–46 e `onPlayerRemoved` L48–55).

### 2.3 Servidor — `gameHandler.ts`
- `emitToTarget` (L8–14): cooperative → broadcast, demais → `socket.emit` no autor.
- `game:reveal` (L21–108): caminho BR de eliminação L58–73 — emite `game:playerEliminated` para a sala e depois `game:ended { result: 'eliminated' }` **somente** para o socket do eliminado. O cliente (gameStore L231–270) trata qualquer result ≠ win/complete como "lost" → `MatchPage` navega para resultados (L103–109). Ou seja: hoje o eliminado é expulso para a tela de resultados — viola a regra 10.
- `game:flag` (L110–139): sem ramo por modo (não precisa mudar além dos ganchos de round).

### 2.4 Servidor — `index.ts`
- `gameManager.onGameEnded` (L31–46): broadcast `game:ended { result, scoreboard }` (sem campo `winner`), marca `room.status = 'finished'`; pula `'eliminated'` (L32). Para BR, `scoreboard[0]` **não é necessariamente o vencedor** (vencedor = último sobrevivente, que pode ter score menor).

### 2.5 Servidor — `RoomManager.ts` / `roomHandler.ts`
- `createRoom` (L21–61): genérico, sem validação por modo. `addPlayer` valida maxPlayers/status/duplicado (L100–102). Cleanup de disconnect em 60s (L186–189).
- `room:create` (roomHandler L10–54): aceita `maxPlayers` e `timeLimit` sem validação de modo → BR pode ser criado com valores inválidos.
- `room:start` (L198–252): valida host (L203) e `players.length >= 2 && todos prontos` (L208) — **guarda de mínimo já existe**; chama `gameManager.startGame(room.id, room.boardConfig, room.players, room.mode, room.timeLimit)` (L214). Payloads `game:started` (L218–250) não carregam `round`.
- Rejoin (L85–121): payload `game:started` (L96–114) sem `round`/status de eliminação.

### 2.6 Cliente
- `gameStore.ts` (501 linhas): `GamePlayer.isEliminated` (L12); estado `eliminated` (L68/L101, reset L495); `game:playerEliminated` L224–230 (só seta `eliminated` se for o próprio); `game:ended` L231–270 (vence para `win`/`last_standing`/`complete`; `winner` derivado de `scoreboard[0]` L263); `game:started` L110–149 (sem `round`); guardas `revealCell`/`flagCell` L337–342/L448.
- `MatchPage.tsx`: navega para resultados em `won|lost` (L103–109) e em `eliminated` (L111–115); guard de loading (L124–147) com spinner infinito se `board` vazio (problema para espectador reconectando); scoreboard filtra `!isEliminated` (L213); badge "Eliminado" (L320); overlay board-complete (L242–248); **label de modo hardcoded `modeLabels.competitive` (L344 — bug)**.
- `ResultPage.tsx`: `isWinner` em L43 (usa `result.winner`); textos fixos "VITÓRIA/BOMBARDEADO" (L71–83).
- `CreateRoomPage.tsx`: opção BR (L51–53), `DEFAULT_TIME_LIMITS['battle-royale'] = 300` (L76–82), slider maxPlayers 10–50 (L350–362), timer (L376–395). `LobbyPage.tsx`: filtro (L14–21) e quick-start (L216–232) já existem.
- `Plano_Implementacao_Minado.gg.md` L112–117 e L180–184 descrevem BR como "eliminação, rodadas" (descrição desatualizada de tabuleiros encolhendo — **overridden pelo product owner**: sem encolhimento).

### 2.7 Dependência externa
- `specs/` não existe ainda no repositório (este é o primeiro spec). A referência a **SPEC 06 HIGH #1 (vazamento de minas no payload)** é uma dependência futura — ver §8.

## 3. Requisitos e regras

Regras de jogo: ver §1 (itens 1–10 são FINAIS).

**Decisões de design desta spec (válidas e coesas, sem inventar regras):**

- **D1 — Timeout por rodada (regra 9):** o `timeLimit` da sala vale para **cada** rodada. Entre rodadas o timer do servidor é limpo e reagendado; o cliente reseta `timeRemaining` no `game:roundStarted`.
- **D2 — Score:** em BR, `calculateEndGameBonus` **não** é aplicado (nem no timeout de rodada, nem no fim). Score = soma das ações dentro das rodadas (`reveal`/`flood-fill`/`flag-correct`/`flag-wrong`/`explode`). Sem bônus de +200 de vitória.
- **D3 — Board completo (interação com `'complete'`):** completar o tabuleiro = **sobreviver e avançar**, nunca vencer. Status vira `'boardComplete'` (contado como sobrevivente). Se **todos** os sobreviventes tiverem completado o tabuleiro, a rodada termina imediatamente (`all_clear`) e todos avançam. Se um jogador completa sendo o **único** sobrevivente → vence (`last_standing`).
- **D4 — Progressão de minas:** rodada N usa `min(round(base × (1 + 0.25 × (N−1))), rows × cols − 1)`, mínimo 1. Respeita o guard de `generateBoard` (L99–111). Ex.: 9×9/10 minas → R1=10, R2=13, R3=15, R4=18, R5=20…
- **D5 — Vencedor por score (0 sobreviventes):** maior score acumulado; desempate por `roundsSurvived` (maior), depois `playerId` (ordem lexicográfica). Vale também para 0 sobreviventes por eliminação (mesmo princípio da regra 7).
- **D6 — Payload `game:ended` ganha campo `winner`:** obrigatório no BR (scoreboard[0] ≠ vencedor).
- **D7 — Espectador:** eliminado permanece na `MatchPage` em modo espectador (chat + scoreboard + transições de rodada visíveis); resultados apenas quando a partida de fato acabar (`game:ended` real).
- **D8 — Reuso de payload:** `game:roundStarted` reutiliza o shape de `game:started` (board completo por jogador, como hoje). Se SPEC 06 introduzir boards sanitizados, `game:roundStarted` e o rejoin do BR devem adotar a mesma sanitização (ver §8).

## 4. Passos de implementação

> **Nota de ordem:** Passos 1–7 (servidor) podem ser feitos em qualquer ordem entre si; Passos 8–10 (cliente) dependem dos contratos. Validação final no Passo 11.

---

### Passo 1 — Shared: constantes BR + helper de progressão de minas

- **Arquivos**: `packages/shared/src/index.ts`
- **O que fazer**: adicionar constantes de limite de jogadores do BR e um helper puro de contagem de minas por rodada (usado por servidor, cliente e testes).
- **Detalhes**: após `DIFFICULTY_CONFIG` (L168), adicionar:

```ts
export const BATTLE_ROYALE_MIN_PLAYERS = 10
export const BATTLE_ROYALE_MAX_PLAYERS = 50

// Minas da rodada N do Battle Royale. Respeita o guard de generateBoard (mines < rows * cols).
export function calculateBattleRoyaleMines(baseMines: number, rows: number, cols: number, round: number): number {
  const growth = Math.max(1, Math.round(baseMines * (1 + 0.25 * (round - 1))))
  return Math.min(growth, rows * cols - 1)
}
```

- **Por quê**: fórmula única e testável; server-side-authoritative e client-side (HUD pode exibir "Rodada N — X minas"); `rows * cols - 1` impede o loop infinito de `generateBoard` (L99–111).
- **Como validar este passo**: `npm run typecheck` (raiz, cobre web) e `cd apps/server && npm run typecheck`; conferir no REPL que `calculateBattleRoyaleMines(10, 9, 9, 1) === 10`, `(10, 9, 9, 2) === 13`, e que nunca retorna `>= 81`.

---

### Passo 2 — GameManager: estado de rodada + accessors + callbacks

- **Arquivos**: `apps/server/src/game/GameManager.ts`
- **O que fazer**: estender `GameState`, `GameEndReason`, assinatura de `onGameEnded`/`endGame`, e expor accessors públicos para o socket layer.
- **Detalhes**:
  - `GameState` (L30–43) ganha: `round: number` (inicia 1), `roundStartedAt: number`, `roundsSurvived: Map<string, number>` (incrementa por rodada sobrevivida — desempate D5).
  - `GameEndReason` (L45): adicionar `'score_winner'`.
  - `endGame` (L191–204): assinatura vira `private endGame(roomId: string, reason: GameEndReason, winnerId?: string): void`; repassar `winnerId` ao callback. **Não** aplicar bônus aqui.
  - `onGameEnded` (L82): assinatura vira `(roomId: string, scoreboard: GameScoreEntry[], reason: GameEndReason, winnerId?: string) => void`.
  - Novos callbacks (junto de L83–84): `onRoundStarted?: (roomId: string, round: number) => void` e `onRoundEnded?: (roomId: string, round: number, survivors: string[], reason: RoundEndReason) => void`, com `export type RoundEndReason = 'timeout' | 'all_clear'`.
  - Novos métodos públicos: `getRound(roomId): number`, `getRoundMines(roomId): number` (usa `calculateBattleRoyaleMines` com o round atual), `getPlayerScore(roomId, playerId): number`, `countSurvivors(roomId): number` (**`'playing'` + `'boardComplete'`**), `getSurvivorIds(roomId): string[]`, `getPlayerStatus` já existe (L140).
- **Por quê**: `countAlivePlayers` (só `'playing'`) é a raiz do bug 2.2; o socket layer (index.ts) precisa dos accessors para montar payloads; `winnerId` corrige D6.
- **Como validar este passo**: `cd apps/server && npm run typecheck`.

---

### Passo 3 — GameManager: ciclo de vida das rodadas (startRound / advanceRound / endRoundByTimer)

- **Arquivos**: `apps/server/src/game/GameManager.ts`
- **O que fazer**: implementar a máquina de estados de rodada e o desvio do BR em `endByTimer` e nos ramos de board-complete.
- **Detalhes**:
  - `startGame` (L86–134): no fim (após L126), se `mode === 'battle-royale'` inicializar `round: 1`, `roundStartedAt: Date.now()`, `roundsSurvived` com 0 para todos. O ramo competitive-clone (L108–114) já gera o board da rodada 1 com `config.mines` (= base; fórmula com N=1 retorna base). Timer existente (L128–130) já aponta para `endByTimer`, que agora desvia para BR.
  - Novo método privado `startRound(roomId: string): void`:
    1. `state.round += 1`; `roundStartedAt = Date.now()`; incrementar `roundsSurvived` de cada sobrevivente;
    2. `mines = calculateBattleRoyaleMines(config.mines, config.rows, config.cols, state.round)`;
    3. gerar 1 template `generateBoard(rows, cols, mines)` e clonar para cada sobrevivente (mesma estratégia competitive-clone de L108–114);
    4. sobreviventes com status `'boardComplete'` voltam a `'playing'` (eliminados permanecem `'eliminated'`);
    5. limpar `timerHandle` anterior (mesmo padrão de L198–201) e reagendar `setTimeout(() => this.endByTimer(roomId), state.timeLimit * 1000)` (D1);
    6. `this.onRoundStarted?.(roomId, state.round)`.
  - Novo método privado `advanceRound(roomId: string, reason: RoundEndReason): void`:
    - se `endedAt` → return; coletar `getSurvivorIds`; limpar timer; `this.onRoundEnded?.(roomId, state.round, survivors, reason)`; chamar `startRound`.
  - Novo método privado `endRoundByTimer(roomId: string): void` (chamado por `endByTimer` quando BR):
    - `survivors = getSurvivorIds(state)`;
    - `survivors.length === 1` → `endGame(roomId, 'last_standing', survivors[0])`;
    - `survivors.length === 0` → `endGame(roomId, 'score_winner', getHighestScorePlayerId(state))` (novo helper privado: score desc, depois `roundsSurvived` desc, depois `playerId` asc — D5);
    - `>= 2` → `advanceRound(roomId, 'timeout')`.
  - `endByTimer` (L206–225): no topo, após o guard de `endedAt`, adicionar `if (state.mode === 'battle-royale') { this.endRoundByTimer(roomId); return this.getScoreboard(roomId) }` — o bônus de fim (L214–220) fica só para os demais modos.
  - `revealCell`, ramo BR de explosão (L261–273) — reescrever:
    ```ts
    if (state.mode === 'battle-royale') {
      state.playerStatus.set(playerId, 'eliminated')
      this.onPlayerEliminated?.(roomId, playerId)
      const survivors = this.countSurvivors(roomId)
      if (survivors <= 1) {
        if (survivors === 1) this.endGame(roomId, 'last_standing', this.getSurvivorIds(roomId)[0])
        else this.endGame(roomId, 'score_winner', this.getHighestScorePlayerId(roomId))
        return { ...result, eliminated: true, gameEnded: true }
      }
      return { ...result, eliminated: true }
    }
    ```
  - `revealCell`, ramo board-complete (L334–345) e `flagCell` (L381–397): **antes** do bloco `checkAllPlayersDone`, inserir ramo BR:
    ```ts
    if (state.mode === 'battle-royale') {
      if (this.countSurvivors(roomId) === 1) {
        this.endGame(roomId, 'last_standing', playerId)
        return { success: true, cells, delta, boardComplete: true, gameEnded: true }
      }
      if (state.playerStatus.get(playerId) !== 'boardComplete') {
        state.playerStatus.set(playerId, 'boardComplete')  // (já setado acima nos fluxos existentes — manter lógica atual)
        this.onPlayerBoardComplete?.(roomId, playerId)
      }
      if (this.countSurvivors(roomId) === this.countAlivePlayers(state)) {
        // todos os sobreviventes completaram → avança a rodada (D3)
        this.advanceRound(roomId, 'all_clear')
      }
      return { ...result, boardComplete: true }
    }
    ```
    (o status `'boardComplete'` já é setado nas linhas L336/L383; apenas **não** cair no `checkAllPlayersDone`/`endGame('complete')` no BR.)
- **Por quê**: implementa as regras 4, 5, 6, 7 (D1–D5) e corrige os dois bugs de 2.2. `countSurvivors` = `playing` + `boardComplete` garante que completar tabuleiro não "some" do cálculo de sobreviventes.
- **Como validar este passo**: `cd apps/server && npm run typecheck`.

---

### Passo 4 — GameManager: vencedor no scoreboard/fim (D5/D6)

- **Arquivos**: `apps/server/src/game/GameManager.ts`
- **O que fazer**: garantir que `endGame` propague `winnerId` e que o helper `getHighestScorePlayerId` exista.
- **Detalhes**: implementar o helper privado descrito no Passo 3; `getScoreboard` (L410–417) permanece por score desc (ranking exibido); o vencedor vai separado pelo `winnerId` (D6). `removeGame` (L419) e `removePlayerBoard` (L171) não mudam.
- **Por quê**: cliente e `ResultPage` precisam do vencedor real do BR, não do `scoreboard[0]`.
- **Como validar este passo**: `cd apps/server && npm run typecheck`.

---

### Passo 5 — index.ts: wiring dos callbacks + hardening de disconnect

- **Arquivos**: `apps/server/src/index.ts`
- **O que fazer**: ligar `onPlayerEliminated`, `onRoundStarted`, `onRoundEnded`; adicionar `winner` ao payload de `game:ended`; tratar BR no `onPlayerRemoved`.
- **Detalhes**:
  - **`onPlayerEliminated`** (regra 10 / D7 — o broadcast sairá daqui, não mais do gameHandler):
    ```ts
    gameManager.onPlayerEliminated = (roomId, playerId) => {
      io.to(roomId).emit('game:playerEliminated', { playerId })
      const room = roomManager.getRoom(roomId)
      const player = room?.players.find((p) => p.id === playerId)
      io.to(roomId).emit('chat:message', {
        id: `sys-elim-${playerId}-${Date.now()}`,
        from: 'Sistema',
        text: `${player?.username || 'Jogador'} foi eliminado! 💣`,
        ts: new Date().toISOString(),
        isSystem: true,
      })
    }
    ```
  - **`onRoundStarted`** (payload per-player, respeitando D8):
    ```ts
    gameManager.onRoundStarted = (roomId, round) => {
      const room = roomManager.getRoom(roomId)
      if (!room) return
      void io.in(roomId).fetchSockets().then((sockets) => {
        for (const s of sockets) {
          const playerId = (s as any).userId || (s as any).id
          const status = gameManager.getPlayerStatus(roomId, playerId)
          const board = status === 'eliminated' ? null : gameManager.getPlayerBoard(roomId, playerId)
          s.emit('game:roundStarted', {
            round,
            board,
            boardMeta: {
              rows: room.boardConfig.rows,
              cols: room.boardConfig.cols,
              mines: gameManager.getRoundMines(roomId),
              mode: room.mode,
              timeLimit: gameManager.getTimeLimit(roomId),
              round,
            },
            players: room.players.map((p) => ({
              id: p.id,
              username: p.username,
              avatarUrl: p.avatarUrl,
              score: gameManager.getPlayerScore(roomId, p.id),
              isEliminated: gameManager.getPlayerStatus(roomId, p.id) === 'eliminated',
            })),
          })
        }
      })
    }
    ```
  - **`onRoundEnded`**: `io.to(roomId).emit('game:roundEnded', { round, survivors, reason })`.
  - **`onGameEnded`** (L31–46): manter o skip de `'eliminated'` (L32); payload ganha `winner: winnerId`; broadcast `game:ended { result: reason, winner: winnerId, scoreboard }`.
  - **`onPlayerRemoved`** (L48–55): após o bloco existente, se `room.mode === 'battle-royale'` e `room.status === 'playing'` e `gameManager.getGame(roomId)` existir: `survivors = gameManager.countSurvivors(roomId)`; `=== 1` → `gameManager.endGame(roomId, 'last_standing', survivor)` (via método público novo `endGame` — **tornar `endGame` público** para este caso); `=== 0` → `gameManager.endGame(roomId, 'score_winner', ...)`. Evita partida travada quando vivos saem por disconnect.
- **Por quê**: centraliza emissões (regra 10, D7), corrige a falta de `winner` (D6) e adiciona resiliência a disconnect (ver §8, R4).
- **Como validar este passo**: `cd apps/server && npm run typecheck`; subir `npm run dev-server` e conferir no console que os callbacks disparam (logs opcionais).

---

### Passo 6 — gameHandler.ts: remover expulsão do eliminado

- **Arquivos**: `apps/server/src/sockets/gameHandler.ts`
- **O que fazer**: eliminar o bloco que envia `game:ended { result: 'eliminated' }` para o socket do eliminado (L58–73) e as emissões inline de `game:playerEliminated` (L61, L64) — agora o broadcast vem do callback ligado no Passo 5.
- **Detalhes**: no ramo `result.exploded` (L45–82), substituir o `if (result.eliminated) { ... }` por nada (o callback já emitiu `game:playerEliminated` e, se `gameEnded`, `onGameEnded` emitiu `game:ended` — a ordem dentro de `revealCell` garante `playerEliminated` antes de `game:ended`). Manter `if (result.gameEnded) gameManager.removeGame(room.id)` (L78–80). `game:flag` (L110–139) e `game:ping` (L141–149) não mudam.
- **Por quê**: regra 10 — eliminado vira espectador; o `game:ended` falso fazia o cliente navegar para resultados no meio da partida.
- **Como validar este passo**: `cd apps/server && npm run typecheck`.

---

### Passo 7 — roomHandler.ts: validação BR no create + round/isEliminated no rejoin e no start

- **Arquivos**: `apps/server/src/sockets/roomHandler.ts`
- **O que fazer**: (h) validar BR no `room:create`; (i) confirmar/reforçar guardas; enriquecer payloads `game:started` com `round` e `isEliminated`.
- **Detalhes**:
  - Em `room:create` (L10–54), antes de `roomManager.createRoom` (L24), adicionar:
    ```ts
    if (data.mode === 'battle-royale') {
      if (data.maxPlayers < BATTLE_ROYALE_MIN_PLAYERS || data.maxPlayers > BATTLE_ROYALE_MAX_PLAYERS) {
        socket.emit('error', { code: 'INVALID_MAX_PLAYERS', message: 'Battle Royale suporta 10-50 jogadores' })
        return
      }
      if (!data.timeLimit || data.timeLimit <= 0) {
        socket.emit('error', { code: 'TIME_LIMIT_REQUIRED', message: 'Battle Royale exige limite de tempo (por rodada)' })
        return
      }
    }
    ```
    (importar as constantes de `@minado/shared`; se o cliente mandar valores fora do range, o servidor **rejeita** — não clampa, para o erro chegar limpo na UI. Cross-ref SPEC 06 #22 sobre validação server-side geral.)
  - Em `room:start` (L198–252): a guarda de mínimo **já existe** (L208: `room.players.length >= 2 && every isReady`) — manter; documentar que cobre BR. Adicionar `round: 1` (e `isEliminated: false` quando houver campo de status) aos payloads `game:started` (L220 e L237).
  - No rejoin (L96–114), enriquecer o payload com:
    ```ts
    const round = gameState.round
    const playerStatus = gameManager.getPlayerStatus(room.id, userId)
    socket.emit('game:started', {
      board: playerStatus === 'eliminated' ? null : board,
      boardMeta: { rows, cols, mines: gameManager.getRoundMines(room.id), mode, timeLimit: gameManager.getTimeLimit(room.id), round },
      isEliminated: playerStatus === 'eliminated',
      round,
      players: room.players.map((p) => ({ ...p, score: gameManager.getPlayerScore(room.id, p.id) })),
    })
    ```
- **Por quê**: validação authoritative no servidor (h), guarda mínima documentada (i), e reconexão correta de espectadores/sobreviventes no meio das rodadas (D7/D8).
- **Como validar este passo**: `cd apps/server && npm run typecheck`.

---

### Passo 8 — gameStore.ts: estado de rodada + listeners + vencedor real

- **Arquivos**: `apps/web/src/store/gameStore.ts`
- **O que fazer**: adicionar estado de rodada, tratar `game:roundStarted`/`game:roundEnded`, `winner` no `game:ended`, `isEliminated` no payload de players, e `reason` no `LastMatchResult`.
- **Detalhes**:
  - Novos campos no store (L49–68): `round: number` (default 0), `roundTransition: boolean` (default false), `lastRoundSurvivors: number` (default 0), `eliminatedAtRound: number` (default 0). Em `LastMatchResult` (L31–45): `reason?: string`.
  - `game:started` (L110–149): ler `round`/`isEliminated` do payload; setar `round: ev.round || 1`, `eliminated: !!ev.isEliminated`, `roundTransition: false`; se `ev.board` for `null` **não** sobrescrever o board (mantém o atual ou vazio).
  - Novo listener `game:roundStarted` (mesmo padrão de L110): payload `{ round, board, boardMeta, players }` →
    ```ts
    set({
      round: ev.round,
      roundTransition: false,
      board: ev.board ?? state.board,
      boardConfig: { rows, cols, mines },
      gameMode: boardMeta.mode as GameMode,
      flagsPlaced: 0, firstClick: true, boardComplete: false,
      timeElapsed: 0,
      timeRemaining: boardMeta.timeLimit || 0,   // D1 — timer reseta por rodada
      eliminated: !ev.board ? true : state.eliminated,  // espectador continua espectador
      players: ev.players.map((p) => ({ id, username, score: p.score || 0, color: '', isEliminated: !!p.isEliminated })),
    })
    ```
  - Novo listener `game:roundEnded`: `set({ roundTransition: true, lastRoundSurvivors: ev.survivors.length })`.
  - `game:playerEliminated` (L224–230): marcar `isEliminated` **em todos** (não só o próprio) e, se for o próprio, `eliminated: true` + `eliminatedAtRound: state.round`.
  - `game:ended` (L231–270): `isWin = ev.winner ? ev.winner === state.currentUserId : (win/last_standing/complete)`; `winner: ev.winner || scoreboard[0]?.playerId` (L263); `lastMatchResult.reason = ev.result`.
  - `resetGame` (L480–496): resetar os novos campos.
- **Por quê**: cliente espelha a máquina de rodadas; espectador não navega; `winner`/`reason` corretos para a ResultPage (regras 6–7).
- **Como validar este passo**: `npm run typecheck` (raiz).

---

### Passo 9 — MatchPage.tsx: HUD de rodada, overlay de transição, modo espectador

- **Arquivos**: `apps/web/src/pages/MatchPage.tsx`
- **O que fazer**: (f) indicador de rodada, overlay de transição entre rodadas, tela de espectador (sem navegação), scoreboard com todos os jogadores no BR, correção do label de modo.
- **Detalhes**:
  - **Remover** o efeito que navega em `eliminated` (L111–115) — regra 10/D7. O fluxo de resultados continua apenas por `gameState === 'won'|'lost'` (L103–109).
  - **Guard de loading** (L133–147): mudar condição para `if ((!board || board.length === 0) && !eliminated)` → spinner; se `eliminated` (espectador) renderiza a tela de espectador (abaixo).
  - **HUD top** (L191–233): no grupo esquerdo, para `gameMode === 'battle-royale'`, adicionar chip "Rodada {round}" (estilo igual aos chips existentes, `bg-surface border border-border`). No timer, o `timeRemaining` já reseta via store (Passo 8).
  - **Overlay de transição** (próximo de L237): quando `roundTransition && gameMode === 'battle-royale'`, renderizar overlay absoluto no board: "RODADA {round} CONCLUÍDA" + "🎉 {lastRoundSurvivors} sobreviventes avançam — Rodada {round + 1}" (some sozinho quando `game:roundStarted` chegar e `roundTransition` virar false).
  - **Modo espectador**: quando `eliminated`, (a) desabilitar o board (mesmo padrão de L238) e mostrar overlay "💣 ELIMINADO — assistindo"; (b) `Mascote` (L252–258) com `state: 'exploded'`; (c) players panel (L302–324): badge "Eliminado" (L320) já existe — manter e destacar "Espectador" para si.
  - **Scoreboard** (L211–232): no BR, mostrar **todos** os jogadores (incluir eliminados com opacidade reduzida + 💀 em vez de filtrar L213); para os demais modos, manter o filtro atual. Simplificação aceitável: exibir todos sempre, estilizando `isEliminated` com opacidade (é a mesma informação do badge do painel).
  - **Overlay board-complete** (L242–248): para BR, texto "Tabuleiro completo — aguardando próxima rodada".
  - **Label de modo** (L344): trocar `modeLabels.competitive` por `modeLabels[gameMode]` (bug).
- **Por quê**: regra 10 (espectador não sai da página), regras 4/5 visíveis (rodada + transição), feedback de estado.
- **Como validar este passo**: `npm run typecheck` (raiz).

---

### Passo 10 — ResultPage.tsx: textos por motivo de fim

- **Arquivos**: `apps/web/src/pages/ResultPage.tsx`
- **O que fazer**: (g) textos do banner e coluna de vencedor conforme `result.reason` (`last_standing`, `score_winner`, demais).
- **Detalhes**: em `isWinner` (L43) já usa `result.winner` (agora correto via Passo 8). No `Banner` (L71–83), condicionais:
  - vencedor + `reason === 'last_standing'` → título "ÚLTIMO SOBREVIVENTE!" / subtítulo "Você sobreviveu a todas as rodadas. Lenda!"
  - vencedor + `reason === 'score_winner'` → título "VITÓRIA!" / subtítulo "Todos foram eliminados — você venceu por pontuação acumulada!"
  - perdedor + `gameMode === 'battle-royale'` → título "ELIMINADO!" / subtítulo "Você chegou até a Rodada {eliminatedAtRound}. Bora de novo?"
  - demais casos: textos atuais.
  - Coluna "Detalhes" (L171): já usa `result.winner` — ok sem mudança.
- **Por quê**: regras 6/7 com linguagem correta; o cliente sabe qual motivo aconteceu via `lastMatchResult.reason`.
- **Como validar este passo**: `npm run typecheck` (raiz).

---

### Passo 11 — Validação final

- **Arquivos**: nenhum (execução)
- **O que fazer**: typecheck em todos os workspaces + roteiro manual multi-abas.
- **Detalhes**:
  1. `npm run typecheck` (raiz — web) e `cd apps/server && npm run typecheck`; também `npm run build` (web) para pegar erros de runtime/Vite.
  2. Subir `npm run dev` e `npm run dev-server`.
  3. Roteiro manual (3–4 abas/incógnito, 1 host): criar sala BR com timeLimit curto (1 min) e board pequeno (ex.: 9×9 easy);
     - **T1 — eliminação no meio da rodada:** jogador A clica numa mina → A vê overlay "ELIMINADO — assistindo" e **não** navega; B/C continuam jogando; chat mostra "A foi eliminado! 💣".
     - **T2 — timeout com 2+ sobreviventes:** todos param de jogar → ao estourar o timer, overlay "RODADA 1 CONCLUÍDA — N sobreviventes avançam"; chega `game:roundStarted` com tabuleiro novo, minas maiores (conferir `boardMeta.mines`), `timeRemaining` resetado; eliminados continuam espectadores.
     - **T3 — timeout com 1 sobrevivente:** eliminar todos menos 1 → timer estoura → `game:ended { result: 'last_standing', winner }` → todos (incluindo espectadores) vão para a ResultPage; banner "ÚLTIMO SOBREVIVENTE!" para o vencedor.
     - **T4 — 0 sobreviventes (todos mortos):** eliminar todo mundo na rodada N (por mina) → `game:ended { result: 'score_winner', winner: maiorScoreAcumulado }` → ResultPage com texto de pontuação acumulada.
     - **T5 — board-complete avança:** um jogador limpa o tabuleiro sem explodir → fica "Tabuleiro completo — aguardando próxima rodada", **não** vence e **não** é removido da contagem de sobreviventes; com todos os sobreviventes completos, rodada avança via `all_clear` imediatamente.
     - **T6 — reconexão:** espectador elimina o socket e reconecta → recebe `game:started` com `isEliminated: true`/board null → MatchPage abre em modo espectador (sem spinner infinito).
     - **T7 — validação:** tentar criar sala BR com maxPlayers 9 ou 51 e com timeLimit 0 via payload direto → `error` com código correspondente; sala não é criada.
- **Como validar este passo**: todos os T1–T7 passam; nenhum erro no console do servidor; typecheck/build limpos.

## 5. Contratos (socket events/types)

**Novos eventos (Server → Client):**

| Evento | Payload | Destino | Quando |
|---|---|---|---|
| `game:roundEnded` | `{ round: number, survivors: string[], reason: 'timeout' \| 'all_clear' }` | broadcast da sala | rodada termina e a partida continua |
| `game:roundStarted` | `{ round: number, board: Board \| null, boardMeta: { rows, cols, mines, mode, timeLimit, round }, players: Array<{ id, username, avatarUrl?, score, isEliminated }> }` | por socket (board null para eliminados) | nova rodada começa (board novo + timer resetado) |

**Evento modificado (Server → Client):**

| Evento | Mudança |
|---|---|
| `game:ended` | payload ganha `winner?: string` (D6); novos values de `result`: `'score_winner'` (0 sobreviventes) e reuso de `'last_standing'` (1 sobrevivente, por eliminação ou timeout) |
| `game:started` | payload ganha `round?: number` e `isEliminated?: boolean` (rejoin/start) |
| `game:playerEliminated` | sem mudança de payload; emissão passa do `gameHandler` para o callback de `GameManager` ligado no `index.ts` |

**Types novos/alterados:**
- `packages/shared`: `BATTLE_ROYALE_MIN_PLAYERS`, `BATTLE_ROYALE_MAX_PLAYERS`, `calculateBattleRoyaleMines(baseMines, rows, cols, round)`.
- `apps/server/src/game/GameManager.ts`: `GameEndReason` + `'score_winner'`; `RoundEndReason = 'timeout' | 'all_clear'`; `GameState.round/roundStartedAt/roundsSurvived`; `onGameEnded` com `winnerId?`; callbacks `onRoundStarted`/`onRoundEnded`; métodos `startRound` (privado), `advanceRound` (privado), `endRoundByTimer` (privado), `getRound`, `getRoundMines`, `getPlayerScore`, `countSurvivors`, `getSurvivorIds`, `endGame` público.
- `apps/web/src/store/gameStore.ts`: `round`, `roundTransition`, `lastRoundSurvivors`, `eliminatedAtRound`; `LastMatchResult.reason?`.

**Eventos que NÃO mudam:** `room:create/join/leave/ready/start`, `game:reveal/flag/ping`, `game:cellRevealed`, `game:cellFlagged`, `game:scoreUpdate`, `game:playerBoardComplete`, `chat:message`, `error`.

## 6. Critérios de aceite (checklist testável)

- [ ] Criar sala BR com maxPlayers fora de 10–50 é rejeitado no servidor (`INVALID_MAX_PLAYERS`).
- [ ] Criar sala BR com `timeLimit = 0` é rejeitado (`TIME_LIMIT_REQUIRED`).
- [ ] `room:start` exige ≥ 2 jogadores e todos prontos (guarda existente, válida para BR).
- [ ] Rodada 1 usa o board configurado pelo host (mesmo shape de `game:started`).
- [ ] A cada rodada, o board novo tem `mines = calculateBattleRoyaleMines(base, rows, cols, round)` e `mines < rows * cols` (sem loop infinito em `generateBoard`).
- [ ] Explosão de mina elimina somente o autor; demais continuam; eliminado vira espectador e NÃO recebe `game:ended` nem navega para resultados.
- [ ] Score acumula entre rodadas (não reseta no `game:roundStarted`); `calculateEndGameBonus` NÃO é aplicado no BR.
- [ ] Timeout com 2+ sobreviventes → `game:roundEnded` + `game:roundStarted`; timer recomeça do `timeLimit` no cliente.
- [ ] Timeout com 1 sobrevivente → `game:ended { result: 'last_standing', winner }` com o vencedor correto (não `scoreboard[0]`).
- [ ] 0 sobreviventes (eliminação ou timeout) → `game:ended { result: 'score_winner', winner }` com maior score acumulado (desempate `roundsSurvived`, depois `playerId`).
- [ ] Board-complete no BR → sobrevivente; nunca `endGame('complete')`; todos os sobreviventes completos → avanço imediato (`all_clear`); único sobrevivente completa → `last_standing` com ele.
- [ ] Contagem de sobreviventes inclui `'boardComplete'` (regressão do bug de `countAlivePlayers`).
- [ ] Espectador reconecta e cai direto no modo espectador (sem spinner infinito), com `round` correto.
- [ ] MatchPage mostra indicador "Rodada N", overlay de transição com nº de sobreviventes e corrige o label de modo (`modeLabels[gameMode]`).
- [ ] ResultPage mostra textos distintos para `last_standing`, `score_winner` e perdedor BR.
- [ ] `npm run typecheck` (raiz) e `cd apps/server && npm run typecheck` sem erros.

## 7. Fora de escopo

- Tabuleiros encolhendo ou mapa "círculo" (regra 1 — proibido).
- Persistência de match no banco (Prisma) e ranking/histórico de partidas BR (roadmap Fase 4 do `Plano_Implementacao_Minado.gg.md`).
- Implementação de SPEC 06 (sanitização de boards no payload, anti-trapaça/rate limit) — apenas dependência sinalizada.
- Replay de partidas, conquistas, missões.
- Suporte a espectadores de fora (entrar numa sala em andamento como observador) — espectador BR é apenas o eliminado.
- Fog of War / demais modos.

## 8. Riscos e notas

- **R1 — Vazamento de minas no payload (dependência SPEC 06):** `game:roundStarted` e o rejoin BR reutilizam o shape atual de `game:started`, que envia o board completo com `hasMine` por jogador (cada um só vê o seu, como já é o caso). Quando SPEC 06 HIGH #1 (boards sanitizados) for implementado, `game:roundStarted` (Passo 5) e o payload de rejoin (Passo 7) **devem** adotar a mesma sanitização. **SPEC 06 ainda não existe** no repositório — registrar esta dependência na abertura do SPEC 06.
- **R2 — `generateBoard` com loop infinito (L99–111):** se `mines >= rows * cols`, o `while` nunca termina. O cap `rows * cols − 1` do Passo 1 evita; adicionar um guard defensivo (ex.: `throw`/clamp) em `generateBoard` é recomendado como hardening futuro (fora de escopo aqui).
- **R3 — Mudança de modo no meio do cliente:** `CreateRoomPage` não re-clampa `maxPlayers` ao trocar o modo (ex.: 40 jogadores em competitive → slider com max 16). A validação server-side (Passo 7) é a autoritativa; ajuste de UX do slider é opcional.
- **R4 — Disconnect de sobreviventes:** um jogador vivo que desconecta e não retorna em 60s é removido (`RoomManager` L186–189 → `removePlayerBoard`). O hardening do Passo 5 (`onPlayerRemoved` com `countSurvivors`) encerra a partida se isso deixar ≤ 1 sobrevivente; caso contrário a rodada segue normalmente com a contagem ajustada.
- **R5 — Ordem de eventos:** dentro de `revealCell`, `onPlayerEliminated` dispara antes de `endGame`; o broadcast `game:playerEliminated` sempre precede `game:ended` — o cliente pode assumir essa ordem para o HUD.
- **R6 — `endGame('last_standing')` sem vencedor (código atual L267–269):** após o Passo 3, todos os caminhos de fim de BR passam `winnerId`; conferir que nenhum caminho restante chama `endGame` sem winner no BR.
- **R7 — `roundsSurvived` e desempate (D5):** o desempate é determinístico, mas não considera "quem morreu depois" dentro da rodada final; aceito como simplificação (todos os empatados morreram na mesma rodada). Documentar para o PO.
- **R8 — Sala com 1 jogador que completa o board antes do fim:** tratado (D3) — vence como `last_standing`; partida não fica pendurada esperando timeout desnecessariamente.
