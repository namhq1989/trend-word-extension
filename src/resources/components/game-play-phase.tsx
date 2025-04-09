import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { IWord } from '@/app/models/word.ts'
import GameGrid from '@/resources/components/game-grid.tsx'
import WordList from '@/resources/components/word-list.tsx'
import GameHeader from '@/resources/components/game-header.tsx'
import GameCompletionMessage from '@/resources/components/game-completion-message.tsx'
import { WordSubmission, GameOutcome } from '@/app/models/game-types'

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
  gameOutcome: GameOutcome
  showMaskedWords: boolean
  toggleShowMaskedWords: () => void
  playAudio: (id: string) => void
  // Game settings
  wordCount: number
  maxWordLength: number
  timeLimit: number
  autoRevealCount: number
  onWordSubmission: (submission: WordSubmission) => void
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
  gameOutcome,
  showMaskedWords,
  toggleShowMaskedWords,
  playAudio,
  // Game settings
  wordCount,
  maxWordLength,
  timeLimit,
  autoRevealCount,
  onWordSubmission,
}: GamePlayPhaseProps) => {
  // State for score animation
  const [animatingScore, setAnimatingScore] = useState<number | null>(null)
  const [targetScore, setTargetScore] = useState<number>(score)

  // State for attempts
  const [attempts, setAttempts] = useState<number>(() => {
    // Set initial attempts based on word count
    if (wordCount <= 5) return 2
    if (wordCount <= 7) return 3
    return 4 // For 10 words or more
  })

  // State for incorrect submission animation
  const [isIncorrectSubmission, setIsIncorrectSubmission] = useState(false)

  // State to track if the current selection is incorrect (for red color)
  const [isIncorrectSelection, setIsIncorrectSelection] = useState(false)

  // State to track word selection start time
  const [startTime, setStartTime] = useState<number | null>(null)

  // Check if two cells are adjacent (horizontally, vertically, or diagonally)
  const areCellsAdjacent = (cell1: GridCell, cell2: GridCell): boolean => {
    const rowDiff = Math.abs(cell1.row - cell2.row)
    const colDiff = Math.abs(cell1.col - cell2.col)

    // Cells are adjacent if they are at most 1 cell away in any direction
    return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0)
  }

  // Handle cell click/selection
  const handleCellClick = (cell: GridCell) => {
    // Don't allow selection if game is complete
    if (isGameComplete) return

    // Check if cell is already selected
    const cellIndex = selectedCells.findIndex(
      (c) => c.row === cell.row && c.col === cell.col,
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
      // First cell selection - record start time
      if (selectedCells.length === 0) {
        setStartTime(Date.now())
      }

      // Check if the new cell is adjacent to the last selected cell
      if (selectedCells.length > 0) {
        const lastSelectedCell = selectedCells[selectedCells.length - 1]

        // If not adjacent, reset selection and start a new path
        if (!areCellsAdjacent(lastSelectedCell, cell)) {
          setSelectedCells([cell])
          setStartTime(Date.now()) // Reset start time for new selection
          return
        }
      }

      // Add cell to selection
      setSelectedCells((prev: GridCell[]) => [...prev, cell])
    }
  }

  // Check if selected cells form a valid word
  const checkSelectedWord = () => {
    if (selectedCells.length < 3) return

    const selectedWord = selectedCells.map((cell) => cell.letter).join('')

    // Check if the word matches any of the words to find
    const wordIndex = wordsToFind.findIndex(
      (w) => w.word === selectedWord && !w.found,
    )

    // Prepare submission data variables
    let isWordFound = false
    let wordToSubmit = selectedWord
    let pointsEarned = 0
    let attemptNumberValue = 0
    let currentAttempts = attempts

    if (wordIndex !== -1) {
      // Word found!
      isWordFound = true
      const updatedWordsToFind = [...wordsToFind]
      updatedWordsToFind[wordIndex].found = true

      // Update score
      const targetWord = updatedWordsToFind[wordIndex]
      wordToSubmit = targetWord.word

      // Get the current points for this word - either from pointsEarned or original points
      // This ensures we use the points that may have been modified by hints in word-list component
      pointsEarned = targetWord.pointsEarned || targetWord.points

      // Store the points earned for this word if not already set
      if (!updatedWordsToFind[wordIndex].pointsEarned) {
        updatedWordsToFind[wordIndex].pointsEarned = pointsEarned
      }

      attemptNumberValue = wordsToFind.length - updatedWordsToFind.length + 1

      // Reset start time for next word
      setStartTime(null)

      // Set up score animation
      setTargetScore(score + pointsEarned)
      setAnimatingScore(score)

      // Update the word's letters to use the selected cells instead of the predefined ones
      // This ensures the correct cells are highlighted when a word is found
      updatedWordsToFind[wordIndex].letters = [...selectedCells]

      // Update the game grid to mark these cells as revealed
      const updatedGameGrid = [...gameGrid]
      selectedCells.forEach((cell) => {
        // Set the revealed property to true for each cell in the selected word
        updatedGameGrid[cell.row][cell.col].revealed = true
      })
      setGameGrid(updatedGameGrid)

      setWordsToFind(updatedWordsToFind)

      // Play the word's pronunciation using the existing audio player
      const originalWord = words.find(
        (w) => w.word.toLowerCase() === targetWord.word.toLowerCase(),
      )
      if (originalWord && originalWord.id) {
        playAudio(originalWord.id)
      }

      // Clear selection
      setSelectedCells([])
    } else {
      // Word not found - reduce attempts and trigger animation
      currentAttempts = Math.max(0, attempts - 1)
      setAttempts(currentAttempts)

      // Trigger the incorrect submission animation and mark cells as incorrect
      setIsIncorrectSubmission(true)
      setIsIncorrectSelection(true)

      // Reset the animation state after the animation completes
      setTimeout(() => {
        setIsIncorrectSubmission(false)
        setIsIncorrectSelection(false)
        // Clear selection after animation completes
        setSelectedCells([])
      }, 600) // Animation duration + small buffer
    }

    // Notify GameScreen about the word submission (for both correct and incorrect cases)
    onWordSubmission({
      word: wordToSubmit,
      found: isWordFound,
      points: pointsEarned,
      timestamp: Date.now(),
      attemptNumber: attemptNumberValue,
      duration: startTime ? Date.now() - startTime : 0,
      attempts: currentAttempts, // Pass the current attempts value
    })
  }

  // Update points for a specific word
  const updateWordPoints = (wordIndex: number, points: number) => {
    if (wordIndex < 0 || wordIndex >= wordsToFind.length) return
    if (wordsToFind[wordIndex].found) return

    const updatedWordsToFind = [...wordsToFind]
    updatedWordsToFind[wordIndex].pointsEarned = points
    setWordsToFind(updatedWordsToFind)
  }

  // Show a hint for a specific word by revealing one random character
  const showWordHint = (wordIndex: number) => {
    if (wordIndex < 0 || wordIndex >= wordsToFind.length) return
    if (wordsToFind[wordIndex].found) return

    const targetWord = wordsToFind[wordIndex]
    const wordLength = targetWord.word.length

    // Get available indices (not yet revealed)
    const availableIndices = Array.from(
      { length: wordLength },
      (_, i) => i,
    ).filter((i) => !targetWord.revealedCharIndices.includes(i))

    // If all characters are already revealed, do nothing
    if (
      availableIndices.length === 0 ||
      targetWord.revealedCharIndices.length >= wordLength
    )
      return

    // Select a random index to reveal
    const randomIndex =
      availableIndices[Math.floor(Math.random() * availableIndices.length)]

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
      initialPoints = Math.round(wordPoints * 0.7) // 70% for 2 auto-revealed
    } else {
      initialPoints = Math.round(wordPoints * 0.55) // 55% for 3+ auto-revealed
    }

    // Step 2: Calculate fixed points reduction per additional hint
    // Each additional hint reduces by 10 points or 10% of initial points, whichever is greater
    const pointsPerHint = Math.max(10, Math.round(initialPoints * 0.1))

    // Count additional hints beyond auto-revealed
    const additionalHints = Math.max(
      0,
      targetWord.revealedCharIndices.length - autoRevealCount,
    )

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
  // Effect to handle score animation - flat 0.5 seconds duration
  useEffect(() => {
    if (animatingScore === null || animatingScore === targetScore) return

    // Calculate total animation frames for 0.5 seconds (500ms)
    // Using requestAnimationFrame which typically runs at 60fps
    // So we need ~30 frames for 0.5 seconds
    const totalFrames = 30
    const scoreDifference = targetScore - animatingScore

    // Calculate step size based on score difference and total frames
    // Use at least 1 as step size to ensure movement
    const step = Math.max(
      1,
      Math.abs(Math.round(scoreDifference / totalFrames)),
    )

    // Determine direction
    const direction = animatingScore < targetScore ? 1 : -1

    const timer = setTimeout(() => {
      // Calculate new score with appropriate step and direction
      const newAnimatingScore = animatingScore + step * direction

      // Check if we've reached or passed the target
      if (
        (direction > 0 && newAnimatingScore >= targetScore) ||
        (direction < 0 && newAnimatingScore <= targetScore)
      ) {
        setAnimatingScore(null)
        setScore(targetScore)
      } else {
        setAnimatingScore(newAnimatingScore)
      }
    }, 500 / totalFrames) // Distribute frames evenly across 500ms

    return () => clearTimeout(timer)
  }, [animatingScore, targetScore, setScore])

  // Check if game is over due to running out of attempts
  const isOutOfAttempts = attempts <= 0

  // Combined game over condition
  const gameOver = isGameComplete || isOutOfAttempts

  return (
    <div className='flex flex-col gap-4 p-4'>
      {/* Game Header */}
      <GameHeader
        score={animatingScore !== null ? animatingScore : score}
        timeRemaining={timeRemaining}
        wordCount={wordCount}
        maxWordLength={maxWordLength}
        timeLimit={timeLimit}
        autoRevealCount={autoRevealCount}
        attempts={attempts}
      />

      {/* Game Completion Message - Win or Loss */}
      {isGameComplete && <GameCompletionMessage gameOutcome={gameOutcome} />}

      {/* Game grid with shake animation when incorrect */}
      <div
        className={isIncorrectSubmission ? 'incorrect-submission' : ''}
        style={{
          animation: isIncorrectSubmission ? 'shake 0.8s ease' : 'none',
        }}
      >
        <style>
          {`
            @keyframes shake {
              0% { transform: translateX(0); }
              10% { transform: translateX(-5px); }
              20% { transform: translateX(5px); }
              30% { transform: translateX(-5px); }
              40% { transform: translateX(5px); }
              50% { transform: translateX(-5px); }
              60% { transform: translateX(5px); }
              70% { transform: translateX(-5px); }
              80% { transform: translateX(5px); }
              90% { transform: translateX(-5px); }
              100% { transform: translateX(0); }
            }
          `}
        </style>
        <GameGrid
          gameGrid={gameGrid}
          selectedCells={selectedCells}
          wordsToFind={wordsToFind}
          handleCellClick={gameOver ? () => {} : handleCellClick}
          showMaskedWords={showMaskedWords}
          isIncorrectSelection={isIncorrectSelection}
        />
      </div>

      {/* Word Selection Controls - Hidden when game is over */}
      {!gameOver && (
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
        updateWordPoints={updateWordPoints}
      />
    </div>
  )
}

export default GamePlayPhase
