import { GridCell, WordToFind } from '@/resources/components/game-play-phase.tsx'

interface GameGridProps {
  gameGrid: GridCell[][]
  selectedCells: GridCell[]
  wordsToFind: WordToFind[]
  handleCellClick: (cell: GridCell) => void
}

const GameGrid = ({ gameGrid, selectedCells, wordsToFind, handleCellClick }: GameGridProps) => {
  // Determine grid size dynamically based on the gameGrid dimensions
  const gridSize = gameGrid.length;
  
  return (
    <div className='flex justify-center'>
      <div 
        className={`grid gap-1 w-full max-w-[450px]`}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`
        }}>
        {gameGrid.flat().map((cell, index) => (
          <div
            key={index}
            className={`
              w-full aspect-square flex items-center justify-center 
              text-lg font-bold uppercase cursor-pointer rounded-md
              ${!cell.revealed ? 'bg-muted' : ''}
              ${selectedCells.includes(cell) ? 'bg-primary text-white' : ''}
              transition-all duration-200 hover:bg-primary/20
            `}
            onClick={() => handleCellClick(cell)}
            style={{
              // Apply unique color for each word's revealed cells, but only when not selected
              backgroundColor: cell.revealed && !selectedCells.includes(cell) ? 
                // Find which word this cell belongs to and use its color
                wordsToFind.find(w => w.found && w.letters.some(l => l.row === cell.row && l.col === cell.col))?.color || 
                '#3B82F6' : ''
            }}
          >
            {cell.letter}
          </div>
        ))}
      </div>
    </div>
  )
}

export default GameGrid
