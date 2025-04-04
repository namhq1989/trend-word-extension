import { Volume2, Info, LifeBuoy } from 'lucide-react'
import { Badge } from '@/components/ui/badge.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import { WordToFind } from '@/resources/components/game-play-phase.tsx'
import { IWord } from '@/app/models/word.ts'
import { useState, useEffect, useRef } from 'react'

interface WordListProps {
  wordsToFind: WordToFind[]
  showMaskedWords: boolean
  showWordHint: (index: number) => void
  words: IWord[]
  playAudio: (id: string) => void
  autoRevealCount: number
}

const WordList = ({ wordsToFind, showMaskedWords, showWordHint, words, playAudio, autoRevealCount }: WordListProps) => {
  // State to track animating points for each word
  const [animatingPoints, setAnimatingPoints] = useState<{[key: string]: number}>({})
  const [isAnimating, setIsAnimating] = useState<{[key: string]: boolean}>({})
  // Use a Record type for the ref to store both words array and individual word references
  const previousWordsRef = useRef<Record<string, any>>({
    words: [],
    wordRefs: {}
  })
  
  // Calculate reduced points based on the word's revealed characters
  const calculateReducedPoints = (word: WordToFind) => {
    const wordPoints = word.points
    const wordLength = word.word.length
    
    // Adjust reserved points based on auto-revealed count
    let reservedPoints = 20 // Default
    
    // Set reserved points based on auto-revealed count
    if (word.revealedCharIndices.length === 0) {
      reservedPoints = 30 // 0 auto-revealed
    } else if (word.revealedCharIndices.length === 1) {
      reservedPoints = 20 // 1 auto-revealed
    } else if (word.revealedCharIndices.length >= 2) {
      reservedPoints = 10 // 2 or more auto-revealed
    }
    
    const pointsPerChar = (wordPoints - reservedPoints) / wordLength
    
    // Use the autoRevealCount from props to determine when to start reducing points
    
    // Calculate penalty for hints - start counting from the first manual hint
    // If autoRevealCount is 1, then we should start reducing points from the 2nd character (index 1)
    const hintCount = Math.max(0, word.revealedCharIndices.length - autoRevealCount)
    if (hintCount > 0) {
      const pointsReduction = Math.round(pointsPerChar * hintCount)
      return Math.max(reservedPoints, wordPoints - pointsReduction)
    }
    
    return wordPoints
  }
  
  // Function to handle hint click with animation
  const handleHintClick = (index: number) => {
    const word = wordsToFind[index]
    if (word.found) return
    
    // Store current points before hint
    const currentPoints = word.pointsEarned || word.points
    
    // Calculate what the new points will be after the hint
    // This is to ensure our animation has a target to animate to
    const wordPoints = word.points
    const wordLength = word.word.length
    let reservedPoints = 20
    
    // Use the autoRevealCount from props to determine when to start reducing points
    
    // Set reserved points based on auto-revealed count
    const revealedCount = word.revealedCharIndices.length + 1 // +1 for the hint we're about to show
    if (revealedCount === 0) {
      reservedPoints = 30
    } else if (revealedCount === 1) {
      reservedPoints = 20
    } else if (revealedCount >= 2) {
      reservedPoints = 10
    }
    
    const pointsPerChar = (wordPoints - reservedPoints) / wordLength
    
    // Calculate penalty for this hint - start counting from the first manual hint
    // If autoRevealCount is 1, then we should start reducing points from the 2nd character (index 1)
    const hintCount = Math.max(0, revealedCount - autoRevealCount)
    let calculatedPoints = wordPoints
    
    // Always calculate a reduction if we're revealing a character manually
    if (hintCount > 0) {
      const pointsReduction = Math.round(pointsPerChar * hintCount)
      calculatedPoints = Math.max(reservedPoints, wordPoints - pointsReduction)
    }
    
    // Store the calculated points in the animatingPoints state to use as target
    // We'll set this as the target for the animation to end at
    const finalPoints = calculatedPoints
    
    // Set up animation starting and ending points
    setAnimatingPoints(prev => ({
      ...prev,
      [index]: currentPoints
    }))
    
    // Store the target points in a ref to use during animation
    const wordRef = `word-${index}`
    previousWordsRef.current.wordRefs[wordRef] = {
      ...word,
      pointsEarned: finalPoints
    }
    
    // Set animation flag
    setIsAnimating(prev => ({
      ...prev,
      [index]: true
    }))
    
    // Call the actual hint function
    showWordHint(index)
  }
  
  // Effect to detect changes in points and animate them
  useEffect(() => {
    // Compare current words with previous words
    wordsToFind.forEach((word, index) => {
      const prevWord = previousWordsRef.current.words[index]
      
      // If we have a previous word and the points have changed
      if (prevWord && 
          (prevWord.pointsEarned !== word.pointsEarned || 
           (!prevWord.pointsEarned && !word.pointsEarned && prevWord.revealedCharIndices.length !== word.revealedCharIndices.length))) {
        
        // Start animation if not already animating
        if (!isAnimating[index]) {
          const startPoints = prevWord.pointsEarned || prevWord.points
          
          setAnimatingPoints(prev => ({
            ...prev,
            [index]: startPoints
          }))
          
          setIsAnimating(prev => ({
            ...prev,
            [index]: true
          }))
        }
      }
    })
    
    // Store current words for next comparison
    previousWordsRef.current.words = JSON.parse(JSON.stringify(wordsToFind))
  }, [wordsToFind])
  
  // Effect to handle animation
  useEffect(() => {
    // For each word that's animating
    Object.entries(isAnimating).forEach(([indexStr, animating]) => {
      if (!animating) return
      
      const index = parseInt(indexStr)
      const word = wordsToFind[index]
      if (!word) return
      
      // Get the target points from either the word's earned points, our stored ref, or calculate it
      const wordRef = `word-${index}`
      const storedWord = previousWordsRef.current.wordRefs[wordRef]
      const targetPoints = word.pointsEarned || 
                          (storedWord && storedWord.pointsEarned) || 
                          calculateReducedPoints(word)
      const currentAnimatingPoints = animatingPoints[index] || word.points
      
      // If we've reached the target, stop animating
      if (currentAnimatingPoints === targetPoints) {
        setIsAnimating(prev => ({
          ...prev,
          [index]: false
        }))
        return
      }
      
      // Otherwise, continue animation
      const timer = setTimeout(() => {
        const step = currentAnimatingPoints > targetPoints ? -1 : 1
        setAnimatingPoints(prev => ({
          ...prev,
          [index]: prev[index] + step
        }))
      }, 50) // Animation speed
      
      return () => clearTimeout(timer)
    })
  }, [animatingPoints, isAnimating, wordsToFind])
  return (
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
                      {word.definitions && word.definitions.length > 0 ? (
                        word.definitions.map((def, i) => (
                          <div key={i} className='mb-1'>
                            <span className='italic'>({def.pos}) </span>
                            <span className='text-xs'>{def.definition}</span>
                          </div>
                        ))
                      ) : (
                        <div className='mb-1'>
                          <span className='text-xs'>No definition available</span>
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {!word.found ? (
                // Show hint button for unfound words
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <LifeBuoy size={16} className='cursor-pointer' onClick={() => handleHintClick(index)} />
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
              <Badge 
                variant='secondary' 
                className='w-[55px] transition-all'
              >
                {isAnimating[index] && animatingPoints[index] !== undefined
                  ? `${animatingPoints[index]} pts`
                  : word.pointsEarned 
                    ? `${word.pointsEarned} pts` 
                    : `${word.points} pts`
                }
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default WordList
