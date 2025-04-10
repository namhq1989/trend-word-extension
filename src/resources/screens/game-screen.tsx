import { useEffect, useState, useCallback, useRef } from 'react'
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'
import { RefreshCw, Eye, EyeOff, ChevronLeft } from 'lucide-react'
import { goBack } from 'react-chrome-extension-router'
import HeaderTitle from '@/resources/components/header-title.tsx'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import Spinner from '@/components/ui/spinner'
import { IWord } from '@/app/models/word.ts'
import { useAudioPlayer } from '@/resources/components/hooks/use-audio-player.ts'
import {
  WordSubmission,
  GameSettings,
  GameOutcome,
  GameStatus,
} from '@/app/models/game-types'
import GameSettingsPhase from '@/resources/components/game-settings-phase'
import GamePlayPhase, {
  GridCell,
  WordToFind,
} from '@/resources/components/game-play-phase'
import NotEnoughWordsMessage from '@/resources/components/not-enough-words-message'

// Constants
const AUTO_SAVE_INTERVAL_SECONDS = 5
const WORD_DIFFICULTY_SCORES = {
  beginner: 100,
  intermediate: 200,
  advanced: 300,
}

const WORD_COLORS = [
  '#2e7d32', // Dark green
  '#1976d2', // Blue
  '#9c27b0', // Purple
  '#00acc1', // Teal
  '#5e35b1', // Violet
  '#fdd835', // Yellow
  '#009688', // Teal-green
  '#3f51b5', // Indigo
  '#f9a826', // Safe orange
  '#8bc34a', // Light green
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
  const [wordSubmissions, setWordSubmissions] = useState<WordSubmission[]>([])
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(
    null,
  )
  const [gameOutcome, setGameOutcome] = useState<GameOutcome>(
    GameOutcome.IN_PROGRESS,
  )
  // Initialize gameStatus to IN_PROGRESS instead of COMPLETED to prevent auto-clearing saved games
  const [gameStatus, setGameStatus] = useState<GameStatus>(
    GameStatus.IN_PROGRESS,
  )
  const [showSettings, setShowSettings] = useState(false) // Don't show settings screen by default
  const [wordCount, setWordCount] = useState<number>(7) // Default: 7 words
  // Removed unused hasPausedGame variable
  const [savedGameState, setSavedGameState] = useState<any>(null) // Store the saved game state
  const [maxWordLength, setMaxWordLength] = useState<number>(8) // Default: 8 characters
  const [timeLimit, setTimeLimit] = useState<number>(5) // Default: 5 minutes
  const [autoRevealCount, setAutoRevealCount] = useState<number>(2) // Default: 2 characters
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null) // Time remaining in seconds
  const [timerActive, setTimerActive] = useState(false) // Track if timer is active

  const isResettingRef = useRef(false)
  const [isResetting, setIsResetting] = useState(false)

  // Audio player hook
  const { playAudio } = useAudioPlayer()

  // Fetch words from IndexedDB
  const fetchWords = useCallback(async () => {
    setLoading(true)
    setNotEnoughWords(false)

    try {
      // Get the total count of words first
      const countResponse = await chrome.runtime.sendMessage({
        action: 'getWords',
        start: 0,
        limit: 1,
      })

      if (!countResponse.success) {
        setLoading(false)
        return
      }

      // Calculate how many words we need to fetch to have enough suitable candidates
      const totalWords = countResponse.total
      const fetchLimit = Math.min(totalWords, 100) // Fetch up to 100 words max

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
        setLoading(false)
      }
    } catch (error) {
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initialize game - only fetch words if no paused game is found
  useEffect(() => {
    // We'll handle fetching words after checking for saved game state
    // Don't automatically fetch words here to avoid resetting the game
  }, [fetchWords])

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    // Check if game is complete (all words found)
    const gameComplete =
      wordsToFind.length >= wordCount && wordsToFind.every((w) => w.found)

    // Log game completion status
    // console.log('Game completion check:', {
    //   gameComplete,
    //   wordsToFindLength: wordsToFind.length,
    //   wordCount,
    //   allWordsFound: wordsToFind.every((w) => w.found),
    // })

    // Set game outcome when game is complete, but ONLY if it's not already set to LOSS
    if (
      gameComplete &&
      gameStatus !== GameStatus.COMPLETED &&
      gameOutcome !== GameOutcome.LOSS
    ) {
      // console.log('Setting game outcome to WIN')
      setGameOutcome(GameOutcome.WIN)
      setGameStatus(GameStatus.COMPLETED)
    }

    // Stop the timer if game is complete
    if (gameComplete && timerActive) {
      setTimerActive(false)
      return
    }

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

      // Set game outcome to LOSS if time runs out
      if (gameStatus !== GameStatus.COMPLETED) {
        console.log('Setting game outcome to LOSS (time out)')
        setGameOutcome(GameOutcome.LOSS)
        setGameStatus(GameStatus.COMPLETED)
      }
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [timerActive, timeRemaining, wordsToFind, wordCount, gameStatus])

  // Generate game grid when words are loaded and settings are confirmed
  useEffect(() => {
    if (words.length > 0 && !gameStarted && !showSettings) {
      initializeGame()
    }
  }, [words, gameStarted, showSettings])

  // Create a ref to store the autoSaveInterval ID so we can access it in resetGame
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-save game state at regular intervals when game is in progress
  useEffect(() => {
    let autoSaveInterval: NodeJS.Timeout | null = null

    if (isResetting || isResettingRef.current) {
      return
    }

    // Only set up auto-save if game is in progress
    if (gameStatus === GameStatus.IN_PROGRESS && gameStarted) {
      autoSaveInterval = setInterval(() => {
        if (isResetting || isResettingRef.current) {
          return
        }

        // Store the interval ID in the ref so we can access it in resetGame
        autoSaveIntervalRef.current = autoSaveInterval
        // Create game state object
        const gameState = {
          gameGrid,
          wordsToFind: wordsToFind.map((word) => ({
            word: word.word,
            found: word.found,
            points: word.points,
            pointsEarned: word.pointsEarned,
            color: word.color,
            hintRevealed: word.hintRevealed,
            revealedCharIndices: word.revealedCharIndices,
            definitions: word.definitions,
          })),
          score: wordSubmissions.reduce(
            (acc, submission) => acc + submission.points,
            0,
          ),
          gameStarted,
          wordSubmissions,
          wordCount,
          maxWordLength,
          timeLimit,
          remainingAttempts,
          autoRevealCount,
          timeRemaining,
          timerActive,
          gameStatus: 'paused', // Use string value for consistent comparison
          gameOutcome,
          lastSaved: new Date().toISOString(),
          isGameComplete:
            wordsToFind.length >= wordCount &&
            wordsToFind.every((w) => w.found),
        }

        // Save to Chrome Extension local storage
        chrome.storage.local.set({ gameState: gameState }, () => {
          if (chrome.runtime.lastError) {
            // Handle error silently
          }
        })
      }, AUTO_SAVE_INTERVAL_SECONDS * 1000)
    } else if (
      gameStatus === GameStatus.COMPLETED ||
      gameStatus === GameStatus.PAUSED
    ) {
      // If game is completed or paused, clear any existing auto-save interval
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval)
        autoSaveInterval = null
      }

      // If game is completed AND the game has actually started (not just on component mount),
      // remove the saved game state
      if (gameStatus === GameStatus.COMPLETED && gameStarted) {
        chrome.storage.local.remove('gameState', () => {
          if (chrome.runtime.lastError) {
            // Handle error silently
          }
        })
      }
    }

    // Cleanup function to clear interval when component unmounts or dependencies change
    return () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval)
      }

      // When unmounting, if game is in progress, mark it as paused in storage
      if (
        gameStatus === GameStatus.IN_PROGRESS &&
        gameStarted &&
        !isResetting &&
        !isResettingRef.current
      ) {
        // Create game state object for saving on unmount
        const unmountGameState = {
          gameStatus: 'paused', // Use string value for consistent comparison
          gameStarted,
          wordCount,
          maxWordLength,
          timeLimit,
          autoRevealCount,
          gameGrid,
          wordsToFind,
          score,
          wordSubmissions,
          remainingAttempts,
          timeRemaining,
          timerActive,
          isGameComplete,
          gameOutcome,
          lastSaved: new Date().toISOString(),
        }

        chrome.storage.local.set({ gameState: unmountGameState })
      }
    }
  }, [
    gameStatus,
    gameStarted,
    gameGrid,
    wordsToFind,
    wordSubmissions,
    wordCount,
    maxWordLength,
    timeLimit,
    remainingAttempts,
    autoRevealCount,
    timeRemaining,
    timerActive,
    gameOutcome,
    isResetting,
  ])

  // Validate that all words are correctly placed in the grid after rendering
  useEffect(() => {
    if (gameGrid.length > 0 && wordsToFind.length > 0 && gameStarted) {
      validateWordsInGrid()
    }
  }, [gameGrid, wordsToFind, gameStarted])

  // Initialize the game with words and grid
  const initializeGame = () => {
    // Set game status to in-progress
    setGameStatus(GameStatus.IN_PROGRESS)
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
          return true
        }
        cellPositions.add(posKey)
      }
      return false
    })

    if (hasDuplicateCells) {
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

    // If we don't have enough suitable words, return what we have
    if (shuffledTopWords.length < count) {
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
        // Failed to place word after all attempts
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

  const resetGame = () => {
    // Set both the state and ref to prevent any auto-saves
    isResettingRef.current = true
    setIsResetting(true)

    // Clear the autoSaveInterval if it exists
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current)
      autoSaveIntervalRef.current = null
    }

    // First remove gameState from storage
    chrome.storage.local.remove('gameState', () => {
      // Only after successful removal, update the state variables
      // Wrap in setTimeout to ensure they happen after the storage operation completes
      setTimeout(() => {
        // Reset all game-related state variables
        setGameStarted(false)
        setTimerActive(false)
        setGameStatus(GameStatus.IN_PROGRESS) // Change to IN_PROGRESS to ensure proper state
        setGameOutcome(GameOutcome.IN_PROGRESS) // Reset game outcome to hide completion message
        setSelectedCells([])
        setShowSettings(true) // Show settings phase
        setTimeRemaining(null)
        setWordSubmissions([]) // Clear word submissions
        setRemainingAttempts(null) // Reset attempts

        // Reset game grid and words to find (if needed)
        if (gameGrid.length > 0) {
          setGameGrid([])
        }
        if (wordsToFind.length > 0) {
          setWordsToFind([])
        }

        // Reset score
        setScore(0)

        // Clear resetting flag after a longer delay to ensure all operations complete
        setTimeout(() => {
          setIsResetting(false)
          isResettingRef.current = false
        }, 300)
      }, 100)
    })
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
    let allWordsValid = true

    // Check each word in wordsToFind
    wordsToFind.forEach((wordObj) => {
      const { word, letters } = wordObj

      // Verify that the word has the correct number of letters
      if (letters.length !== word.length) {
        allWordsValid = false
        return
      }

      // Reconstruct the word from the grid cells
      const reconstructedWord = letters.map((cell) => cell.letter).join('')

      // Check if the reconstructed word matches the expected word
      if (reconstructedWord !== word) {
        allWordsValid = false
        return
      }

      // Check if all cells are marked as part of a word
      const allCellsMarked = letters.every((cell) => cell.partOfWord)
      if (!allCellsMarked) {
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
        allWordsValid = false
        return
      }

      // Check if the cells form a continuous pattern (adjacent cells)
      for (let i = 1; i < letters.length; i++) {
        const prevCell = letters[i - 1]
        const currCell = letters[i]
        const rowDiff = Math.abs(currCell.row - prevCell.row)
        const colDiff = Math.abs(currCell.col - prevCell.col)

        // For standard directions, cells should be adjacent (diff of 0 or 1 in each direction)
        if (rowDiff > 1 || colDiff > 1) {
          // For complex patterns, we'll be more lenient
          break
        }
      }
    })

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

  // Track the last logged submission
  const lastLoggedSubmission = useRef<string | null>(null)

  // Ref to track if we've already handled the attempts=0 state
  const attemptsHandledRef = useRef(false)

  // Handle word submission
  const handleWordSubmission = (submission: WordSubmission) => {
    setWordSubmissions((prev) => [...prev, submission])

    // Update remaining attempts if provided
    if (submission.attempts !== undefined) {
      setRemainingAttempts(submission.attempts)
    }
  }

  // Check for saved game state on component mount
  useEffect(() => {
    const checkSavedGameState = async () => {
      try {
        // Use direct chrome.storage.local.get to ensure we're getting the latest data
        const result = await new Promise<{ gameState?: any }>((resolve) => {
          chrome.storage.local.get(['gameState'], (items) => {
            resolve(items)
          })
        })

        // Check if we have a valid paused game state
        // Note: We need to check for both enum value and string value since the storage might have either
        const isPaused =
          result.gameState &&
          (result.gameState.gameStatus === GameStatus.PAUSED ||
            result.gameState.gameStatus === 'paused')

        // If we have a paused game state with the required properties
        if (
          result.gameState &&
          (isPaused ||
            result.gameState.gameStatus === GameStatus.IN_PROGRESS) &&
          result.gameState.wordsToFind &&
          result.gameState.wordsToFind.length > 0
        ) {
          // Force the status to be 'paused' for consistency
          result.gameState.gameStatus = GameStatus.PAUSED
          // We found a paused game - store it and continue it immediately
          setSavedGameState(result.gameState)
          continuePausedGame(result.gameState)
        } else {
          // No paused game found, show settings screen
          setShowSettings(true)
          // Since there's no paused game, we can safely fetch words
          fetchWords()
        }
      } catch (error) {
        // On error, default to showing settings
        setShowSettings(true)
        // Fetch words on error as well
        fetchWords()
      }
    }

    checkSavedGameState()
  }, [fetchWords])

  // Function to continue a paused game
  const continuePausedGame = (gameStateData: any = null) => {
    // Use provided gameStateData or fallback to savedGameState
    const stateToUse = gameStateData || savedGameState

    if (!stateToUse) {
      return
    }

    // If we're using the savedGameState, make sure to store the provided gameStateData
    if (gameStateData && !savedGameState) {
      setSavedGameState(gameStateData)
    }

    // Load game settings
    setWordCount(stateToUse.wordCount || 7)
    setMaxWordLength(stateToUse.maxWordLength || 8)
    setTimeLimit(stateToUse.timeLimit || 5)
    setAutoRevealCount(stateToUse.autoRevealCount || 2)

    // Load game state
    setGameGrid(stateToUse.gameGrid || [])
    setWordsToFind(stateToUse.wordsToFind || [])
    setScore(stateToUse.score || 0)
    setWordSubmissions(stateToUse.wordSubmissions || [])
    setRemainingAttempts(stateToUse.remainingAttempts || null)
    setTimeRemaining(stateToUse.timeRemaining || null)

    // Set game as started and hide settings
    setGameStarted(true)
    setShowSettings(false)

    // Update game status
    setGameStatus(GameStatus.IN_PROGRESS)
    setTimerActive(true)
  }

  // Function to start a new game
  const startNewGame = async () => {
    // Clear the saved game state
    try {
      await chrome.storage.local.remove('gameState')
    } catch (error) {
      // Handle error silently
    }

    // Reset state
    setSavedGameState(null)

    // Show settings screen
    setShowSettings(true)
  }
  useEffect(() => {
    // Only proceed if the game has started and attempts have been initialized
    if (!gameStarted || remainingAttempts === null) return

    // Add a check for allWordsFound here as well
    const allWordsFound =
      wordsToFind.length >= wordCount && wordsToFind.every((w) => w.found)

    // Skip this logic if all words are found
    if (allWordsFound) {
      // If all words are found, always reset the handled flag
      attemptsHandledRef.current = false
      return
    }

    if (remainingAttempts === 0 && !attemptsHandledRef.current) {
      // Mark as handled to prevent infinite loops
      attemptsHandledRef.current = true

      // Stop the timer
      setTimerActive(false)

      // Set game as lost - do this first to ensure state is updated
      setGameOutcome(GameOutcome.LOSS)
      setGameStatus(GameStatus.COMPLETED)

      // Reveal all words - create a new array to avoid dependency issues
      const updatedWordsToFind = [...wordsToFind].map((word) => ({
        ...word,
        found: true,
      }))

      // Update the words to find
      setWordsToFind(updatedWordsToFind)
    } else if (remainingAttempts > 0) {
      // Reset the handled flag when attempts are greater than 0
      attemptsHandledRef.current = false
    }
  }, [remainingAttempts, gameStarted, wordsToFind, wordCount])

  // Update last logged submission when a new word is submitted
  useEffect(() => {
    if (wordSubmissions.length > 0) {
      const currentSubmission = wordSubmissions[wordSubmissions.length - 1]
      if (currentSubmission.word !== lastLoggedSubmission.current) {
        lastLoggedSubmission.current = currentSubmission.word
      }
    }
  }, [wordSubmissions])

  // Handle starting the game with settings
  const handleStartGame = async (settings: GameSettings) => {
    // If forceNewGame is true, we don't need to check for paused games
    if (settings.forceNewGame) {
      // Start a new game directly
      setWordCount(settings.wordCount)
      setMaxWordLength(settings.maxWordLength)
      setTimeLimit(settings.timeLimit)
      setAutoRevealCount(settings.autoRevealCount)

      // First hide settings screen, then fetch words
      setShowSettings(false)
      setGameStarted(false)
      fetchWords() // This will trigger initializeGame in the useEffect
      return
    }

    // If we get here and forceNewGame is false, it means we're starting a game normally
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

  // Check if game is complete (all words found or out of attempts)
  const isGameComplete =
    (wordsToFind.length >= wordCount && wordsToFind.every((w) => w.found)) ||
    (remainingAttempts === 0 && gameStarted)

  // Update game status when game is complete
  useEffect(() => {
    if (isGameComplete && gameStatus === GameStatus.IN_PROGRESS) {
      setGameStatus(GameStatus.COMPLETED)
    }
  }, [isGameComplete, gameStatus])

  useEffect(() => {
    if (gameStarted) {
      const allWordsFound =
        wordsToFind.length >= wordCount && wordsToFind.every((w) => w.found)

      // Check if the game is already in LOSS state
      if (gameOutcome === GameOutcome.LOSS) {
        // If already LOSS, don't change it even if all words are found
        // Just ensure the game status is COMPLETED
        if (gameStatus !== GameStatus.COMPLETED) {
          setGameStatus(GameStatus.COMPLETED)
        }
      }
      // If not already LOSS, proceed with normal logic
      else {
        // First check if all words are found
        if (allWordsFound) {
          // console.log('Setting game outcome to WIN from second effect')
          setGameOutcome(GameOutcome.WIN)
          setGameStatus(GameStatus.COMPLETED)
        }
        // Only set LOSS if attempts are 0
        else if (remainingAttempts === 0) {
          // console.log('Setting game outcome to LOSS from second effect')
          setGameOutcome(GameOutcome.LOSS)
          setGameStatus(GameStatus.COMPLETED)
        } else {
          setGameOutcome(GameOutcome.IN_PROGRESS)
        }
      }
    }
  }, [
    wordsToFind,
    wordCount,
    gameStarted,
    remainingAttempts,
    gameOutcome,
    gameStatus,
  ])

  // State for confetti
  const { width, height } = useWindowSize()
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiRecycle, setConfettiRecycle] = useState(false)

  // Show confetti when game is won
  useEffect(() => {
    // Only show confetti if the game is complete AND won
    if (gameOutcome === GameOutcome.WIN) {
      setShowConfetti(true)
      setConfettiRecycle(true)

      // Calculate total points from wordSubmissions
      const totalPoints = wordSubmissions.reduce(
        (total, submission) => total + submission.points,
        0,
      )

      // Save the points incrementally to Chrome local storage
      chrome.storage.local.get(['totalGamePoints'], (result) => {
        const currentPoints = result.totalGamePoints || 0
        const newTotalPoints = currentPoints + totalPoints

        chrome.storage.local.set({ totalGamePoints: newTotalPoints }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error saving points:', chrome.runtime.lastError)
          }
        })
      })

      // Stop generating new confetti after 2 seconds
      // but keep existing pieces falling until they reach the bottom
      const timer = setTimeout(() => {
        setConfettiRecycle(false)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [gameOutcome])

  return (
    <div className='flex flex-col w-[400px] min-h-[600px] scrollbar-hide'>
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={200}
          recycle={confettiRecycle}
          gravity={0.15}
          tweenDuration={2000}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 1000 }}
          onConfettiComplete={() => {
            // When all confetti pieces have fallen off the screen, hide the component
            if (!confettiRecycle) {
              setShowConfetti(false)
            }
          }}
        />
      )}
      <div className='flex w-full flex-row justify-between p-4 border-b-[1px]'>
        <BackButton isGamePlaying={gameStarted} />
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
                  <ResetButton resetFunc={() => resetGame()} />
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

      <div className='flex-1 flex flex-col'>
        {loading ? (
          <div className='flex-1 flex justify-center items-center'>
            <Spinner />
          </div>
        ) : notEnoughWords ? (
          <NotEnoughWordsMessage
            wordCount={wordCount}
            maxWordLength={maxWordLength}
            resetGame={resetGame}
          />
        ) : showSettings ? (
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
            gameOutcome={gameOutcome}
            showMaskedWords={showMaskedWords}
            playAudio={playAudio}
            wordCount={wordCount}
            maxWordLength={maxWordLength}
            timeLimit={timeLimit}
            autoRevealCount={autoRevealCount}
            onWordSubmission={handleWordSubmission}
          />
        )}
      </div>
    </div>
  )
}

interface BackButtonProps {
  isGamePlaying: boolean
}

const BackButton = ({ isGamePlaying }: BackButtonProps) => {
  // If game is not playing, just go back directly
  if (!isGamePlaying) {
    return <ChevronLeft className='cursor-pointer' onClick={() => goBack()} />
  }

  // If game is playing, show confirmation dialog
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <ChevronLeft className='cursor-pointer' />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Exit Game?</AlertDialogTitle>
          <AlertDialogDescription>
            Your progress will be saved automatically. You may resume from this
            point at a later time. Would you like to exit now?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className='cursor-pointer'>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className='cursor-pointer'
            onClick={() => goBack()}
          >
            Exit Game
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface ResetButtonProps {
  resetFunc: () => void
}

const ResetButton = ({ resetFunc }: ResetButtonProps) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <RefreshCw
          size={18}
          className='text-muted-foreground cursor-pointer hover:text-foreground'
        />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Game?</AlertDialogTitle>
          <AlertDialogDescription>
            Resetting will erase all your saved progress. Are you sure you want
            to start over?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className='cursor-pointer'>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className='cursor-pointer'
            onClick={() => resetFunc()}
          >
            Reset Game
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default GameScreen
