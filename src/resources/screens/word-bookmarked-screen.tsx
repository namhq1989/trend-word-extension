import HeaderTitle from '@/resources/components/header-title.tsx'
import BackButton from '@/resources/components/back-button.tsx'
import WordListItem from '@/resources/components/word-list-item.tsx'
import CategoryFilter from '@/resources/components/category-filter.tsx'

const WorkBookmarkedScreen = () => {
  return (
    <div className='flex flex-col w-[400px] min-h-[600px] scrollbar-hide'>
      <div className='flex w-full flex-row justify-between p-4 border-b-[1px]'>
        <BackButton />
        <HeaderTitle title='Bookmarked' />
      </div>
      <div className='flex flex-col p-4 gap-4'>
        <div className='flex gap-2'>
          <CategoryFilter />
        </div>
        <WordListItem />
        <WordListItem />
        <WordListItem />
        <WordListItem />
        <WordListItem />
        <WordListItem />
      </div>
    </div>
  )
}

export default WorkBookmarkedScreen
