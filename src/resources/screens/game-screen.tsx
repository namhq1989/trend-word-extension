import { useEffect, useState, useCallback } from 'react'
import { LifeBuoy, RefreshCw, Info, Volume2 } from 'lucide-react'
import HeaderTitle from '@/resources/components/header-title.tsx'
import BackButton from '@/resources/components/back-button.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Switch } from '@/components/ui/switch.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import Spinner from '@/components/ui/spinner'
import { IWord } from '@/app/models/word.ts'
import { IWordDefinition } from '@/app/models/word-data.ts'
import { useAudioPlayer } from '@/resources/components/hooks/use-audio-player.ts'

// Word difficulty scoring

// Word difficulty scoring
const WORD_DIFFICULTY_SCORES = {
  beginner: 50,
  intermediate: 100,
  advanced: 150
}

// Predefined colors for words (7 distinct colors)
const WORD_COLORS = [
  '#7f1d1d',  // Dark red
  '#365314',  // Dark green
  '#134e4a',  // Dark teal
  '#1e3a8a',  // Dark blue
  '#581c87',  // Dark purple
  '#713f12',  // Dark yellow
  '#881337',  // Dark rose
]

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
  pointsEarned?: number // Actual points earned when found (including streak bonus)
  letters: GridCell[]
  color: string // Added color property for each word
  hintRevealed: boolean // Track if hint was revealed for this word
  revealedCharIndices: number[] // Indices of characters revealed by hints
  definitions: IWordDefinition[] // Definitions from the IWord object
}

const GameScreen = () => {
  // Game state
  const [words, setWords] = useState<IWord[]>([])
  const [loading, setLoading] = useState(true)
  const [gameGrid, setGameGrid] = useState<GridCell[][]>([])
  const [wordsToFind, setWordsToFind] = useState<WordToFind[]>([])
  const [score, setScore] = useState(0)
  const [selectedCells, setSelectedCells] = useState<GridCell[]>([])
  const [gameStarted, setGameStarted] = useState(false)
  const [showMaskedWords, setShowMaskedWords] = useState(false) // For testing - toggle to show/hide masked words
  const [notEnoughWords, setNotEnoughWords] = useState(false) // Track if there are enough words
  
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
        limit: 1
      })
      
      if (!countResponse.success) {
        console.error('Failed to get word count:', countResponse)
        setLoading(false)
        return
      }
      
      // Calculate how many words we need to fetch to have enough suitable candidates
      // We need at least 30 words to have a good chance of finding 7 suitable ones
      const totalWords = countResponse.total
      const fetchLimit = Math.min(totalWords, 50) // Fetch up to 50 words max
      
      // Get random offset to fetch different words each time
      const randomStart = totalWords > fetchLimit ? 
        Math.floor(Math.random() * (totalWords - fetchLimit)) : 0
      
      // Fetch a batch of words with random offset
      const response = await chrome.runtime.sendMessage({
        action: 'getWords',
        start: randomStart,
        limit: fetchLimit
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
    // Select words for the game (always exactly 7 words)
    const gameWords = selectGameWords(words, 7)
    
    // Check if we have enough words to start the game
    if (gameWords.length < 7) {
      setNotEnoughWords(true)
      setGameStarted(false)
      return
    }
    
    // Reset the not enough words flag
    setNotEnoughWords(false)
    
    // Create the grid and place words
    const { grid, placedWords } = createGameGrid(gameWords)
    
    // Ensure we have exactly 7 words
    if (placedWords.length !== 7) {
      console.warn(`Expected 7 placed words, but got ${placedWords.length}. Retrying...`)
      // If we don't have exactly 7 words, try again
      initializeGame()
      return
    }
    
    setGameGrid(grid)
    setWordsToFind(placedWords)
    setScore(0)
    setGameStarted(true)
  }

  // Select a subset of words for the game
  const selectGameWords = (allWords: IWord[], count: number): IWord[] => {
    // Filter words that are suitable for the game (not too long, not too short)
    const suitableWords = allWords.filter(word => {
      const wordText = word.word.toLowerCase()
      return wordText.length >= 3 && wordText.length <= 9 && /^[a-z]+$/.test(wordText)
    })
    
    // Shuffle the suitable words for randomness
    const shuffledWords = shuffleArray(suitableWords)
    
    // If we don't have enough suitable words, log a warning and return what we have
    if (shuffledWords.length < count) {
      console.warn(`Not enough suitable words: found ${shuffledWords.length}, needed ${count}`)
      return shuffledWords
    }
    
    // If we have enough words, take exactly the requested count
    return shuffledWords.slice(0, count)
  }

  // Create the game grid and place words
  const createGameGrid = (gameWords: IWord[]) => {
    // Initialize an empty 9x9 grid
    const gridSize = 9
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
    
    // Ensure we're working with exactly 7 words
    const wordsToPlace = gameWords.slice(0, 7)
    const placedWords: WordToFind[] = []
    
    // Try to place each word on the grid
    wordsToPlace.forEach(wordObj => {
      const wordText = wordObj.word.toLowerCase()
      
      // Skip words that are too long for the grid
      if (wordText.length > gridSize) {
        return
      }
      
      // Define various placement patterns
      // Standard directions
      const standardDirections = [
        { dr: 0, dc: 1 },   // horizontal (→)
        { dr: 1, dc: 0 },   // vertical (↓)
        { dr: 1, dc: 1 },   // diagonal down-right (↘)
        { dr: 1, dc: -1 },  // diagonal down-left (↙)
        { dr: -1, dc: 0 },  // up (↑)
        { dr: 0, dc: -1 },  // left (←)
        { dr: -1, dc: -1 }, // diagonal up-left (↖)
        { dr: -1, dc: 1 }   // diagonal up-right (↗)
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
          const row = startRow + (i % 2 === 0 ? i / 2 * direction : (i-1) / 2 * direction)
          const col = startCol + Math.floor(i / 2)
          return { row, col }
        }
      ]
      
      // Decide whether to use standard directions or complex patterns
      // Higher chance for standard directions to ensure most words can be placed
      const useComplexPattern = Math.random() < 0.3 // 30% chance for complex patterns
      
      let placed = false
      
      // Try standard directions first
      if (!useComplexPattern || wordText.length <= 3) { // For very short words, stick to standard directions
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
              
              // Assign a color from our predefined colors
              const wordColor = getWordColor(placedWords.length)
              
              // Add to placed words list
              // Generate 2 random indices to auto-reveal for this word
              const autoRevealIndices: number[] = [];
              // Only add auto-reveal indices if word length is > 2
              if (wordText.length > 2) {
                while (autoRevealIndices.length < 2 && autoRevealIndices.length < wordText.length) {
                  const randomIndex = Math.floor(Math.random() * wordText.length);
                  if (!autoRevealIndices.includes(randomIndex)) {
                    autoRevealIndices.push(randomIndex);
                  }
                }
              }
              
              placedWords.push({
                word: wordText,
                found: false,
                level: wordObj.level.toLowerCase(),
                points: WORD_DIFFICULTY_SCORES[wordObj.level.toLowerCase() as keyof typeof WORD_DIFFICULTY_SCORES] || 5,
                letters: wordCells,
                color: wordColor,
                hintRevealed: false,
                revealedCharIndices: autoRevealIndices,
                definitions: wordObj.definitions.splice(0, 2) || []
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
            
            for (let i = 0; i < wordText.length; i++) {
              const { row, col } = patternFunc(i, startRow, startCol)
              
              // Check if position is within grid bounds
              if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
                canPlace = false
                break
              }
              
              // Check if cell is empty or has matching letter
              if (grid[row][col].letter !== '' && grid[row][col].letter !== wordText[i]) {
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
              // Generate 2 random indices to auto-reveal for this word
              const autoRevealIndices: number[] = [];
              // Only add auto-reveal indices if word length is > 2
              if (wordText.length > 2) {
                while (autoRevealIndices.length < 2 && autoRevealIndices.length < wordText.length) {
                  const randomIndex = Math.floor(Math.random() * wordText.length);
                  if (!autoRevealIndices.includes(randomIndex)) {
                    autoRevealIndices.push(randomIndex);
                  }
                }
              }
              
              placedWords.push({
                word: wordText,
                found: false,
                level: wordObj.level.toLowerCase(),
                points: WORD_DIFFICULTY_SCORES[wordObj.level.toLowerCase() as keyof typeof WORD_DIFFICULTY_SCORES] || 5,
                letters: wordCells,
                color: wordColor,
                hintRevealed: false,
                revealedCharIndices: autoRevealIndices,
                definitions: wordObj.definitions.splice(0, 2) || []
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
      const targetWord = updatedWordsToFind[wordIndex]
      const wordPoints = targetWord.points
      const wordLength = targetWord.word.length
      
      // Calculate points reduction based on revealed characters
      // Reserve 20 points minimum
      const reservedPoints = 20
      const pointsPerChar = (wordPoints - reservedPoints) / wordLength
      
      // Count revealed characters (excluding the 2 auto-revealed ones)
      const revealedCount = Math.max(0, targetWord.revealedCharIndices.length - 2)
      
      // Calculate actual points earned
      const pointsReduction = Math.round(pointsPerChar * revealedCount)
      const actualPoints = Math.max(reservedPoints, wordPoints - pointsReduction)
      
      // Store the points earned for this word
      updatedWordsToFind[wordIndex].pointsEarned = actualPoints
      
      // Add the points to the score
      setScore(prev => prev + actualPoints)
      
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

  // Reset the game
  const resetGame = () => {
    setGameStarted(false)
    setSelectedCells([])
    fetchWords()
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
    
    // Calculate points per character (always reserve 20 points)
    const wordPoints = targetWord.points
    const reservedPoints = 20
    const pointsPerChar = (wordPoints - reservedPoints) / wordLength
    
    // Calculate penalty for this hint (only count hints beyond the 2 auto-revealed characters)
    const hintCount = targetWord.revealedCharIndices.length - 2
    if (hintCount > 0) {
      // Reduce the word's points for when it's found
      const pointsReduction = Math.round(pointsPerChar * hintCount)
      const newPoints = Math.max(reservedPoints, wordPoints - pointsReduction)
      updatedWordsToFind[wordIndex].pointsEarned = newPoints
    }
    
    setWordsToFind(updatedWordsToFind)
  }


  
  // Toggle showing masked words (for testing)
  const toggleShowMaskedWords = () => {
    setShowMaskedWords(prev => !prev)
  }
  


  // Helper function to get a random letter
  const getRandomLetter = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz'
    return letters[Math.floor(Math.random() * letters.length)]
  }

  // Get a color from the predefined colors array based on index
  const getWordColor = (index: number) => {
    return WORD_COLORS[index % WORD_COLORS.length]
  }
  
  // Generate random congratulation content
  const getRandomCongratulation = () => {
    const titles = [
      "Congratulations",
      "Well Done",
      "Excellent",
      "Amazing",
      "Fantastic",
      "Brilliant",
      "Superb",
      "Outstanding"
    ]
    
    const messages = [
      "You've completed the Word Drop challenge",
      "You've mastered all the words",
      "Your word skills are impressive",
      "You found all the hidden words",
      "Your vocabulary prowess is remarkable",
      "You've conquered the word puzzle",
      "Word challenge completed successfully",
      "You're a word-finding champion",
    ]
    
    return {
      title: titles[Math.floor(Math.random() * titles.length)],
      message: messages[Math.floor(Math.random() * messages.length)]
    }
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
  
  // Get random congratulation content when game is complete
  const congratulation = getRandomCongratulation()

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

      {/* Random Congratulation Message */}
      {isGameComplete && (
            <div className='p-4'>
              <div className='p-6 bg-muted rounded-md text-center'>
              <h2 className='text-2xl font-bold text-primary mb-2'>
                {congratulation.title}
              </h2>
              <p className='text-base'>
                {congratulation.message}
              </p>
            </div>
            </div>
          )
        }

      {loading ? (
        <div className='flex mt-20 justify-center items-center'>
          <Spinner />
        </div>
      ) : notEnoughWords ? (
        <div className='flex flex-col mt-20 justify-center items-center p-4 gap-4'>
          <div className='p-6 bg-muted rounded-md text-center max-w-md'>
            <h2 className='text-2xl font-bold text-primary mb-2'>Not Enough Words</h2>
            <p className='text-base mb-4'>
              You need at least 7 suitable words to play the Word Game. Please collect more words by browsing the web or adding words to your collection.
            </p>
            <p className='text-sm text-muted-foreground'>
              Suitable words are 3-9 letters long and contain only alphabetic characters.
            </p>
          </div>
          <Button onClick={resetGame} className='cursor-pointer'>
            Try Again
          </Button>
        </div>
      ) : (
        <div className='flex flex-col gap-4 p-4'>
          {/* Game Header */}
          <div className='flex justify-between items-center'>
            <div className='flex items-center gap-2'>
              <Badge variant='outline' className='text-base px-3 py-1'>
                Score: {score}
              </Badge>
              {/* Streak feature removed */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Switch
                      checked={showMaskedWords}
                      onCheckedChange={toggleShowMaskedWords}
                      className="ml-2"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle Test Mode</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Game Grid */}
          <div className='flex justify-center'>
            <div className='grid grid-cols-9 gap-1 w-full max-w-[450px]'>
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

          {/* Word List - Hidden when game is complete */}
          <div className='mt-2'>
              <h3 className='text-lg font-bold mb-2'>Words: {wordsToFind.filter(w => w.found).length}/{wordsToFind.length}</h3>
              <div className='flex flex-col gap-2'>
                {wordsToFind.map((word, index) => (
                  <div
                    key={index}
                    className={`
                      flex justify-between items-center py-2 px-4 rounded-md bg-muted
                    `}
                    style={{
                      // backgroundColor: word.found ? 'transparent' : '',
                      color: word.found ? 'var(--primary)' : ''
                    }}
                  >
                    <div className='flex items-center gap-2'>
                      {word.found || showMaskedWords ? (
                        <span className='text-base'>{word.word}</span>
                      ) : (
                        <span className='text-base' style={{ letterSpacing: '0.25em' }}>
                          {word.word.split('').map((char, i) => 
                            word.revealedCharIndices.includes(i) ? char : '•'
                          ).join('')}
                        </span>
                      )}
                  
                    </div>
                    <div className='flex items-center gap-2'>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info size={16} className='cursor-pointer' />
                          </TooltipTrigger>
                          <TooltipContent className='w-64 p-2'>
                            <div className='flex flex-col gap-2'>
                              {word.definitions.map((def, i) => (
                                <div key={i} className='mb-1'>
                                  <span className='italic'>({def.pos}) </span>
                                  <span className='text-xs'>{def.definition}</span>
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {!word.found ? (
                        // Show hint button for unfound words
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <LifeBuoy size={16} className='cursor-pointer' onClick={() => showWordHint(index)} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Hint</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        // Show audio button for found words
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Volume2 
                                size={16} 
                                className='cursor-pointer' 
                                onClick={() => {
                                  const originalWord = words.find(w => w.word.toLowerCase() === word.word.toLowerCase())
                                  if (originalWord && originalWord.id) {
                                    playAudio(originalWord.id)
                                  }
                                }} 
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Pronounce</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Badge variant='outline' className='text-xs'>
                        {word.word.length} chars
                      </Badge>
                      <Badge variant='secondary' className='w-[55px]'>
                    {word.found && word.pointsEarned ? `${word.pointsEarned} pts` : `${word.points} pts`}
                  </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
        </div>
      )}
    </div>
  )
}

export default GameScreen
