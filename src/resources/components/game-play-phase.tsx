import React from 'react'
import { Button } from '@/components/ui/button.tsx'
import { IWord } from '@/app/models/word.ts'
import GameGrid from '@/resources/components/game-grid.tsx'
import WordList from '@/resources/components/word-list.tsx'
import GameHeader from '@/resources/components/game-header.tsx'
import GameCompletionMessage from '@/resources/components/game-completion-message.tsx'

// Grid cell interface
export interface GridCell {
  letter: string
  row: number
  col: number
  selected: boolean
  revealed: boolean
  partOfWord: boolean
}

// Word to find interface
export interface WordToFind {
  word: string
  found: boolean
  level: string
  points: number
  pointsEarned?: number
  letters: GridCell[]
  color: string
  hintRevealed: boolean
  revealedCharIndices: number[]
  definitions: any[]
}

interface GamePlayPhaseProps {
  words: IWord[]
  gameGrid: GridCell[][]
  wordsToFind: WordToFind[]
  score: number
  setScore: React.Dispatch<React.SetStateAction<number>>
  selectedCells: GridCell[]
  setSelectedCells: React.Dispatch<React.SetStateAction<GridCell[]>>
  setGameGrid: React.Dispatch<React.SetStateAction<GridCell[][]>>
  setWordsToFind: React.Dispatch<React.SetStateAction<WordToFind[]>>
  timeRemaining: number | null
  isGameComplete: boolean
  showMaskedWords: boolean
  toggleShowMaskedWords: () => void
  playAudio: (id: string) => void
  // Game settings
  wordCount: number
  maxWordLength: number
  timeLimit: number
  autoRevealCount: number
}

const GamePlayPhase = ({
  words,
  gameGrid,
  wordsToFind,
  score,
  setScore,
  selectedCells,
  setSelectedCells,
  setGameGrid,
  setWordsToFind,
  timeRemaining,
  isGameComplete,
  showMaskedWords,
  playAudio,
  // Game settings
  wordCount,
  maxWordLength,
  timeLimit,
  autoRevealCount
}: GamePlayPhaseProps) => {
  
  // Handle cell click/selection
  const handleCellClick = (cell: GridCell) => {
    // Don't allow selection if game is complete
    if (isGameComplete) return;
    
    // Check if cell is already selected
    const cellIndex = selectedCells.findIndex(
      c => c.row === cell.row && c.col === cell.col
    )
    
    if (cellIndex !== -1) {
      // If clicking the last selected cell, deselect it
      if (cellIndex === selectedCells.length - 1) {
        setSelectedCells((prev: GridCell[]) => prev.slice(0, -1))
      }
      // If clicking a cell in the middle, deselect all cells after it
      else if (cellIndex < selectedCells.length - 1) {
        setSelectedCells((prev: GridCell[]) => prev.slice(0, cellIndex + 1))
      }
    } else {
      // Add cell to selection
      setSelectedCells((prev: GridCell[]) => [...prev, cell])
    }
  }

  // Check if selected cells form a valid word
  const checkSelectedWord = () => {
    if (selectedCells.length < 3) return
    
    const selectedWord = selectedCells.map(cell => cell.letter).join('')
    
    // Check if the word matches any of the words to find
    const wordIndex = wordsToFind.findIndex(
      w => w.word === selectedWord && !w.found
    )
    
    if (wordIndex !== -1) {
      // Word found!
      const updatedWordsToFind = [...wordsToFind]
      updatedWordsToFind[wordIndex].found = true
      
      // Update score
      const targetWord = updatedWordsToFind[wordIndex]
      const wordPoints = targetWord.points
      
      // Step 1: Set initial points based on auto-revealed count
      let initialPoints = 0
      
      // Use fixed percentages for different auto-reveal counts
      if (autoRevealCount === 0) {
        initialPoints = wordPoints // 100% of points for 0 auto-revealed
      } else if (autoRevealCount === 1) {
        initialPoints = Math.round(wordPoints * 0.85) // 85% for 1 auto-revealed
      } else if (autoRevealCount === 2) {
        initialPoints = Math.round(wordPoints * 0.70) // 70% for 2 auto-revealed
      } else {
        initialPoints = Math.round(wordPoints * 0.55) // 55% for 3+ auto-revealed
      }
      
      // Step 2: Calculate fixed points reduction per additional hint
      // Each additional hint reduces by 10 points or 10% of initial points, whichever is greater
      const pointsPerHint = Math.max(10, Math.round(initialPoints * 0.1))
      
      // Count additional hints beyond auto-revealed
      const additionalHints = Math.max(0, targetWord.revealedCharIndices.length - autoRevealCount)
      
      // Calculate total reduction from additional hints
      const hintReduction = pointsPerHint * additionalHints
      
      // Calculate actual points (with minimum guarantee of 25% of base points)
      const minimumPoints = Math.round(wordPoints * 0.25) // 25% minimum
      const actualPoints = Math.max(minimumPoints, initialPoints - hintReduction)
      
      // Store the points earned for this word
      updatedWordsToFind[wordIndex].pointsEarned = actualPoints
      
      // Add the points to the score
      setScore((prev: number) => prev + actualPoints)
      
      // Update the word's letters to use the selected cells instead of the predefined ones
      // This ensures the correct cells are highlighted when a word is found
      updatedWordsToFind[wordIndex].letters = [...selectedCells]
      setWordsToFind(updatedWordsToFind)
      
      // Highlight the selected cells that form the word
      const updatedGrid = [...gameGrid]
      
      selectedCells.forEach(cell => {
        updatedGrid[cell.row][cell.col].revealed = true
      })
      
      setGameGrid(updatedGrid)
      
      // Play the word's pronunciation using the existing audio player
      const originalWord = words.find(w => w.word.toLowerCase() === targetWord.word.toLowerCase())
      if (originalWord && originalWord.id) {
        playAudio(originalWord.id)
      }
    }
    
    // Clear selection
    setSelectedCells([])
  }

  // Show a hint for a specific word by revealing one random character
  const showWordHint = (wordIndex: number) => {
    if (wordIndex < 0 || wordIndex >= wordsToFind.length) return
    if (wordsToFind[wordIndex].found) return
    
    const targetWord = wordsToFind[wordIndex]
    const wordLength = targetWord.word.length
    
    // Get available indices (not yet revealed)
    const availableIndices = Array.from({ length: wordLength }, (_, i) => i)
      .filter(i => !targetWord.revealedCharIndices.includes(i))
    
    // If all characters are already revealed, do nothing
    if (availableIndices.length === 0 || targetWord.revealedCharIndices.length >= wordLength) return
    
    // Select a random index to reveal
    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
    
    // Update the word's revealed indices
    const updatedWordsToFind = [...wordsToFind]
    updatedWordsToFind[wordIndex].revealedCharIndices.push(randomIndex)
    updatedWordsToFind[wordIndex].hintRevealed = true
    
    // Step 1: Set initial points based on auto-revealed count (same as checkSelectedWord)
    const wordPoints = targetWord.points
    let initialPoints = 0
    
    // Use fixed percentages for different auto-reveal counts
    if (autoRevealCount === 0) {
      initialPoints = wordPoints // 100% of points for 0 auto-revealed
    } else if (autoRevealCount === 1) {
      initialPoints = Math.round(wordPoints * 0.85) // 85% for 1 auto-revealed
    } else if (autoRevealCount === 2) {
      initialPoints = Math.round(wordPoints * 0.70) // 70% for 2 auto-revealed
    } else {
      initialPoints = Math.round(wordPoints * 0.55) // 55% for 3+ auto-revealed
    }
    
    // Step 2: Calculate fixed points reduction per additional hint
    // Each additional hint reduces by 10 points or 10% of initial points, whichever is greater
    const pointsPerHint = Math.max(10, Math.round(initialPoints * 0.1))
    
    // Count additional hints beyond auto-revealed
    const additionalHints = Math.max(0, targetWord.revealedCharIndices.length - autoRevealCount)
    
    // Calculate total reduction from additional hints
    const hintReduction = pointsPerHint * additionalHints
    
    // Calculate actual points (with minimum guarantee of 25% of base points)
    const minimumPoints = Math.round(wordPoints * 0.25) // 25% minimum
    let newPoints = Math.max(minimumPoints, initialPoints - hintReduction)
    
    // No additional calculation needed - the percentage-based approach already handles this
    
    // Always set pointsEarned to ensure the animation has a value to work with
    updatedWordsToFind[wordIndex].pointsEarned = newPoints
    
    setWordsToFind(updatedWordsToFind)
  }
  return (
    <div className='flex flex-col gap-4 p-4'>
      {/* Game Header */}
      <GameHeader 
        score={score} 
        timeRemaining={timeRemaining} 
        wordCount={wordCount}
        maxWordLength={maxWordLength}
        timeLimit={timeLimit}
        autoRevealCount={autoRevealCount}
      />

      {/* Game Completion Message */}
      {isGameComplete && <GameCompletionMessage />}

      {/* Game Grid */}
      <GameGrid 
        gameGrid={gameGrid} 
        selectedCells={selectedCells} 
        wordsToFind={wordsToFind} 
        handleCellClick={handleCellClick} 
      />

      {/* Word Selection Controls - Hidden when game is complete */}
      {!isGameComplete && (
        <div className='flex justify-center gap-2 mt-2'>
          <Button
            variant='outline'
            onClick={() => setSelectedCells([])}
            disabled={selectedCells.length === 0}
            className='cursor-pointer'
          >
            Clear
          </Button>
          <Button
            onClick={checkSelectedWord}
            disabled={selectedCells.length < 3}
            className='cursor-pointer'
          >
            Submit
          </Button>
        </div>
      )}

      {/* Word List */}
      <WordList 
        wordsToFind={wordsToFind} 
        showMaskedWords={showMaskedWords} 
        showWordHint={showWordHint} 
        words={words}
        playAudio={playAudio}
        autoRevealCount={autoRevealCount}
      />
    </div>
  )
}

export default GamePlayPhase
