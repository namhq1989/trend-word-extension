import HeaderTitle from '@/resources/components/header-title.tsx'
import { Separator } from '@/components/ui/separator.tsx'
import BackButton from '@/resources/components/back-button.tsx'
import WordReference from '@/resources/components/word-reference.tsx'
import Word from '@/resources/components/word.tsx'
import SimilarWords from '@/resources/components/similar-words.tsx'
import { IWord } from '@/app/models/word'
import { useEffect } from 'react'

interface WordDetailScreenProps {
  word: IWord
}

const WordDetailScreen = ({ word }: WordDetailScreenProps) => {
  // Use the first news item for the reference section if available
  const firstNewsItem = word.news && word.news.length > 0 ? word.news[0] : null
  
  // Scroll to top when component renders, with a 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
    
    return () => clearTimeout(timer)
  }, [word.id])
  
  return (
    <div className='w-[400px] min-h-[600px] scrollbar-hide'>
      <div className='flex w-full flex-row justify-between p-4 border-b-[1px]'>
        <BackButton />
        <HeaderTitle title={word.word} />
      </div>
      <div className='flex flex-col gap-4 mt-2'>
        <Word word={word} />
        {firstNewsItem && (
          <>
            <div className='px-4'>
              <Separator />
            </div>
            <WordReference news={firstNewsItem} />
          </>
        )}
        <div className='px-4'>
          <Separator />
        </div>
        <SimilarWords word={word} />
      </div>
    </div>
  )
}

export default WordDetailScreen
