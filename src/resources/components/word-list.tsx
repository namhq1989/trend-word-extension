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
  updateWordPoints?: (index: number, points: number) => void
}

const WordList = ({ wordsToFind, showMaskedWords, showWordHint, words, playAudio, autoRevealCount, updateWordPoints }: WordListProps) => {
  // State to track animating points for each word
  const [animatingPoints, setAnimatingPoints] = useState<{[key: string]: number}>({})
  const [isAnimating, setIsAnimating] = useState<{[key: string]: boolean}>({})
  // Store the initial calculated points (A) for each word
  const [initialCalculatedPoints, setInitialCalculatedPoints] = useState<{[key: string]: number}>({})
  // Use a Record type for the ref to store both words array and individual word references
  const previousWordsRef = useRef<Record<string, any>>({
    words: [],
    wordRefs: {}
  })
  
  // Calculate points based on the new formula
  const calculateReducedPoints = (word: WordToFind) => {
    // Get the initial points for the word
    const initialPoints = word.points
    const wordLength = word.word.length
    
    // Apply point reduction based on autoRevealCount
    let adjustedPoints = initialPoints
    if (autoRevealCount === 1) {
      // Reduce by 10% for autoRevealCount of 1
      adjustedPoints = initialPoints - (0.1 * initialPoints)
    } else if (autoRevealCount > 1) {
      // Reduce by 20% for autoRevealCount of 2 or more
      adjustedPoints = initialPoints - (0.2 * initialPoints)
    }
    
    // Add bonus points based on word length (20 points per character)
    const lengthBonus = wordLength * 20
    
    // Calculate final points
    const finalPoints = Math.round(adjustedPoints + lengthBonus)
    
    return finalPoints
  }
  
  // Function to handle hint click with animation
  const handleHintClick = (index: number) => {
    const word = wordsToFind[index]
    if (word.found) return
    
    // Get or calculate the initial points (A) for this word
    let wordInitialPoints = initialCalculatedPoints[index]
    
    if (wordInitialPoints === undefined) {
      // First time calculating points for this word
      wordInitialPoints = calculateReducedPoints(word)
      
      // Store for future use
      setInitialCalculatedPoints(prev => ({
        ...prev,
        [index]: wordInitialPoints
      }))
    }
    
    // Calculate how many characters have been manually revealed so far (not including auto-revealed)
    const manuallyRevealedCount = Math.max(0, word.revealedCharIndices.length - autoRevealCount)
    
    // Calculate points after applying sequential 8% reductions for each hint
    // Start with the initial calculated points
    let reducedPoints = wordInitialPoints
    
    // Apply 8% reduction for each hint (including the new one we're about to reveal)
    for (let i = 0; i < manuallyRevealedCount + 1; i++) {
      const reduction = Math.round(wordInitialPoints * 0.08)
      reducedPoints -= reduction
    }
    
    // Ensure points don't go below 20% of initial calculated points
    const minimumPoints = Math.round(wordInitialPoints * 0.2)
    
    if (reducedPoints < minimumPoints) {
      reducedPoints = minimumPoints
    }
    
    // For animation, we need to start from the previous points or the initial points
    // Get the previous points from our stored ref or from the current state
    const prevWordRef = previousWordsRef.current.wordRefs[`word-${index}`]
    const previousPoints = prevWordRef?.pointsEarned || word.pointsEarned || wordInitialPoints
    
    // Set up animation starting and ending points - start from the previous calculated points
    setAnimatingPoints(prev => ({
      ...prev,
      [index]: previousPoints
    }))
    
    // Store the target points in a ref to use during animation
    const wordRef = `word-${index}`
    previousWordsRef.current.wordRefs[wordRef] = {
      ...word,
      pointsEarned: reducedPoints
    }
    
    // Set animation flag
    setIsAnimating(prev => ({
      ...prev,
      [index]: true
    }))
    
    // Store our calculated points in a variable to check after showWordHint
    const ourCalculatedPoints = reducedPoints
    
    // Update the parent component with our calculated points
    if (updateWordPoints) {
      updateWordPoints(index, reducedPoints)
    }
    
    // Call the actual hint function
    showWordHint(index)
    
    // Check if the points were changed by showWordHint and restore our calculation if needed
    setTimeout(() => {
      // If the points were changed to something different than what we calculated
      if (wordsToFind[index].pointsEarned && wordsToFind[index].pointsEarned !== ourCalculatedPoints) {
        // Create a modified copy of the word with our calculated points
        const modifiedWord = {
          ...wordsToFind[index],
          pointsEarned: ourCalculatedPoints
        }
        
        // Update the stored ref
        previousWordsRef.current.wordRefs[`word-${index}`] = modifiedWord
        
        // Also force the animation to target our calculated points
        setAnimatingPoints(prev => ({
          ...prev,
          [index]: prev[index] // Keep the current animation position
        }))
        
        // Update the parent component again to ensure our calculation is used
        if (updateWordPoints) {
          updateWordPoints(index, ourCalculatedPoints)
        }
      }
    }, 50)
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
      
      // Get the target points - IMPORTANT: prioritize our stored ref points
      const wordRef = `word-${index}`
      const storedWord = previousWordsRef.current.wordRefs[wordRef]
      
      // Prioritize our stored reference which has our calculated points
      const targetPoints = (storedWord && storedWord.pointsEarned) || 
                          word.pointsEarned || 
                          initialCalculatedPoints[index] ||
                          calculateReducedPoints(word)
      
      const currentAnimatingPoints = animatingPoints[index] || initialCalculatedPoints[index] || word.points
      
      // If we've reached the target, stop animating
      if (currentAnimatingPoints === targetPoints) {
        setIsAnimating(prev => ({
          ...prev,
          [index]: false
        }))
        
        // Ensure the parent component has the final points
        if (updateWordPoints) {
          updateWordPoints(index, targetPoints)
        }
        
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
                <span className='text-sm'>{word.word}</span>
              ) : (
                <span className='text-sm' style={{ letterSpacing: '0.25em' }}>
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
              <Badge variant='outline' className='w-[60px] text-xs'>
                {word.word.length} chars
              </Badge>
              <Badge 
                variant='secondary' 
                className='w-[55px] transition-all'
              >
                {(() => {
                  // Get the stored word ref which has our calculated points
                  const wordRef = `word-${index}`
                  const storedWord = previousWordsRef.current.wordRefs[wordRef]
                  
                  // Prioritize our stored ref points over word.pointsEarned
                  const displayValue = isAnimating[index] && animatingPoints[index] !== undefined
                    ? animatingPoints[index]
                    : (storedWord && storedWord.pointsEarned) 
                      ? storedWord.pointsEarned
                      : word.pointsEarned 
                        ? word.pointsEarned 
                        : initialCalculatedPoints[index] !== undefined
                          ? initialCalculatedPoints[index]
                          : calculateReducedPoints(word);
                  
                  return `${displayValue} pts`;
                })()
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
