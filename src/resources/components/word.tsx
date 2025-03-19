import { Bookmark, BookmarkCheck, Volume2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge.tsx'
import { IWord } from '@/app/models/word'
import { IWordExample } from '@/app/models/word-example.ts'
import { removePeriodFromEnd } from '@/lib/string.ts'
import { useWordBookmark } from './hooks/useWordBookmark'
import { useAudioPlayer } from './hooks/useAudioPlayer'

interface IWordProps {
  word: IWord | null
}

const Word = ({ word }: IWordProps) => {
  const { isBookmarked, isLoading, toggleBookmark } = useWordBookmark(
    word?.id,
    word!,
  )
  const { playAudio } = useAudioPlayer()

  if (!word) {
    return (
      <div className='flex flex-col p-4'>
        <div className='flex justify-between items-center'>
          <h2 className='text-primary text-4xl font-bold'>No word</h2>
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col p-4 gap-6'>
      <div className='flex flex-col gap-2'>
        <div className='flex justify-between items-center'>
          <h2 className='text-primary text-4xl font-bold'>{word.word}</h2>
          {isBookmarked ? (
            <BookmarkCheck
              className='cursor-pointer text-primary'
              onClick={toggleBookmark}
              style={{ opacity: isLoading ? 0.5 : 1 }}
            />
          ) : (
            <Bookmark
              className='cursor-pointer text-muted-foreground'
              onClick={toggleBookmark}
              style={{ opacity: isLoading ? 0.5 : 1 }}
            />
          )}
        </div>
        <div className='flex items-center gap-2'>
          <Volume2
            size={20}
            className='cursor-pointer'
            fill='var(--foreground)'
            onClick={() => playAudio(word.id)}
          />
          <div className='text-sm'>{word.ipa}</div>
        </div>
        <div className='flex flex-row gap-1 mt-2'>
          <Badge>{word.level}</Badge>
          {word.partsOfSpeech.map((partOfSpeech: string) => {
            return (
              <Badge variant='accent' key={partOfSpeech}>
                {partOfSpeech}
              </Badge>
            )
          })}
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        {word.definitions.map(
          (definition: { definition: string; pos: string }, index: number) => {
            return (
              <p key={`definition-${index}`} className='text-sm'>
                <span className='text-xs text-muted-foreground'>
                  ({definition.pos})
                </span>{' '}
                {definition.definition}
              </p>
            )
          },
        )}
      </div>

      <div className='flex flex-col gap-2'>
        {word.examples.map((example: IWordExample) => {
          const sentence = removePeriodFromEnd(example.example)
          const parts = sentence.split(example.mainWord)
          return (
            <div
              key={example.id}
              className='flex flex-row justify-between items-center bg-container p-4'
            >
              <p className='text-sm italic'>
                {parts[0]}
                <span className='text-primary'>{example.mainWord}</span>
                {parts.length > 1 ? parts[1] : ''}
              </p>
              <div className='flex flex-shrink-0 w-10 h-10 justify-center items-center cursor-pointer'>
                <Volume2 size={20} onClick={() => playAudio(example.id)} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Word
