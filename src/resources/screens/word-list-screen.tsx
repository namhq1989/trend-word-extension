import HeaderTitle from '@/resources/components/header-title.tsx'
import BackButton from '@/resources/components/back-button.tsx'
import WordListItem from '@/resources/components/word-list-item.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx'

const WordListScreen = () => {
  return (
    <div className='flex flex-col w-[400px] min-h-[600px] scrollbar-hide'>
      <div className='flex w-full flex-row justify-between p-4 border-b-[1px]'>
        <BackButton />
        <HeaderTitle title='Words' />
      </div>
      <div className='flex flex-col p-4 gap-4'>
        <div className='flex gap-2'>
          <CategoryFilter />
          <BookmarkFilter />
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

const CategoryFilter = () => {
  return (
    <Select>
      <SelectTrigger className='w-[160px]'>
        <SelectValue placeholder='Category' />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value='all'>All</SelectItem>
          <SelectItem value='politics'>Politics</SelectItem>
          <SelectItem value='technology'>Technology</SelectItem>
          <SelectItem value='business'>Business</SelectItem>
          <SelectItem value='science'>Science</SelectItem>
          <SelectItem value='health'>Health</SelectItem>
          <SelectItem value='sports'>Sports</SelectItem>
          <SelectItem value='entertainment'>Entertainment</SelectItem>
          <SelectItem value='world'>World News</SelectItem>
          <SelectItem value='education'>Education</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

const BookmarkFilter = () => {
  return (
    <Select>
      <SelectTrigger className='w-[140px]'>
        <SelectValue placeholder='Bookmark' />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value='all'>All</SelectItem>
          <SelectItem value='bookmarked'>Bookmarked</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export default WordListScreen
