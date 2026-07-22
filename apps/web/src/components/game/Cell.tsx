import type { Cell as CellType } from '@minado/shared'

interface CellProps {
  cell: CellType
  onReveal?: () => void
  onFlag?: (_e: React.MouseEvent) => void
}

const numberClasses: Record<number, string> = {
  1: 'board-cell--number-1',
  2: 'board-cell--number-2',
  3: 'board-cell--number-3',
  4: 'board-cell--number-4',
  5: 'board-cell--number-5',
  6: 'board-cell--number-6',
  7: 'board-cell--number-7',
  8: 'board-cell--number-8',
}

export function Cell({ cell, onReveal, onFlag }: CellProps) {
  const classes = ['board-cell']

  if (cell.isRevealed) {
    classes.push('board-cell--revealed')
    if (cell.hasMine) {
      classes.push('board-cell--mine')
    } else if (cell.adjacentMines === 0) {
      classes.push('board-cell--safe')
    } else {
      const numClass = numberClasses[cell.adjacentMines]
      if (numClass) classes.push(numClass)
    }
  } else if (cell.isFlagged) {
    classes.push('board-cell--flagged')
  }

  let content = ''
  if (cell.isRevealed) {
    if (cell.hasMine) {
      content = '💣'
    } else if (cell.adjacentMines > 0) {
      content = String(cell.adjacentMines)
    }
  } else if (cell.isFlagged) {
    content = '🚩'
  }

  return (
    <button
      className={classes.join(' ')}
      onClick={onReveal}
      onContextMenu={onFlag}
      aria-label={
        cell.isRevealed
          ? cell.hasMine
            ? 'Mina'
            : cell.adjacentMines > 0
              ? `${cell.adjacentMines} minas adjacentes`
              : 'Casa vazia'
          : cell.isFlagged
            ? 'Bandeira marcada'
            : 'Casa coberta'
      }
    >
      {content}
    </button>
  )
}
