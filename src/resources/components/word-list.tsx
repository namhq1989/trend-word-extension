import { Volume2, Info, LifeBuoy } from 'lucide-react'
import { Badge } from '@/components/ui/badge.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import { WordToFind } from '@/resources/components/game-play-phase.tsx'
import { IWord } from '@/app/models/word.ts'

interface WordListProps {
  wordsToFind: WordToFind[]
  showMaskedWords: boolean
  showWordHint: (index: number) => void
  words: IWord[]
  playAudio: (id: string) => void
}

const WordList = ({ wordsToFind, showMaskedWords, showWordHint, words, playAudio }: WordListProps) => {
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
  )
}

export default WordList
