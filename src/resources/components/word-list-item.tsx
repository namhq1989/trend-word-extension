import { Bookmark, BookmarkCheck, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge.tsx'
import { Separator } from '@/components/ui/separator.tsx'
import { goTo } from 'react-chrome-extension-router'
import WordDetailScreen from '@/resources/screens/word-detail-screen.tsx'
import { IWord } from '@/app/models/word.ts'
import { capitalizeString } from '@/lib/string'
import { formatDateToDDMMYYYY } from '@/lib/date'
import { useWordBookmark } from './hooks/use-word-bookmark.ts'

interface WordListItemProps {
  word: IWord
}

const WordListItem = ({ word }: WordListItemProps) => {
  const { isBookmarked, isLoading, toggleBookmark } = useWordBookmark(
    word.id,
    word,
  )

  return (
    <div className='flex flex-col bg-container p-4 gap-2'>
      <div className='flex justify-between items-center'>
        <h2
          className='text-2xl text-primary font-bold cursor-pointer'
          onClick={() => {
            goTo(WordDetailScreen, { word })
          }}
        >
          {word.word}
        </h2>
        {isBookmarked ? (
          <BookmarkCheck
            size={24}
            className='cursor-pointer text-primary'
            onClick={toggleBookmark}
            style={{ opacity: isLoading ? 0.5 : 1 }}
          />
        ) : (
          <Bookmark
            size={24}
            className='cursor-pointer text-muted-foreground'
            onClick={toggleBookmark}
            style={{ opacity: isLoading ? 0.5 : 1 }}
          />
        )}
      </div>
      <div className='flex flex-row gap-1'>
        {word.level && <Badge>{word.level}</Badge>}
        {word.partsOfSpeech && word.partsOfSpeech.length > 0 && (
          <Badge variant='accent'>{word.partsOfSpeech[0]}</Badge>
        )}
      </div>
      {word.definitions && word.definitions.length > 0 && (
        <p className='text-sm mt-2'>{word.definitions[0].definition}</p>
      )}
      <Separator className='bg-foreground/10 my-2' />
      <div className='flex justify-between items-center'>
        <div className='flex flex-shrink-0 gap-2 items-center text-muted-foreground text-xs'>
          {word.news &&
            word.news.length > 0 &&
            word.news[0].categories &&
            word.news[0].categories.length > 0 && (
              <p>{capitalizeString(word.news[0].categories[0])}</p>
            )}
          {word.news &&
            word.news.length > 0 &&
            word.news[0].categories &&
            word.news[0].categories.length > 0 &&
            word.news[0].sourceUrl && <p>•</p>}
          {word.news && word.news.length > 0 && word.news[0].sourceUrl && (
            <a
              href={word.news[0].sourceUrl}
              target='_blank'
              className='underline underline-offset-2'
            >
              Source
            </a>
          )}
          {word.news &&
            word.news.length > 0 &&
            ((word.news[0].categories && word.news[0].categories.length > 0) ||
              word.news[0].sourceUrl) &&
            word.news[0].publishedAt && <p>•</p>}
          {word.news && word.news.length > 0 && word.news[0].publishedAt && (
            <p>{formatDateToDDMMYYYY(word.news[0].publishedAt)}</p>
          )}
        </div>
        <div
          className='flex w-5 h-5 items-center justify-center text-muted-foreground cursor-pointer'
          onClick={() => {
            goTo(WordDetailScreen, { word })
          }}
        >
          <ChevronRight size={20} />
        </div>
      </div>
    </div>
  )
}

export default WordListItem
