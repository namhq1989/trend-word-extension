import HeaderTitle from '@/resources/components/header-title.tsx'
import { Separator } from '@/components/ui/separator.tsx'
import BackButton from '@/resources/components/back-button.tsx'
import WordReference from '@/resources/components/word-reference.tsx'
import Word from '@/resources/components/word.tsx'
import SimilarWords from '@/resources/components/similar-words.tsx'

const WordDetailScreen = () => {
  return (
    <div className='w-[400px] min-h-[600px] scrollbar-hide'>
      <div className='flex w-full flex-row justify-between p-4 border-b-[1px]'>
        <BackButton />
        <HeaderTitle title='Word' />
      </div>
      <div className='flex flex-col gap-8 mt-2'>
        <Word />
        <div className='px-4'>
          <Separator />
        </div>
        <WordReference />
        <div className='px-4'>
          <Separator />
        </div>
        <SimilarWords />
      </div>
    </div>
  )
}

export default WordDetailScreen
