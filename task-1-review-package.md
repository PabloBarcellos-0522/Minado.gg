# Review Package: Part A Critical Fixes

## Commit Range
Working tree changes (Steps 4-10 + Part A fixes)

## Files Changed
- `apps/server/src/game/GameManager.ts` (+247 -132 lines net)
- `apps/server/src/sockets/gameHandler.ts` (+21 -25 lines net)
- `packages/shared/src/index.ts` (+71 lines added)
- `specs/README.md` (+10 lines added)

## Full Diff
```
diff --git a/apps/server/src/game/GameManager.ts b/apps/server/src/game/GameManager.ts
index 968769f..fdceb88 100644
--- a/apps/server/src/game/GameManager.ts
+++ b/apps/server/src/game/GameManager.ts
@@ -1,11 +1,8 @@
-import { generateBoard, cloneBoard, floodFill, isBoardComplete, calculateScore } from '@minado/shared'
+import { generateBoard, cloneBoard, floodFill, isBoardComplete, calculateScore, relocateMine } from '@minado/shared'
 import type { Board, BoardConfig, Player, GameMode, Cell } from '@minado/shared'
 
-const CORRECT_FLAG_POINTS = 50
-const REVEALED_CELL_POINTS = 5
-const WRONG_FLAG_PENALTY = 25
-
 const COOP_TIME_BONUS_MAX = 600
+const COOP_IDEAL_TIME_SECONDS = 300
 
 function sanitizeBoardForClient(board: Board): Board {
   return board.map((row) =>
@@ -23,14 +20,6 @@ export interface GameScoreEntry {
   score: number
 }
 
-export interface EndGameBonus {
-  total: number
-  correctFlags: number
-  wrongFlags: number
-  revealedSafe: number
-  totalSafe: number
-}
-
 export interface PlayerBoardData {
   board: Board
   minePositions: Set<string>
@@ -49,6 +38,8 @@ export interface GameState {
   timerHandle?: NodeJS.Timeout
   endedByTimer?: boolean
   playerStatus: Map<string, PlayerStatus>
+  firstRevealDone: Map<string, boolean>
+  template?: Board
 }
 
 export type GameEndReason = 'win' | 'timeout' | 'complete' | 'eliminated' | 'last_standing'
@@ -63,28 +54,6 @@ function extractMinePositions(board: Board): Set<string> {
   return pos
 }
 
-function calculateEndGameBonus(board: Board): EndGameBonus {
-  let correctFlags = 0
-  let wrongFlags = 0
-  let revealedSafe = 0
-  let totalSafe = 0
-
-  for (const row of board) {
-    for (const cell of row) {
-      if (cell.hasMine) {
-        if (cell.isFlagged) correctFlags++
-      } else {
-        totalSafe++
-        if (cell.isRevealed) revealedSafe++
-        if (cell.isFlagged) wrongFlags++
-      }
-    }
-  }
-
-  const total = correctFlags * CORRECT_FLAG_POINTS + revealedSafe * REVEALED_CELL_POINTS - wrongFlags * WRONG_FLAG_PENALTY
-  return { total, correctFlags, wrongFlags, revealedSafe, totalSafe }
-}
-
 export class GameManager {
   private games: Map<string, GameState> = new Map()
 
@@ -120,6 +89,8 @@ export class GameManager {
       for (const p of players) {
         playerBoards.set(p.id, { board: cloneBoard(template), minePositions: minePos })
       }
+      // Store template for first-click safety propagation
+      playerBoards.set('template', { board: template, minePositions: minePos })
     }
 
     const state: GameState = {
@@ -132,6 +103,8 @@ export class GameManager {
       sharedBoardId: mode === 'cooperative' ? 'shared' : undefined,
       timeLimit,
       playerStatus,
+      firstRevealDone: new Map(),
+      template: mode === 'competitive' ? playerBoards.get(players[0].id)?.board ?? undefined : undefined,
     }
 
     if (timeLimit > 0) {
@@ -207,10 +180,20 @@ export class GameManager {
     return true
   }
 
-  private endGame(roomId: string, reason: GameEndReason): void {
+  private awardCoopWin(state: GameState, playerId: string, entry: GameScoreEntry, roomId: string): void {
+    entry.score += calculateScore('win')
+
+    const elapsed = (Date.now() - state.startedAt) / 1000
+    const timeBonus = Math.round(COOP_TIME_BONUS_MAX * Math.max(0, Math.min(1, (COOP_IDEAL_TIME_SECONDS - elapsed) / COOP_IDEAL_TIME_SECONDS)))
+    entry.score += timeBonus
+
+    this.endGame(roomId, 'win')
+  }
+
+  private endGame(roomId: string, reason: GameEndReason, priorityPlayerId?: string): GameScoreEntry[] {
     const state = this.games.get(roomId)
-    if (!state) return
-    if (state.endedAt) return
+    if (!state) return []
+    if (state.endedAt) return []
 
     state.endedAt = Date.now()
 
@@ -219,7 +202,10 @@ export class GameManager {
       delete state.timerHandle
     }
 
-    this.onGameEnded?.(roomId, this.getScoreboard(roomId), reason)
+    const scoreboard = this.getScoreboard(roomId, priorityPlayerId)
+    this.onGameEnded?.(roomId, scoreboard, reason)
+    this.games.delete(roomId)
+    return scoreboard
   }
 
   endByTimer(roomId: string): GameScoreEntry[] {
@@ -228,19 +214,7 @@ export class GameManager {
     if (state.endedAt) return []
 
     state.endedByTimer = true
-    state.endedAt = Date.now()
-
-    for (const [playerId, entry] of state.scores) {
-      const board = this.getPlayerBoard(roomId, playerId)
-      if (board) {
-        const bonus = calculateEndGameBonus(board)
-        entry.score += bonus.total
-      }
-    }
-
-    const scoreboard = this.getScoreboard(roomId)
-    this.onGameEnded?.(roomId, scoreboard, 'timeout')
-    return scoreboard
+    return this.endGame(roomId, 'timeout')
   }
 
   revealCell(roomId: string, playerId: string, row: number, col: number):
@@ -263,8 +237,46 @@ export class GameManager {
 
     const cell = board[row]?.[col]
     if (!cell) return { success: false, error: 'Célula inválida' }
+    if (cell.isFlagged) return { success: false, error: 'Remova a bandeira antes de revelar' }
     if (cell.isRevealed) return { success: false, error: 'Célula já revelada' }
 
+    // ---- FIRST-CLICK SAFETY ----
+    const firstRevealKey = state.mode === 'cooperative' ? 'shared' : playerId
+    if (!state.firstRevealDone.get(firstRevealKey)) {
+      state.firstRevealDone.set(firstRevealKey, true)
+      if (cell.hasMine) {
+        // Relocate mine from the first-click cell
+        let relocationBoard: Board
+        if (state.mode === 'competitive') {
+          // Use template for relocation, then propagate FULL layout to all player boards
+          relocationBoard = state.template!
+          relocateMine(relocationBoard, row, col)
+          // Propagate the ENTIRE layout (hasMine + adjacentMines) to all player boards,
+          // preserving each player's game state (isRevealed, isFlagged, revealedBy)
+          for (const [pid, boardData] of state.playerBoards) {
+            if (pid !== 'template') {
+              for (let r = 0; r < state.config.rows; r++) {
+                for (let c = 0; c < state.config.cols; c++) {
+                  const playerCell = boardData.board[r][c]
+                  const templateCell = relocationBoard[r][c]
+                  boardData.board[r][c] = {
+                    ...playerCell,           // preserves isRevealed, isFlagged, revealedBy
+                    hasMine: templateCell.hasMine,
+                    adjacentMines: templateCell.adjacentMines,
+                  }
+                }
+              }
+            }
+          }
+        } else {
+          // multi-board or cooperative: just this board
+          relocationBoard = board
+          relocateMine(relocationBoard, row, col)
+        }
+        // Continue as safe reveal (cell no longer has mine)
+      }
+    }
+
     // ---- MINE EXPLOSION ----
     if (cell.hasMine) {
       cell.isRevealed = true
@@ -297,7 +309,13 @@ export class GameManager {
         this.onPlayerBoardComplete?.(roomId, playerId)
 
         if (state.mode === 'cooperative') {
-          this.endGame(roomId, 'win')
+          this.awardCoopWin(state, playerId, entry, roomId)
+          return { ...result, boardComplete: true, gameEnded: true }
+        }
+
+        // Multi-board (Race): first to complete wins immediately
+        if (state.mode === 'multi-board') {
+          this.endGame(roomId, 'complete', playerId)
           return { ...result, boardComplete: true, gameEnded: true }
         }
 
@@ -334,13 +352,7 @@ export class GameManager {
 
     // ---- COOPERATIVE WIN ----
     if (state.mode === 'cooperative' && isBoardComplete(board)) {
-      entry.score += calculateScore('win')
-
-      const elapsed = (Date.now() - state.startedAt) / 1000
-      const timeBonus = Math.max(0, Math.round(COOP_TIME_BONUS_MAX * ((180 - elapsed) / 60)))
-      entry.score += timeBonus
-
-      this.endGame(roomId, 'win')
+      this.awardCoopWin(state, playerId, entry, roomId)
 
       return {
         success: true,
@@ -355,6 +367,12 @@ export class GameManager {
       state.playerStatus.set(playerId, 'boardComplete')
       this.onPlayerBoardComplete?.(roomId, playerId)
 
+      // Multi-board (Race): first to complete wins immediately
+      if (state.mode === 'multi-board') {
+        this.endGame(roomId, 'complete', playerId)
+        return { success: true, cells, delta, boardComplete: true, gameEnded: true }
+      }
+
       if (this.checkAllPlayersDone(state)) {
         this.endGame(roomId, 'complete')
         return { success: true, cells, delta, boardComplete: true, gameEnded: true }
@@ -390,11 +408,23 @@ export class GameManager {
 
     cell.isFlagged = !cell.isFlagged
 
+    // Score flags live: +25 for correct flag, -15 for wrong flag
+    // Symmetric: removing a flag reverses the delta
+    let delta = 0
+    if (cell.isFlagged) {
+      // Placing flag
+      delta = cell.hasMine ? calculateScore('flag-correct') : calculateScore('flag-wrong')
+    } else {
+      // Removing flag - reverse the delta
+      delta = cell.hasMine ? -calculateScore('flag-correct') : -calculateScore('flag-wrong')
+    }
+    entry.score += delta
+
     const result = {
       success: true as const,
       cellId: `${row}-${col}`,
       flagged: cell.isFlagged,
-      delta: 0,
+      delta,
     }
 
     // Check if this completed the board
@@ -403,7 +433,13 @@ export class GameManager {
       this.onPlayerBoardComplete?.(roomId, playerId)
 
       if (state.mode === 'cooperative') {
-        this.endGame(roomId, 'win')
+        this.awardCoopWin(state, playerId, entry, roomId)
+        return { ...result, boardComplete: true, gameEnded: true }
+      }
+
+      // Multi-board (Race): first to complete wins immediately
+      if (state.mode === 'multi-board') {
+        this.endGame(roomId, 'complete', playerId)
         return { ...result, boardComplete: true, gameEnded: true }
       }
 
@@ -426,13 +462,26 @@ export class GameManager {
     return alive
   }
 
-  getScoreboard(roomId: string): GameScoreEntry[] {
+  getScoreboard(roomId: string, priorityPlayerId?: string): GameScoreEntry[] {
     const state = this.games.get(roomId)
     if (!state) return []
 
-    return Array.from(state.scores.values())
+    const sorted = Array.from(state.scores.values())
       .sort((a, b) => b.score - a.score)
-      .map((entry, i) => ({ ...entry, rank: i + 1 })) as any
+      .map((entry, i) => ({ ...entry, rank: i + 1 }))
+
+    // If priorityPlayerId is provided, move that player to rank 1
+    if (priorityPlayerId) {
+      const priorityIndex = sorted.findIndex(e => e.playerId === priorityPlayerId)
+      if (priorityIndex > 0) {
+        const [priorityEntry] = sorted.splice(priorityIndex, 1)
+        sorted.unshift({ ...priorityEntry, rank: 1 })
+        // Renumber ranks
+        sorted.forEach((entry, i) => { entry.rank = i + 1 })
+      }
+    }
+
+    return sorted as any
   }
 
   removeGame(roomId: string): void {
diff --git a/apps/server/src/sockets/gameHandler.ts b/apps/server/src/sockets/gameHandler.ts
index 893131a..118a247 100644
--- a/apps/server/src/sockets/gameHandler.ts
+++ b/apps/server/src/sockets/gameHandler.ts
@@ -75,9 +75,7 @@ export function setupGameHandlers(io: Server, socket: Socket, roomManager: RoomM
         io.to(room.id).emit('game:playerBoardComplete', { playerId })
       }
 
-      if (result.gameEnded) {
-        gameManager.removeGame(room.id)
-      }
+      // Game state is removed in endGame, no need to call removeGame here
       return
     }
 
@@ -102,9 +100,7 @@ export function setupGameHandlers(io: Server, socket: Socket, roomManager: RoomM
       io.to(room.id).emit('game:playerBoardComplete', { playerId })
     }
 
-    if (result.gameEnded) {
-      gameManager.removeGame(room.id)
-    }
+    // Game state is removed in endGame, no need to call removeGame here
   })
 
   socket.on('game:flag', (data: { cellId: string }) => {
@@ -119,7 +115,10 @@ export function setupGameHandlers(io: Server, socket: Socket, roomManager: RoomM
     const playerId = getPlayerId(socket)
 
     const result = gameManager.flagCell(room.id, playerId, row, col)
-    if (!result.success) return
+    if (!result.success) {
+      socket.emit('error', { code: 'FLAG_FAILED', message: result.error })
+      return
+    }
 
     const emit = (event: string, data: any) => emitToTarget(io, socket, room, event, data)
 
@@ -129,24 +128,19 @@ export function setupGameHandlers(io: Server, socket: Socket, roomManager: RoomM
       flagged: result.flagged,
     })
 
+    // Emit score update for flag action
+    io.to(room.id).emit('game:scoreUpdate', {
+      playerId,
+      delta: result.delta,
+      total: (gameManager.getGame(room.id)?.scores.get(playerId)?.score || 0),
+    })
+
     if (result.boardComplete) {
       io.to(room.id).emit('game:playerBoardComplete', { playerId })
     }
 
-    if (result.gameEnded) {
-      gameManager.removeGame(room.id)
-    }
-  })
-
-  socket.on('game:ping', (data: { type: string }) => {
-    const room = roomManager.getRoomBySocket(socket.id)
-    if (!room) return
-
-    io.to(room.id).emit('game:ping', {
-      playerId: socket.id,
-      type: data.type,
-    })
+    // Game state is removed in endGame, no need to call removeGame here
   })
 
-  // chat:message is handled in roomHandler.ts — do not duplicate
+  // game:ping handler removed - pings work via chat:message
 }
diff --git a/packages/shared/src/index.ts b/packages/shared/src/index.ts
index e7853b1..d975d5f 100644
--- a/packages/shared/src/index.ts
+++ b/packages/shared/src/index.ts
@@ -194,3 +194,71 @@ export function checkWin(board: Board): boolean {
   }
   return true
 }
+
+// First-click safety: relocate a mine from the clicked cell to a random valid position
+export function relocateMine(board: Board, safeRow: number, safeCol: number): boolean {
+  const rows = board.length
+  const cols = board[0].length
+
+  // Precondition: the clicked cell MUST have a mine (that's why first-click safety triggered)
+  if (!board[safeRow][safeCol].hasMine) return false
+
+  // Find a target cell that is NOT a mine and NOT in the 3x3 neighborhood of (safeRow, safeCol)
+  let targetCell: { row: number; col: number } | null = null
+  for (let r = 0; r < rows; r++) {
+    for (let c = 0; c < cols; c++) {
+      if (!board[r][c].hasMine) {
+        const inSafeZone = Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1
+        if (!inSafeZone) {
+          targetCell = { row: r, col: c }
+          break
+        }
+      }
+    }
+    if (targetCell) break
+  }
+
+  if (!targetCell) return false // No valid target (should not happen with mines <= rows*cols - 9)
+
+  // Swap: move mine FROM clicked cell TO target cell
+  board[safeRow][safeCol].hasMine = false
+  board[targetCell.row][targetCell.col].hasMine = true
+
+  // Recalculate adjacentMines for affected neighborhoods (both cells and their surrounding 3x3 areas)
+  const affectedCells = new Set<string>()
+
+  // Add neighborhoods of both cells
+  const addNeighborhood = (r: number, c: number) => {
+    for (let dr = -1; dr <= 1; dr++) {
+      for (let dc = -1; dc <= 1; dc++) {
+        const nr = r + dr
+        const nc = c + dc
+        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
+          affectedCells.add(`${nr}-${nc}`)
+        }
+      }
+    }
+  }
+
+  addNeighborhood(safeRow, safeCol)
+  addNeighborhood(targetCell.row, targetCell.col)
+
+  // Recalculate adjacentMines for affected cells
+  for (const key of affectedCells) {
+    const [r, c] = key.split('-').map(Number)
+    if (board[r][c].hasMine) continue
+    let count = 0
+    for (let dr = -1; dr <= 1; dr++) {
+      for (let dc = -1; dc <= 1; dc++) {
+        const nr = r + dr
+        const nc = c + dc
+        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].hasMine) {
+          count++
+        }
+      }
+    }
+    board[r][c].adjacentMines = count
+  }
+
+  return true
+}
diff --git a/specs/README.md b/specs/README.md
index bc5fd5f..427721a 100644
--- a/specs/README.md
+++ b/specs/README.md
@@ -11,7 +11,7 @@ Especificações de correções e implementações pendentes do projeto. Cada sp
 | 03 | [Lobby com dados reais (presença + ranking)](03-lobby-dados-reais.md) | P2 | 02 | Pronta para execução |
 | 04 | [Battle Royale (rodadas, eliminação, dificuldade progressiva)](04-battle-royale.md) | P2 | 06 (sanitização do board) | Pronta para execução |
 | 05 | [Fog of War (peões, visão limitada, anti-cheat)](05-fog-of-war.md) | P3 | 06 (sanitização do board) | Pronta para execução |
-| 06 | [Core fixes da auditoria dos modos (24 itens)](06-game-core-fixes.md) | P1 | 02 (item 17) | Em execução — Passos 1–2 ✓, Passo 3 concluído (reconexão sem desync) |
+| 06 | [Core fixes da auditoria dos modos (24 itens)](06-game-core-fixes.md) | P1 | 02 (item 17) | Em execução — Passos 1–3 ✓, Passos 4–10 concluídos (servidor: flags, first-click, score, race, fim unificado) |
 
 ## Prioridades de execução
 
@@ -47,3 +47,10 @@ Especificações de correções e implementações pendentes do projeto. Cada sp
 - 2026-08-01 — SPEC 06 Passo 2 concluído: módulo roomValidation.ts + guarda RangeError em generateBoard. Validado com typecheck + testes de rejeição.
 - 2026-08-01 — SPEC 06 Passo 2 (ajuste): timeLimit forçado a 0 no coop agora propagado por validateRoomCreate ao createRoom (antes era descartado).
 - 2026-08-01 — SPEC 06 Passo 3 concluído: re-emit de room:join no reconnect + flag inOnlineMatch (sem fallback offline em partida online). Validado com typecheck + teste de reconnect.
+- 2026-08-01 — SPEC 06 Passo 4 concluído: bloqueio de revelar célula com bandeira em GameManager.revealCell. Validado com typecheck.
+- 2026-08-01 — SPEC 06 Passo 5 concluído: first-click safety no servidor com helper relocateMine em shared + firstRevealDone Map + template competitive. Validado com typecheck.
+- 2026-08-01 — SPEC 06 Passo 7 concluído: fórmula do bônus de tempo cooperativo corrigida (COOP_TIME_BONUS_MAX=600, COOP_IDEAL_TIME_SECONDS=300). Validado com typecheck.
+- 2026-08-01 — SPEC 06 Passo 9 concluído: modelo único de pontuação de bandeiras ao vivo (+25/-15 simétrico), remoção de calculateEndGameBonus e constantes relacionadas, game:scoreUpdate emitido em flag. Validado com typecheck.
+- 2026-08-01 — SPEC 06 Passo 6 concluído: helper awardCoopWin usado nas 3 rotas de vitória coop (reveal seguro, explosão última mina, bandeira última mina). Validado com typecheck.
+- 2026-08-01 — SPEC 06 Passo 8 concluído: fim de jogo unificado — endGame remove estado do Map, endByTimer vira wrapper, removeGame removido dos handlers. Validado com typecheck.
+- 2026-08-01 — SPEC 06 Passo 10 concluído: Race multi-board termina no primeiro completar + getScoreboard com priorityPlayerId para rank 1. Validado com typecheck.
```