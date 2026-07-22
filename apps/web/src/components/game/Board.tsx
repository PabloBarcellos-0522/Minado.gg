import { Cell } from './Cell'
import type { Cell as CellType } from '@minado/shared'
import '../../styles/game.css'

interface BoardProps {
  board: CellType[][]
  onReveal?: (_row: number, _col: number) => void
  onFlag?: (_row: number, _col: number) => void
}

export function Board({ board, onReveal, onFlag }: BoardProps) {
  const cols = board[0]?.length || 8

  return (
    <div
      className="board"
      style={{ '--board-cols': cols } as React.CSSProperties}
    >
      {board.map((row, r) =>
        row.map((cell, c) => (
          <Cell
            key={cell.id}
            cell={cell}
            onReveal={() => onReveal?.(r, c)}
            onFlag={(e) => {
              e.preventDefault()
              onFlag?.(r, c)
            }}
          />
        )),
      )}
    </div>
  )
}
