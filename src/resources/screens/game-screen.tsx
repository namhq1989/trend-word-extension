import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Eye, EyeOff } from 'lucide-react'
import HeaderTitle from '@/resources/components/header-title.tsx'
import BackButton from '@/resources/components/back-button.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import Spinner from '@/components/ui/spinner'
import { IWord } from '@/app/models/word.ts'
import { useAudioPlayer } from '@/resources/components/hooks/use-audio-player.ts'
import GameSettingsPhase, {
  GameSettings,
} from '@/resources/components/game-settings-phase.tsx'
import GamePlayPhase, {
  GridCell,
  WordToFind,
} from '@/resources/components/game-play-phase'
import NotEnoughWordsMessage from '@/resources/components/not-enough-words-message'

// Word difficulty scoring
const WORD_DIFFICULTY_SCORES = {
  beginner: 100,
  intermediate: 200,
  advanced: 300,
}

// Predefined colors for words (10 distinct colors)
const WORD_COLORS = [
  '#dc2626', // Bright red
  '#16a34a', // Bright green
  '#0891b2', // Cyan
  '#2563eb', // Royal blue
  '#9333ea', // Purple
  '#ca8a04', // Yellow
  '#e11d48', // Rose
  '#f97316', // Orange
  '#0d9488', // Teal
  '#6d28d9', // Violet
]

const GameScreen = () => {
  // Game state
  const [words, setWords] = useState<IWord[]>([])
  const [loading, setLoading] = useState(false)
  const [gameGrid, setGameGrid] = useState<GridCell[][]>([])
  const [wordsToFind, setWordsToFind] = useState<WordToFind[]>([])
  const [score, setScore] = useState(0)
  const [selectedCells, setSelectedCells] = useState<GridCell[]>([])
  const [gameStarted, setGameStarted] = useState(false)
  const [showMaskedWords, setShowMaskedWords] = useState(false) // For testing - toggle to show/hide masked words
  const [notEnoughWords, setNotEnoughWords] = useState(false) // Track if there are enough words

  // Game settings state
  const [showSettings, setShowSettings] = useState(true) // Show settings screen by default
  const [wordCount, setWordCount] = useState<number>(7) // Default: 7 words
  const [maxWordLength, setMaxWordLength] = useState<number>(8) // Default: 8 characters
  const [timeLimit, setTimeLimit] = useState<number>(5) // Default: 5 minutes
  const [autoRevealCount, setAutoRevealCount] = useState<number>(2) // Default: 2 characters
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null) // Time remaining in seconds
  const [timerActive, setTimerActive] = useState(false) // Track if timer is active

  // Audio player hook
  const { playAudio } = useAudioPlayer()

  // Fetch words from IndexedDB
  const fetchWords = useCallback(async () => {
    setLoading(true)
    try {
      // Get the total count of words first
      const countResponse = await chrome.runtime.sendMessage({
        action: 'getWords',
        start: 0,
        limit: 1,
      })

      if (!countResponse.success) {
        console.error('Failed to get word count:', countResponse)
        setLoading(false)
        return
      }

      // Calculate how many words we need to fetch to have enough suitable candidates
      const totalWords = countResponse.total
      const fetchLimit = Math.min(totalWords, 100) // Fetch up to 50 words max

      // Get random offset to fetch different words each time
      const randomStart =
        totalWords > fetchLimit
          ? Math.floor(Math.random() * (totalWords - fetchLimit))
          : 0

      // Fetch a batch of words with random offset
      const response = await chrome.runtime.sendMessage({
        action: 'getWords',
        start: randomStart,
        limit: fetchLimit,
      })

      if (response.success && response.words) {
        setWords(response.words)
      } else {
        console.error('Failed to fetch words:', response)
      }
    } catch (error) {
      console.error('Error fetching words:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initialize game
  useEffect(() => {
    fetchWords()
  }, [fetchWords])

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    if (timerActive && timeRemaining !== null && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            if (timer) clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (timeRemaining === 0) {
      // Time's up - reveal all words
      const updatedWordsToFind = wordsToFind.map((word) => ({
        ...word,
        found: true,
      }))
      setWordsToFind(updatedWordsToFind)
      setTimerActive(false)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [timerActive, timeRemaining, wordsToFind])

  // Generate game grid when words are loaded and settings are confirmed
  useEffect(() => {
    if (words.length > 0 && !gameStarted && !showSettings) {
      initializeGame()
    }
  }, [words, gameStarted, showSettings])

  // Validate that all words are correctly placed in the grid after rendering
  useEffect(() => {
    if (gameGrid.length > 0 && wordsToFind.length > 0 && gameStarted) {
      validateWordsInGrid()
    }
  }, [gameGrid, wordsToFind, gameStarted])

  // Initialize the game with words and grid
  const initializeGame = () => {
    // console.log('🎮 Initializing game with settings:', {
    //   wordCount,
    //   maxWordLength,
    //   timeLimit,
    //   autoRevealCount,
    // })
    // Select words for the game based on settings
    const gameWords = selectGameWords(words, wordCount)

    // Check if we have enough words to start the game
    if (gameWords.length < wordCount) {
      setNotEnoughWords(true)
      setGameStarted(false)
      return
    }

    // Reset the not enough words flag
    setNotEnoughWords(false)

    // Create the grid and place words
    const { grid, placedWords } = createGameGrid(gameWords)

    // Ensure we have exactly the requested number of words
    if (placedWords.length !== wordCount) {
      console.warn(
        `Expected ${wordCount} placed words, but got ${placedWords.length}. Retrying...`,
      )
      // If we don't have exactly the requested number of words, try again
      initializeGame()
      return
    }

    // Verify no duplicate cells in any word
    const hasDuplicateCells = placedWords.some((wordObj) => {
      const cellPositions = new Set<string>()
      for (const cell of wordObj.letters) {
        const posKey = `${cell.row},${cell.col}`
        if (cellPositions.has(posKey)) {
          // console.error(
          //   `Found duplicate cell at ${posKey} in word "${wordObj.word}"`,
          // )
          return true
        }
        cellPositions.add(posKey)
      }
      return false
    })

    if (hasDuplicateCells) {
      // console.error(
      //   'Duplicate cells detected in word placement. Retrying game initialization...',
      // )
      initializeGame()
      return
    }

    setGameGrid(grid)
    setWordsToFind(placedWords)
    setScore(0)
    setGameStarted(true)
    setShowSettings(false)

    // Start timer if time limit is set
    if (timeLimit > 0) {
      setTimeRemaining(timeLimit * 60) // Convert minutes to seconds
      setTimerActive(true)
    }
  }

  // Helper function to determine grid size based on maximum word length
  const getGridSize = (maxWordLen: number): number => {
    // Follow the specified mappings
    if (maxWordLen === -1) {
      return 11 // No word length limit → Grid size 11×11
    } else if (maxWordLen <= 7) {
      return 8 // Word length 7 → Grid size 8×8
    } else if (maxWordLen <= 8) {
      return 9 // Word length 8 → Grid size 9×9
    } else {
      // For other values, calculate a sensible size (at least maxWordLength + 1)
      return Math.max(maxWordLen + 1, 11) // Minimum of 11 for very large words
    }
  }

  // Select a subset of words for the game
  const selectGameWords = (allWords: IWord[], count: number): IWord[] => {
    // Get the grid size based on maximum word length
    const gridSize = getGridSize(maxWordLength)

    // Filter words that are suitable for the game based on settings
    const suitableWords = allWords.filter((word) => {
      const wordText = word.word.toLowerCase()
      // Words must be at least 3 characters and fit within the grid
      // Also ensure they only contain letters a-z
      // Handle 'No limit' option (maxWordLength = -1)
      // Allow a small buffer (2 cells) to ensure words can be placed with adequate spacing
      const maxAllowedLength = gridSize - 2
      const lengthCheck =
        maxWordLength === -1
          ? wordText.length >= 3 && wordText.length <= maxAllowedLength
          : wordText.length >= 3 &&
            wordText.length <= Math.min(maxWordLength, maxAllowedLength)
      return lengthCheck && /^[a-z]+$/.test(wordText)
    })

    // Sort words by length (descending) to prioritize longer words
    const sortedWords = [...suitableWords].sort((a, b) => {
      return b.word.length - a.word.length
    })

    // Take the top words by length, then shuffle them for variety
    // This ensures we get the longest possible words while maintaining some randomness
    const topWords = sortedWords.slice(
      0,
      Math.min(count * 3, sortedWords.length),
    )
    const shuffledTopWords = shuffleArray(topWords)

    // If we don't have enough suitable words, log a warning and return what we have
    if (shuffledTopWords.length < count) {
      console.warn(
        `Not enough suitable words: found ${shuffledTopWords.length}, needed ${count}`,
      )
      return shuffledTopWords
    }

    // If we have enough words, take exactly the requested count
    return shuffledTopWords.slice(0, count)
  }

  // Create the game grid and place words
  const createGameGrid = (gameWords: IWord[]) => {
    // Set grid size based on maximum word length using our helper function
    const gridSize = getGridSize(maxWordLength)
    const grid: GridCell[][] = Array(gridSize)
      .fill(null)
      .map((_, row) =>
        Array(gridSize)
          .fill(null)
          .map((_, col) => ({
            letter: '',
            row,
            col,
            selected: false,
            revealed: false,
            partOfWord: false,
          })),
      )

    // Ensure we're working with exactly the requested number of words
    const wordsToPlace = gameWords.slice(0, wordCount)
    const placedWords: WordToFind[] = []

    // Try to place each word on the grid
    wordsToPlace.forEach((wordObj) => {
      const wordText = wordObj.word.toLowerCase()

      // Skip words that are too long for the grid
      if (wordText.length > gridSize) {
        return
      }

      // Define various placement patterns
      // Standard directions
      const standardDirections = [
        { dr: 0, dc: 1 }, // horizontal (→)
        { dr: 1, dc: 0 }, // vertical (↓)
        { dr: 1, dc: 1 }, // diagonal down-right (↘)
        { dr: 1, dc: -1 }, // diagonal down-left (↙)
        { dr: -1, dc: 0 }, // up (↑)
        { dr: 0, dc: -1 }, // left (←)
        { dr: -1, dc: -1 }, // diagonal up-left (↖)
        { dr: -1, dc: 1 }, // diagonal up-right (↗)
      ]

      // Complex patterns - zigzag, spiral, etc.
      // These are functions that return the next position based on the current index
      const complexPatterns = [
        // Zigzag horizontal (alternates between going right and down-right)
        (i: number, startRow: number, startCol: number) => {
          const row = startRow + Math.floor(i / 2)
          const col = startCol + i
          return { row, col }
        },
        // Zigzag vertical (alternates between going down and down-left)
        (i: number, startRow: number, startCol: number) => {
          const row = startRow + i
          const col = startCol - (i % 2)
          return { row, col }
        },
        // Stair pattern (right, down, right, down...)
        (i: number, startRow: number, startCol: number) => {
          const row = startRow + Math.floor(i / 2)
          const col = startCol + Math.ceil(i / 2)
          return { row, col }
        },
        // Snake pattern (down, right, up, right...)
        (i: number, startRow: number, startCol: number) => {
          const direction = Math.floor(i / 2) % 2 === 0 ? 1 : -1
          const row =
            startRow +
            (i % 2 === 0 ? (i / 2) * direction : ((i - 1) / 2) * direction)
          const col = startCol + Math.floor(i / 2)
          return { row, col }
        },
      ]

      // Decide whether to use standard directions or complex patterns
      // Higher chance for standard directions to ensure most words can be placed
      const useComplexPattern = Math.random() < 0.3 // 30% chance for complex patterns

      let placed = false

      // Try standard directions first
      if (!useComplexPattern || wordText.length <= 3) {
        // For very short words, stick to standard directions
        // Shuffle directions for variety
        const shuffledDirections = shuffleArray([...standardDirections])

        // Try each direction until the word is placed
        for (const { dr, dc } of shuffledDirections) {
          if (placed) break

          // Try different starting positions
          for (let attempts = 0; attempts < 20; attempts++) {
            const startRow = Math.floor(Math.random() * gridSize)
            const startCol = Math.floor(Math.random() * gridSize)

            // Check if word can be placed at this position and direction
            if (
              canPlaceWord(grid, wordText, startRow, startCol, dr, dc, gridSize)
            ) {
              // Place the word
              const wordCells: GridCell[] = []

              for (let i = 0; i < wordText.length; i++) {
                const row = startRow + i * dr
                const col = startCol + i * dc
                grid[row][col].letter = wordText[i]
                grid[row][col].partOfWord = true
                wordCells.push(grid[row][col])
              }

              // Assign a color from our predefined colors
              const wordColor = getWordColor(placedWords.length)

              // Add to placed words list
              // Generate auto-reveal indices based on settings
              const autoRevealIndices: number[] = []
              // Only add auto-reveal indices if word length is > autoRevealCount
              if (wordText.length > autoRevealCount && autoRevealCount > 0) {
                while (
                  autoRevealIndices.length < autoRevealCount &&
                  autoRevealIndices.length < wordText.length
                ) {
                  const randomIndex = Math.floor(
                    Math.random() * wordText.length,
                  )
                  if (!autoRevealIndices.includes(randomIndex)) {
                    autoRevealIndices.push(randomIndex)
                  }
                }
              }

              placedWords.push({
                word: wordText,
                found: false,
                level: wordObj.level.toLowerCase(),
                points:
                  WORD_DIFFICULTY_SCORES[
                    wordObj.level.toLowerCase() as keyof typeof WORD_DIFFICULTY_SCORES
                  ] || 100,
                letters: wordCells,
                color: wordColor,
                hintRevealed: false,
                revealedCharIndices: autoRevealIndices,
                definitions: wordObj.definitions
                  ? [...wordObj.definitions].slice(0, 2)
                  : [],
              })

              placed = true
              break
            }
          }
        }
      }

      // Try complex patterns if standard directions didn't work or we specifically want complex
      if (!placed && (useComplexPattern || wordText.length > 3)) {
        const shuffledPatterns = shuffleArray([...complexPatterns])

        // Try each pattern
        for (const patternFunc of shuffledPatterns) {
          if (placed) break

          // Try different starting positions
          for (let attempts = 0; attempts < 30; attempts++) {
            const startRow = Math.floor(Math.random() * (gridSize - 2)) // Leave some room for the pattern
            const startCol = Math.floor(Math.random() * (gridSize - 2))

            // Check if word can be placed with this pattern
            let canPlace = true
            const positions = []
            const positionSet = new Set<string>() // Track unique positions

            for (let i = 0; i < wordText.length; i++) {
              const { row, col } = patternFunc(i, startRow, startCol)

              // Check if position is within grid bounds
              if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
                canPlace = false
                break
              }

              // Check for duplicate positions
              const posKey = `${row},${col}`
              if (positionSet.has(posKey)) {
                canPlace = false
                break
              }
              positionSet.add(posKey)

              // Check if cell is empty or has matching letter
              if (
                grid[row][col].letter !== '' &&
                grid[row][col].letter !== wordText[i]
              ) {
                canPlace = false
                break
              }

              positions.push({ row, col })
            }

            if (canPlace) {
              // Place the word using the pattern
              const wordCells: GridCell[] = []

              for (let i = 0; i < wordText.length; i++) {
                const { row, col } = positions[i]
                grid[row][col].letter = wordText[i]
                grid[row][col].partOfWord = true
                wordCells.push(grid[row][col])
              }

              // Assign a color from our predefined colors
              const wordColor = getWordColor(placedWords.length)

              // Add to placed words list
              // Generate auto-reveal indices based on settings
              const autoRevealIndices: number[] = []
              // Only add auto-reveal indices if word length is > autoRevealCount
              if (wordText.length > autoRevealCount && autoRevealCount > 0) {
                while (
                  autoRevealIndices.length < autoRevealCount &&
                  autoRevealIndices.length < wordText.length
                ) {
                  const randomIndex = Math.floor(
                    Math.random() * wordText.length,
                  )
                  if (!autoRevealIndices.includes(randomIndex)) {
                    autoRevealIndices.push(randomIndex)
                  }
                }
              }

              placedWords.push({
                word: wordText,
                found: false,
                level: wordObj.level.toLowerCase(),
                points:
                  WORD_DIFFICULTY_SCORES[
                    wordObj.level.toLowerCase() as keyof typeof WORD_DIFFICULTY_SCORES
                  ] || 5,
                letters: wordCells,
                color: wordColor,
                hintRevealed: false,
                revealedCharIndices: autoRevealIndices,
                definitions: wordObj.definitions
                  ? [...wordObj.definitions].slice(0, 2)
                  : [],
              })

              placed = true
              break
            }
          }
        }
      }

      if (!placed) {
        console.log(`Failed to place word: ${wordText} after all attempts`)
      }
    })

    // Fill remaining empty cells with random letters
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (grid[row][col].letter === '') {
          grid[row][col].letter = getRandomLetter()
        }
      }
    }

    return { grid, placedWords }
  }

  // Check if a word can be placed at the given position and direction
  const canPlaceWord = (
    grid: GridCell[][],
    word: string,
    startRow: number,
    startCol: number,
    dr: number,
    dc: number,
    gridSize: number,
  ) => {
    // Check if word fits within grid bounds
    if (
      startRow + (word.length - 1) * dr >= gridSize ||
      startRow + (word.length - 1) * dr < 0 ||
      startCol + (word.length - 1) * dc >= gridSize ||
      startCol + (word.length - 1) * dc < 0
    ) {
      return false
    }

    // Check if cells are empty or have matching letters
    // Also check for duplicate positions (important for complex patterns)
    const positions = new Set<string>()

    for (let i = 0; i < word.length; i++) {
      const row = startRow + i * dr
      const col = startCol + i * dc

      // Check for duplicate positions (important for standard directions)
      const posKey = `${row},${col}`
      if (positions.has(posKey)) {
        // Duplicate position detected
        return false
      }
      positions.add(posKey)

      if (grid[row][col].letter !== '' && grid[row][col].letter !== word[i]) {
        return false
      }
    }

    // Additional check: ensure the word doesn't have too many overlaps
    // This makes the game more challenging as words won't share too many letters
    let overlapCount = 0
    for (let i = 0; i < word.length; i++) {
      const row = startRow + i * dr
      const col = startCol + i * dc

      if (grid[row][col].letter !== '') {
        overlapCount++
      }
    }

    // Limit overlaps to at most 2 letters or 30% of the word length (whichever is smaller)
    const maxOverlaps = Math.min(2, Math.floor(word.length * 0.3))
    if (overlapCount > maxOverlaps) {
      return false
    }

    return true
  }

  // Game state management functions have been moved to GamePlayPhase component

  // Reset the game
  const resetGame = () => {
    setGameStarted(false)
    setSelectedCells([])
    setShowSettings(true)
    setTimerActive(false)
    setTimeRemaining(null)
    fetchWords()
  }

  // Toggle showing masked words (for testing)
  const toggleShowMaskedWords = () => {
    setShowMaskedWords((prev) => !prev)
  }

  // Helper function to get a random letter
  const getRandomLetter = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz'
    return letters[Math.floor(Math.random() * letters.length)]
  }

  // Validate that all words are correctly placed in the grid
  const validateWordsInGrid = () => {
    // Log validation start time for performance tracking
    // console.time('Grid Validation')
    // console.log('🔍 VALIDATION: Starting grid validation...')
    // console.log(
    //   `🔍 VALIDATION: Grid size: ${gameGrid.length}x${gameGrid[0].length}`,
    // )
    // console.log(
    //   `🔍 VALIDATION: Words to find: ${wordsToFind.length}`,
    //   wordsToFind.map((w) => w.word),
    // )

    let allWordsValid = true

    // Check each word in wordsToFind
    wordsToFind.forEach((wordObj, index) => {
      const { word, letters } = wordObj
      console.log(
        `🔍 VALIDATION: Checking word "${word}" (${index + 1}/${wordsToFind.length})...`,
      )

      // Verify that the word has the correct number of letters
      if (letters.length !== word.length) {
        // console.error(
        //   `❌ VALIDATION ERROR: Word "${word}" has ${letters.length} letters in grid but should have ${word.length}`,
        // )
        allWordsValid = false
        return
      }

      // Reconstruct the word from the grid cells
      const reconstructedWord = letters.map((cell) => cell.letter).join('')

      // Check if the reconstructed word matches the expected word
      if (reconstructedWord !== word) {
        // console.error(
        //   `❌ VALIDATION ERROR: Word "${word}" does not match grid cells. Found: "${reconstructedWord}"`,
        // )
        // console.error(
        //   'Cell details:',
        //   letters.map((cell) => ({
        //     letter: cell.letter,
        //     row: cell.row,
        //     col: cell.col,
        //   })),
        // )
        allWordsValid = false
        return
      }

      // Check if all cells are marked as part of a word
      const allCellsMarked = letters.every((cell) => cell.partOfWord)
      if (!allCellsMarked) {
        // console.error(
        //   `❌ VALIDATION ERROR: Not all cells for word "${word}" are marked as partOfWord`,
        // )
        // console.error(
        //   'Cell details:',
        //   letters.map((cell) => ({
        //     letter: cell.letter,
        //     row: cell.row,
        //     col: cell.col,
        //     partOfWord: cell.partOfWord,
        //   })),
        // )
        allWordsValid = false
        return
      }

      // Verify cell positions are valid (within grid bounds)
      const invalidPositions = letters.filter(
        (cell) =>
          cell.row < 0 ||
          cell.row >= gameGrid.length ||
          cell.col < 0 ||
          cell.col >= gameGrid[0].length,
      )
      if (invalidPositions.length > 0) {
        // console.error(
        //   `❌ VALIDATION ERROR: Word "${word}" has cells outside grid bounds`,
        // )
        // console.error(
        //   'Invalid positions:',
        //   invalidPositions.map((cell) => ({ row: cell.row, col: cell.col })),
        // )
        allWordsValid = false
        return
      }

      // Verify that the cells in the grid match the letters array
      const allCellsMatchGrid = letters.every((cell) => {
        const gridCell = gameGrid[cell.row][cell.col]
        return (
          gridCell.letter === cell.letter &&
          gridCell.partOfWord === cell.partOfWord
        )
      })
      if (!allCellsMatchGrid) {
        // console.error(
        //   `❌ VALIDATION ERROR: Not all cells for word "${word}" match the grid`,
        // )
        // console.error(
        //   'Cell details:',
        //   letters.map((cell) => {
        //     const gridCell = gameGrid[cell.row][cell.col]
        //     return {
        //       expected: { letter: cell.letter, partOfWord: cell.partOfWord },
        //       actual: {
        //         letter: gridCell.letter,
        //         partOfWord: gridCell.partOfWord,
        //       },
        //       position: { row: cell.row, col: cell.col },
        //     }
        //   }),
        // )
        allWordsValid = false
        return
      }

      // Check if the cells form a continuous pattern (adjacent cells)
      let isContinuous = true
      for (let i = 1; i < letters.length; i++) {
        const prevCell = letters[i - 1]
        const currCell = letters[i]
        const rowDiff = Math.abs(currCell.row - prevCell.row)
        const colDiff = Math.abs(currCell.col - prevCell.col)

        // For standard directions, cells should be adjacent (diff of 0 or 1 in each direction)
        if (rowDiff > 1 || colDiff > 1) {
          // For complex patterns, we'll be more lenient, just log a warning
          // console.warn(
          //   `⚠️ VALIDATION WARNING: Word "${word}" may use a complex pattern. Non-adjacent cells detected.`,
          // )
          // console.warn('Cell transition:', {
          //   from: {
          //     row: prevCell.row,
          //     col: prevCell.col,
          //     letter: prevCell.letter,
          //   },
          //   to: {
          //     row: currCell.row,
          //     col: currCell.col,
          //     letter: currCell.letter,
          //   },
          //   diff: { row: rowDiff, col: colDiff },
          // })
          isContinuous = false
          break
        }
      }

      if (isContinuous) {
        // console.log(
        //   `✅ VALIDATION: Word "${word}" is valid and forms a continuous pattern`,
        // )
      } else {
        // console.log(
        //   `✅ VALIDATION: Word "${word}" is valid but may use a complex pattern`,
        // )
      }
    })

    if (allWordsValid) {
      // console.log(
      //   '✅ VALIDATION COMPLETE: All words are correctly placed in the grid',
      // )
    } else {
      // console.error(
      //   '❌ VALIDATION FAILED: Some words are not correctly placed in the grid',
      // )
    }

    // Log validation end time
    // console.timeEnd('Grid Validation')
    return allWordsValid
  }

  // Get a color from the predefined colors array based on index
  const getWordColor = (index: number) => {
    return WORD_COLORS[index % WORD_COLORS.length]
  }

  // Helper function to shuffle an array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array]
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
    }
    return newArray
  }

  // Handle starting the game with settings
  const handleStartGame = (settings: GameSettings) => {
    // Update game settings
    setWordCount(settings.wordCount)
    setMaxWordLength(settings.maxWordLength)
    setTimeLimit(settings.timeLimit)
    setAutoRevealCount(settings.autoRevealCount)

    // First hide settings screen, then fetch words
    setShowSettings(false)
    setGameStarted(false)
    fetchWords() // This will trigger initializeGame in the useEffect
  }

  // Check if game is complete
  const isGameComplete =
    wordsToFind.length >= wordCount && wordsToFind.every((w) => w.found)

  return (
    <div className='flex flex-col w-[400px] min-h-[600px] scrollbar-hide'>
      <div className='flex w-full flex-row justify-between p-4 border-b-[1px]'>
        <BackButton />
        <HeaderTitle title='Word Game' />
        <div className='flex flex-row gap-2 items-center'>
          {/* Test Mode Toggle - Only show in non-release environments */}
          {import.meta.env.VITE_ENV !== 'release' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {showMaskedWords ? (
                    <EyeOff
                      size={18}
                      className='text-primary cursor-pointer hover:text-primary/80'
                      onClick={toggleShowMaskedWords}
                    />
                  ) : (
                    <Eye
                      size={18}
                      className='text-muted-foreground cursor-pointer hover:text-foreground'
                      onClick={toggleShowMaskedWords}
                    />
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {showMaskedWords
                      ? 'Hide Word Locations'
                      : 'Show Word Locations (Test Mode)'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {/* Only show the reset icon when not in settings phase */}
          {!showSettings && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <RefreshCw
                    size={18}
                    className='text-muted-foreground cursor-pointer hover:text-foreground'
                    onClick={resetGame}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset Game</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {/* Information icon removed as requested */}
        </div>
      </div>

      {loading ? (
        <div className='flex mt-20 justify-center items-center'>
          <Spinner />
        </div>
      ) : showSettings ? (
        <div className='flex flex-col p-4 gap-8'>
          <div className='flex flex-col gap-2'>
            <GameSettingsPhase
              onStartGame={handleStartGame}
              wordCount={wordCount}
              setWordCount={setWordCount}
              maxWordLength={maxWordLength}
              setMaxWordLength={setMaxWordLength}
              timeLimit={timeLimit}
              setTimeLimit={setTimeLimit}
              autoRevealCount={autoRevealCount}
              setAutoRevealCount={setAutoRevealCount}
            />
          </div>
        </div>
      ) : notEnoughWords ? (
        <NotEnoughWordsMessage
          wordCount={wordCount}
          maxWordLength={maxWordLength}
          resetGame={resetGame}
        />
      ) : (
        <GamePlayPhase
          words={words}
          gameGrid={gameGrid}
          wordsToFind={wordsToFind}
          score={score}
          setScore={setScore}
          selectedCells={selectedCells}
          setSelectedCells={setSelectedCells}
          setGameGrid={setGameGrid}
          setWordsToFind={setWordsToFind}
          timeRemaining={timeRemaining}
          isGameComplete={isGameComplete}
          showMaskedWords={showMaskedWords}
          toggleShowMaskedWords={toggleShowMaskedWords}
          playAudio={playAudio}
          wordCount={wordCount}
          maxWordLength={maxWordLength}
          timeLimit={timeLimit}
          autoRevealCount={autoRevealCount}
        />
      )}
    </div>
  )
}

export default GameScreen
