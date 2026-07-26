import { create } from "zustand";
import type { Board as SharedBoard, BoardConfig, GameMode } from "@minado/shared";
type Board = SharedBoard;
import { generateBoard, floodFill, checkWin, calculateScore } from "@minado/shared";
import { getSocket, onSocketEvent } from "@/lib/socket";

export interface GamePlayer {
  id: string;
  username: string;
  score: number;
  color: string;
  isEliminated?: boolean;
  isConnected?: boolean;
}

export interface GameMessage {
  id: string;
  from: string;
  text: string;
  ts: string;
  isSystem?: boolean;
}

export interface GameAction {
  playerId: string;
  type: "reveal" | "flood-fill" | "flag-correct" | "flag-wrong" | "explode" | "win";
  points: number;
  timestamp: string;
}

export interface LastMatchResult {
  mode: GameMode;
  winner?: string;
  scoreboard: Array<{
    playerId: string;
    username: string;
    avatarUrl?: string;
    score: number;
    rank: number;
    isYou: boolean;
  }>;
  startedAt: string;
  endedAt: string;
  actions: GameAction[];
}

const defaultConfig: BoardConfig = { rows: 16, cols: 16, mines: 40 };

export const useGameStore = create<{
  board: Board;
  boardConfig: BoardConfig;
  gameState: "idle" | "playing" | "won" | "lost";
  players: GamePlayer[];
  messages: GameMessage[];
  currentUserId: string;
  timeElapsed: number;
  flagsPlaced: number;
  firstClick: boolean;
  showBoom: boolean;
  showConfetti: boolean;
  lastMatchResult: LastMatchResult | null;
  gameMode: GameMode;
  gameStartedAt: string;
  isOnline: boolean;
  removedForInactivity: boolean;
  timeRemaining: number;

  initBoard: (config: BoardConfig, mode?: GameMode, board?: Board) => void;
  revealCell: (row: number, col: number) => void;
  flagCell: (row: number, col: number) => void;
  setPlayers: (players: GamePlayer[]) => void;
  addMessage: (msg: GameMessage) => void;
  tick: () => void;
  resetGame: () => void;
  setShowBoom: (show: boolean) => void;
  setShowConfetti: (show: boolean) => void;
  setCurrentUserId: (id: string) => void;
  initSocketListeners: () => () => void;
  setRemovedForInactivity: (value: boolean) => void;
}>()((set, get) => ({
  board: [],
  boardConfig: defaultConfig,
  gameState: "idle",
  players: [],
  messages: [],
  currentUserId: "1",
  timeElapsed: 0,
  flagsPlaced: 0,
  firstClick: true,
  showBoom: false,
  showConfetti: false,
  lastMatchResult: null,
  gameMode: "competitive",
  gameStartedAt: "",
  isOnline: false,
  removedForInactivity: false,
  timeRemaining: 0,

  initSocketListeners: () => {
    const socket = getSocket();
    if (socket.connected) set({ isOnline: true });

    const unsubs = [
      onSocketEvent("connect", () => set({ isOnline: true })),
      onSocketEvent("disconnect", () => set({ isOnline: false })),
      onSocketEvent("game:started", (data: unknown) => {
        const ev = data as {
          board: Board;
          boardMeta: { rows: number; cols: number; mines: number; mode: string; timeLimit?: number };
          players: Array<{ id: string; username: string; score?: number }>;
        };
        if (!ev.board) {
          console.error("[game:started] server did not send board — aborting");
          return;
        }
        const timeLimit = ev.boardMeta.timeLimit || 0
        set({
          board: ev.board,
          boardConfig: {
            rows: ev.boardMeta.rows,
            cols: ev.boardMeta.cols,
            mines: ev.boardMeta.mines,
          },
          gameMode: ev.boardMeta.mode as GameMode,
          gameState: "playing",
          timeElapsed: 0,
          timeRemaining: timeLimit,
          flagsPlaced: 0,
          firstClick: true,
          showBoom: false,
          showConfetti: false,
          messages: [],
          gameStartedAt: new Date().toISOString(),
          lastMatchResult: null,
          removedForInactivity: false,
          players: ev.players.map((p: any) => ({
            id: p.id,
            username: p.username,
            score: p.score || 0,
            color: "",
          })),
        });
      }),
      onSocketEvent("game:cellRevealed", (data: unknown) => {
        const ev = data as {
          batch?: Array<{ cellId: string; value: number; revealedBy: string }>;
          cellId?: string;
          value?: number | "mine";
          revealedBy?: string;
          exploded?: boolean;
        };
        const state = get();

        if (ev.exploded) {
          const [r, c] = (ev.cellId || "0-0").split("-").map(Number);
          const newBoard = state.board.map((row) =>
            row.map((cell) =>
              cell.row === r && cell.col === c ? { ...cell, isRevealed: true } : cell,
            ),
          );
          set({ board: newBoard, showBoom: true });
          return;
        }

        if (ev.batch) {
          const newBoard = state.board.map((row) =>
            row.map((cell) => {
              const update = ev.batch!.find((b) => b.cellId === `${cell.row}-${cell.col}`);
              if (update) return { ...cell, isRevealed: true, revealedBy: update.revealedBy };
              return cell;
            }),
          );
          set({ board: newBoard });
          return;
        }

        if (ev.cellId && ev.value !== undefined) {
          const [r, c] = ev.cellId.split("-").map(Number);
          const newBoard = state.board.map((row) =>
            row.map((cell) =>
              cell.row === r && cell.col === c
                ? { ...cell, isRevealed: true, revealedBy: ev.revealedBy }
                : cell,
            ),
          );
          set({ board: newBoard });
        }
      }),
      onSocketEvent("game:cellFlagged", (data: unknown) => {
        const ev = data as { cellId: string; flagged: boolean };
        const [r, c] = ev.cellId.split("-").map(Number);
        const state = get();
        const newBoard = state.board.map((row) =>
          row.map((cell) =>
            cell.row === r && cell.col === c ? { ...cell, isFlagged: ev.flagged } : cell,
          ),
        );
        const flagsPlaced = newBoard.reduce(
          (acc, row) => acc + row.reduce((a, cell) => a + (cell.isFlagged ? 1 : 0), 0),
          0,
        );
        set({ board: newBoard, flagsPlaced });
      }),
      onSocketEvent("game:scoreUpdate", (data: unknown) => {
        const ev = data as { playerId: string; delta: number; total: number };
        const state = get();
        set({
          players: state.players.map((p) => (p.id === ev.playerId ? { ...p, score: ev.total } : p)),
        });
      }),
      onSocketEvent("game:ended", (data: unknown) => {
        const ev = data as {
          result: string;
          scoreboard: Array<{ playerId: string; score: number; rank: number }>;
        };
        const state = get();
        const isWin = ev.result === "win";
        const isTimeout = ev.result === "timeout";
        set({
          gameState: isWin ? "won" : "lost",
          showConfetti: isWin,
          showBoom: !isWin && !isTimeout,
          timeRemaining: 0,
        });

        const endedAt = new Date().toISOString();
        const scoreboard = ev.scoreboard.map((entry) => {
          const player = state.players.find((p) => p.id === entry.playerId);
          return {
            playerId: entry.playerId,
            username: player?.username || "Desconhecido",
            avatarUrl: "",
            score: entry.score,
            rank: entry.rank,
            isYou: entry.playerId === state.currentUserId,
          };
        });

        set({
          lastMatchResult: {
            mode: state.gameMode,
            winner: scoreboard[0]?.playerId,
            scoreboard,
            startedAt: state.gameStartedAt,
            endedAt,
            actions: [],
          },
        });
      }),
      onSocketEvent("chat:message", (data: unknown) => {
        const msg = data as {
          id: string;
          from: string;
          text: string;
          ts: string;
          isSystem?: boolean;
        };
        get().addMessage({
          id: msg.id,
          from: msg.from,
          text: msg.text,
          ts: new Date(msg.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          isSystem: msg.isSystem,
        });
      }),
      onSocketEvent("room:state", (data: unknown) => {
        const room = data as { players: Array<{ id: string; isConnected: boolean }> };
        if (!room.players) return;
        const state = get();
        set({
          players: state.players.map((p) => {
            const updated = room.players.find((rp) => rp.id === p.id);
            return updated ? { ...p, isConnected: updated.isConnected } : p;
          }),
        });
      }),
      onSocketEvent("game:playerRemoved", (data: unknown) => {
        const ev = data as { playerId: string };
        const state = get();
        set({ players: state.players.filter((p) => p.id !== ev.playerId) });
      }),
      onSocketEvent("game:removedForInactivity", (data: unknown) => {
        const ev = data as { reason: string };
        console.warn("[game] removed for inactivity:", ev.reason);
        set({ removedForInactivity: true });
      }),
    ];

    return () => unsubs.forEach((fn) => fn());
  },

  initBoard: (config, mode, board?) => {
    const b = board || generateBoard(config.rows, config.cols, config.mines);
    set({
      board: b,
      boardConfig: config,
      gameMode: mode || "competitive",
      gameState: "playing",
      timeElapsed: 0,
      flagsPlaced: 0,
      firstClick: true,
      showBoom: false,
      showConfetti: false,
      gameStartedAt: new Date().toISOString(),
      lastMatchResult: null,
      timeRemaining: 0,
    });
  },

  revealCell: (row, col) => {
    const state = get();
    if (state.gameState !== "playing") return;

    if (state.isOnline) {
      if (state.timeRemaining === 0 && state.gameMode !== "cooperative") return
      getSocket().emit("game:reveal", { cellId: `${row}-${col}` });
      return;
    }

    const board = state.board;
    const cell = board[row]?.[col];
    if (!cell || cell.isRevealed || cell.isFlagged) return;

    if (state.firstClick) {
      const newBoard = generateBoard(
        state.boardConfig.rows,
        state.boardConfig.cols,
        state.boardConfig.mines,
        row,
        col,
      );
      const clicked = newBoard[row][col];
      if (clicked.adjacentMines === 0) {
        const revealed = floodFill(newBoard, row, col);
        revealed.forEach(({ row: r, col: c }) => {
          newBoard[r][c] = { ...newBoard[r][c], isRevealed: true, revealedBy: state.currentUserId };
        });
      } else {
        newBoard[row][col] = { ...clicked, isRevealed: true, revealedBy: state.currentUserId };
      }
      set({ board: newBoard, firstClick: false });
      return;
    }

    if (cell.hasMine) {
      const newBoard = board.map((r) =>
        r.map((c) => (c.row === row && c.col === col ? { ...c, isRevealed: true } : c)),
      );
      const players = state.players.map((p) =>
        p.id === state.currentUserId ? { ...p, score: p.score + calculateScore("explode") } : p,
      );
      set({ board: newBoard, showBoom: true, players });
      return;
    }

    const boardCopy = board.map((r) => [...r]);
    if (cell.adjacentMines === 0) {
      const revealed = floodFill(boardCopy, row, col);
      revealed.forEach(({ row: r, col: c }) => {
        boardCopy[r][c] = { ...boardCopy[r][c], isRevealed: true, revealedBy: state.currentUserId };
      });
      const points = revealed.length > 5 ? calculateScore("flood-fill") : calculateScore("reveal");
      const players = state.players.map((p) =>
        p.id === state.currentUserId ? { ...p, score: p.score + points } : p,
      );
      set({ board: boardCopy, players });
    } else {
      boardCopy[row][col] = { ...cell, isRevealed: true, revealedBy: state.currentUserId };
      const players = state.players.map((p) =>
        p.id === state.currentUserId ? { ...p, score: p.score + calculateScore("reveal") } : p,
      );
      set({ board: boardCopy, players });
    }

    const updatedBoard = get().board;
    if (checkWin(updatedBoard)) {
      const players = get().players.map((p) =>
        p.id === state.currentUserId ? { ...p, score: p.score + calculateScore("win") } : p,
      );
      set({ gameState: "won", showConfetti: true, players });

      const endedAt = new Date().toISOString();
      const scoreboard = players
        .map((p) => ({
          playerId: p.id,
          username: p.username,
          avatarUrl: "",
          score: p.score,
          rank: 0,
          isYou: p.id === state.currentUserId,
        }))
        .sort((a, b) => b.score - a.score)
        .map((p, i) => ({ ...p, rank: i + 1 }));

      set({
        lastMatchResult: {
          mode: state.gameMode,
          winner: state.currentUserId,
          scoreboard,
          startedAt: state.gameStartedAt,
          endedAt,
          actions: [
            {
              playerId: state.currentUserId,
              type: "win",
              points: calculateScore("win"),
              timestamp: new Date().toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
            },
          ],
        },
      });
    }
  },

  flagCell: (row, col) => {
    const state = get();
    if (state.gameState !== "playing") return;

    if (state.isOnline) {
      if (state.timeRemaining === 0 && state.gameMode !== "cooperative") return
      getSocket().emit("game:flag", { cellId: `${row}-${col}` });
      return;
    }

    const cell = state.board[row]?.[col];
    if (!cell || cell.isRevealed) return;

    const newBoard = state.board.map((r) =>
      r.map((c) => (c.row === row && c.col === col ? { ...c, isFlagged: !c.isFlagged } : c)),
    );

    const flagsPlaced = newBoard.reduce(
      (acc, r) => acc + r.reduce((a, c) => a + (c.isFlagged ? 1 : 0), 0),
      0,
    );

    set({ board: newBoard, flagsPlaced });
  },

  setPlayers: (players) => set({ players }),

  setCurrentUserId: (id) => set({ currentUserId: id }),

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),

  tick: () => set((state) => ({
    timeElapsed: state.timeElapsed + 1,
    timeRemaining: state.timeRemaining > 0 ? state.timeRemaining - 1 : 0,
  })),

  resetGame: () =>
    set({
      board: [],
      boardConfig: defaultConfig,
      gameState: "idle",
      timeElapsed: 0,
      flagsPlaced: 0,
      firstClick: true,
      showBoom: false,
      showConfetti: false,
      messages: [],
      lastMatchResult: null,
      removedForInactivity: false,
      timeRemaining: 0,
    }),

  setShowBoom: (show) => set({ showBoom: show }),
  setShowConfetti: (show) => set({ showConfetti: show }),
  setRemovedForInactivity: (value) => set({ removedForInactivity: value }),
}));
