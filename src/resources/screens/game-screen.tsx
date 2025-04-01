import { useEffect, useState, useCallback } from 'react'
import { HelpCircle, RefreshCw } from 'lucide-react'
import HeaderTitle from '@/resources/components/header-title.tsx'
import BackButton from '@/resources/components/back-button.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Switch } from '@/components/ui/switch.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import Spinner from '@/components/ui/spinner'
import { IWord } from '@/app/models/word.ts'

// Game difficulty levels
enum GameDifficulty {
  EASY = 'easy',
  HARD = 'hard'
}

// Word difficulty scoring
const WORD_DIFFICULTY_SCORES = {
  beginner: 5,
  intermediate: 10,
  advanced: 15
}

// Grid cell interface
interface GridCell {
  letter: string
  row: number
  col: number
  selected: boolean
  revealed: boolean
  partOfWord: boolean
}

// Word to find interface
interface WordToFind {
  word: string
  found: boolean
  level: string
  points: number
  letters: GridCell[]
}

const GameScreen = () => {
  // Game state
  const [words, setWords] = useState<IWord[]>([])
  const [loading, setLoading] = useState(true)
  const [gameGrid, setGameGrid] = useState<GridCell[][]>([])
  const [wordsToFind, setWordsToFind] = useState<WordToFind[]>([])
  const [difficulty, setDifficulty] = useState<GameDifficulty>(GameDifficulty.EASY)
  const [score, setScore] = useState(0)
  const [selectedCells, setSelectedCells] = useState<GridCell[]>([])
  const [streakCount, setStreakCount] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  
  // Fetch words from IndexedDB
  const fetchWords = useCallback(async () => {
    setLoading(true)
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getWords',
        start: 0,
        limit: 20 // Get a good number of words to choose from
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

  // Generate game grid when words are loaded
  useEffect(() => {
    if (words.length > 0 && !gameStarted) {
      initializeGame()
    }
  }, [words, gameStarted])

  // Initialize the game with words and grid
  const initializeGame = () => {
    // Select words for the game (between 5-10 words)
    const gameWords = selectGameWords(words, Math.floor(Math.random() * 6) + 5)
    
    // Create the grid and place words
    const { grid, placedWords } = createGameGrid(gameWords)
    
    setGameGrid(grid)
    setWordsToFind(placedWords)
    setScore(0)
    setStreakCount(0)
    setGameStarted(true)
  }

  // Select a subset of words for the game
  const selectGameWords = (allWords: IWord[], count: number): IWord[] => {
    // Filter words that are suitable for the game (not too long, not too short)
    const suitableWords = allWords.filter(word => {
      const wordText = word.word.toLowerCase()
      return wordText.length >= 3 && wordText.length <= 7 && /^[a-z]+$/.test(wordText)
    })
    
    // Shuffle and take the first 'count' words
    return shuffleArray(suitableWords).slice(0, count)
  }

  // Create the game grid and place words
  const createGameGrid = (gameWords: IWord[]) => {
    // Initialize an empty 7x7 grid
    const gridSize = 7
    const grid: GridCell[][] = Array(gridSize).fill(null).map((_, row) => 
      Array(gridSize).fill(null).map((_, col) => ({
        letter: '',
        row,
        col,
        selected: false,
        revealed: false,
        partOfWord: false
      }))
    )
    
    const placedWords: WordToFind[] = []
    
    // Try to place each word on the grid
    gameWords.forEach(wordObj => {
      const wordText = wordObj.word.toLowerCase()
      
      // Skip words that are too long for the grid
      if (wordText.length > gridSize) return
      
      // Try different directions and positions
      const directions = [
        { dr: 0, dc: 1 },  // horizontal
        { dr: 1, dc: 0 },  // vertical
        { dr: 1, dc: 1 },  // diagonal down-right
        { dr: 1, dc: -1 }, // diagonal down-left
      ]
      
      // Shuffle directions for variety
      const shuffledDirections = shuffleArray([...directions])
      
      let placed = false
      
      // Try each direction until the word is placed
      for (const { dr, dc } of shuffledDirections) {
        if (placed) break
        
        // Try different starting positions
        for (let attempts = 0; attempts < 20; attempts++) {
          const startRow = Math.floor(Math.random() * gridSize)
          const startCol = Math.floor(Math.random() * gridSize)
          
          // Check if word can be placed at this position and direction
          if (canPlaceWord(grid, wordText, startRow, startCol, dr, dc, gridSize)) {
            // Place the word
            const wordCells: GridCell[] = []
            
            for (let i = 0; i < wordText.length; i++) {
              const row = startRow + i * dr
              const col = startCol + i * dc
              grid[row][col].letter = wordText[i]
              grid[row][col].partOfWord = true
              wordCells.push(grid[row][col])
            }
            
            // Add to placed words list
            placedWords.push({
              word: wordText,
              found: false,
              level: wordObj.level.toLowerCase(),
              points: WORD_DIFFICULTY_SCORES[wordObj.level.toLowerCase() as keyof typeof WORD_DIFFICULTY_SCORES] || 5,
              letters: wordCells
            })
            
            placed = true
            break
          }
        }
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
    gridSize: number
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
    for (let i = 0; i < word.length; i++) {
      const row = startRow + i * dr
      const col = startCol + i * dc
      
      if (grid[row][col].letter !== '' && grid[row][col].letter !== word[i]) {
        return false
      }
    }
    
    return true
  }

  // Handle cell click/selection
  const handleCellClick = (cell: GridCell) => {
    if (difficulty === GameDifficulty.HARD) {
      // In hard mode, cells must be adjacent
      if (selectedCells.length > 0) {
        const lastCell = selectedCells[selectedCells.length - 1]
        const isAdjacent = 
          (Math.abs(cell.row - lastCell.row) <= 1) && 
          (Math.abs(cell.col - lastCell.col) <= 1)
        
        if (!isAdjacent) return
      }
    }
    
    // Check if cell is already selected
    const cellIndex = selectedCells.findIndex(
      c => c.row === cell.row && c.col === cell.col
    )
    
    if (cellIndex !== -1) {
      // If clicking the last selected cell, deselect it
      if (cellIndex === selectedCells.length - 1) {
        setSelectedCells(prev => prev.slice(0, -1))
      }
      // If clicking a cell in the middle, deselect all cells after it
      else if (cellIndex < selectedCells.length - 1) {
        setSelectedCells(prev => prev.slice(0, cellIndex + 1))
      }
    } else {
      // Add cell to selection
      setSelectedCells(prev => [...prev, cell])
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
      const wordPoints = updatedWordsToFind[wordIndex].points
      const streakBonus = streakCount > 0 ? Math.floor(streakCount / 2) : 0
      const pointsEarned = wordPoints + streakBonus
      
      setScore(prev => prev + pointsEarned)
      setStreakCount(prev => prev + 1)
      setWordsToFind(updatedWordsToFind)
      
      // Highlight the found word cells
      const foundWordCells = updatedWordsToFind[wordIndex].letters
      const updatedGrid = [...gameGrid]
      
      foundWordCells.forEach(cell => {
        updatedGrid[cell.row][cell.col].revealed = true
      })
      
      setGameGrid(updatedGrid)
    } else {
      // Word not found, reset streak
      setStreakCount(0)
    }
    
    // Clear selection
    setSelectedCells([])
  }

  // Reset the game
  const resetGame = () => {
    setGameStarted(false)
    setSelectedCells([])
    setShowHint(false)
    fetchWords()
  }

  // Show a hint (reveal one letter of a random unfound word)
  const showHintAction = () => {
    const unfoundWords = wordsToFind.filter(w => !w.found)
    if (unfoundWords.length === 0) return
    
    // Select a random unfound word
    const randomWord = unfoundWords[Math.floor(Math.random() * unfoundWords.length)]
    
    // Select a random letter from the word to reveal
    const randomLetterIndex = Math.floor(Math.random() * randomWord.letters.length)
    const letterToReveal = randomWord.letters[randomLetterIndex]
    
    // Update the grid to reveal this letter
    const updatedGrid = [...gameGrid]
    updatedGrid[letterToReveal.row][letterToReveal.col].revealed = true
    
    setGameGrid(updatedGrid)
    setShowHint(true)
    
    // Penalty for using hint
    setScore(prev => Math.max(0, prev - 2))
  }

  // Toggle difficulty
  const toggleDifficulty = () => {
    setDifficulty(prev => 
      prev === GameDifficulty.EASY ? GameDifficulty.HARD : GameDifficulty.EASY
    )
    setSelectedCells([])
  }

  // Helper function to get a random letter
  const getRandomLetter = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz'
    return letters[Math.floor(Math.random() * letters.length)]
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

  // Check if game is complete
  const isGameComplete = wordsToFind.every(w => w.found)

  return (
    <div className='w-[400px] min-h-[600px] scrollbar-hide'>
      <div className='flex w-full flex-row justify-between p-4 border-b-[1px]'>
        <BackButton />
        <HeaderTitle title='Word Game' />
        <div className='flex items-center gap-2'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
              <RefreshCw className='cursor-pointer' size={20} onClick={resetGame} />
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset Game</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {loading ? (
        <div className='flex mt-20 justify-center items-center'>
          <Spinner />
        </div>
      ) : (
        <div className='flex flex-col gap-4 p-4'>
          {/* Game Header */}
          <div className='flex justify-between items-center'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>Easy</span>
              <Switch 
                checked={difficulty === GameDifficulty.HARD}
                onCheckedChange={toggleDifficulty}
              />
              <span className='text-sm font-medium'>Hard</span>
            </div>
            <div className='flex items-center gap-2'>
              <Badge variant='outline' className='text-base px-3 py-1'>
                Score: {score}
              </Badge>
              {streakCount > 0 && (
                <Badge variant='secondary' className='text-sm'>
                  Streak: {streakCount}
                </Badge>
              )}
            </div>
          </div>

          {/* Game Grid */}
          <div className='flex justify-center'>
            <div className='grid grid-cols-7 gap-1 w-full max-w-[350px]'>
              {gameGrid.flat().map((cell, index) => (
                <div
                  key={index}
                  className={`
                    w-full aspect-square flex items-center justify-center 
                    text-lg font-bold uppercase cursor-pointer rounded-md
                    ${cell.revealed ? 'bg-primary text-white' : 'bg-muted'}
                    ${selectedCells.includes(cell) ? 'bg-yellow-400 text-black' : ''}
                    ${cell.revealed && !selectedCells.includes(cell) ? 'bg-primary text-white' : ''}
                    transition-all duration-200 hover:bg-primary/20
                  `}
                  onClick={() => handleCellClick(cell)}
                >
                  {cell.letter}
                </div>
              ))}
            </div>
          </div>

          {/* Word Selection Controls */}
          <div className='flex justify-center gap-2 mt-2'>
            <Button
              variant='outline'
              onClick={() => setSelectedCells([])}
              disabled={selectedCells.length === 0}
            >
              Clear
            </Button>
            <Button
              onClick={checkSelectedWord}
              disabled={selectedCells.length < 3}
            >
              Submit
            </Button>
            <Button
              variant='secondary'
              onClick={showHintAction}
              disabled={isGameComplete || showHint}
            >
              <HelpCircle size={16} className='mr-1' />
              Hint
            </Button>
          </div>

          {/* Word List */}
          <div className='mt-2'>
            <h3 className='text-lg font-bold mb-2'>Words to Find: {wordsToFind.filter(w => !w.found).length}</h3>
            <div className='grid grid-cols-2 gap-2'>
              {wordsToFind.map((word, index) => (
                <div
                  key={index}
                  className={`
                    flex justify-between items-center p-2 rounded-md
                    ${word.found ? 'bg-primary/10 text-primary line-through' : 'bg-muted'}
                  `}
                >
                  <div className='flex items-center gap-1'>
                    {word.found ? (
                      word.word
                    ) : (
                      <span className='font-mono'>
                        {word.word.split('').map(() => '•').join('')}
                      </span>
                    )}
                  </div>
                  <Badge variant={word.found ? 'outline' : 'secondary'}>
                    {word.points} pts
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Game Complete Message */}
          {isGameComplete && (
            <div className='mt-4 p-4 bg-green-100 dark:bg-green-900 rounded-md text-center'>
              <h3 className='text-xl font-bold text-green-700 dark:text-green-300'>
                Game Complete!
              </h3>
              <p className='mt-2'>
                You found all {wordsToFind.length} words and scored {score} points!
              </p>
              <Button className='mt-4' onClick={resetGame}>
                Play Again
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default GameScreen
