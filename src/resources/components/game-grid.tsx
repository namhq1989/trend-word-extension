import { GridCell, WordToFind } from '@/resources/components/game-play-phase.tsx'

interface GameGridProps {
  gameGrid: GridCell[][]
  selectedCells: GridCell[]
  wordsToFind: WordToFind[]
  handleCellClick: (cell: GridCell) => void
  showMaskedWords?: boolean // Optional prop for testing visualization
  isIncorrectSelection?: boolean // Flag to indicate incorrect word selection
}

const GameGrid = ({ gameGrid, selectedCells, wordsToFind, handleCellClick, showMaskedWords = false, isIncorrectSelection = false }: GameGridProps) => {
  // Determine grid size dynamically based on the gameGrid dimensions
  const gridSize = gameGrid.length;
  
  // Helper function to get the cell background color
  const getCellBackgroundColor = (cell: GridCell): string => {
    // If cell is selected, don't apply any custom color
    if (selectedCells.includes(cell)) {
      return ''; // Default selection color will be applied via className
    }
    
    // If cell is revealed, show its word color
    if (cell.revealed) {
      // Find which word this cell belongs to and use its color
      return wordsToFind.find(w => 
        w.found && w.letters.some(l => l.row === cell.row && l.col === cell.col)
      )?.color || '#3B82F6';
    }
    
    // For testing mode: show colors for all word cells even when not found
    if (showMaskedWords && cell.partOfWord) {
      // Find which word this cell belongs to
      const wordObj = wordsToFind.find(w => 
        w.letters.some(l => l.row === cell.row && l.col === cell.col)
      );
      
      if (wordObj) {
        // Apply a lighter version of the word's color for better text visibility
        return `${wordObj.color}50`; // 50 is hex for 31% opacity
      }
    }
    
    return ''; // Default background
  };
  
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
              ${selectedCells.includes(cell) 
                ? isIncorrectSelection 
                  ? 'bg-red-500 text-white' 
                  : 'bg-primary text-white' 
                : ''}
              transition-all duration-200 hover:bg-primary/20
            `}
            onClick={() => handleCellClick(cell)}
            style={{
              // Apply unique color for each word's cells based on conditions
              backgroundColor: getCellBackgroundColor(cell),
              // Add a subtle border for test mode to make word boundaries clearer
              border: showMaskedWords && cell.partOfWord ? '1px dashed #666' : ''
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
