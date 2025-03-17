import { BookmarkCheck, Library, Settings } from 'lucide-react'
import HeaderTitle from '@/resources/components/header-title.tsx'
import { Separator } from '@/components/ui/separator.tsx'
import MenuItem from '@/resources/components/menu-item.tsx'
import { goTo } from 'react-chrome-extension-router'
import WordListScreen from '@/resources/screens/word-list-screen.tsx'
import SettingsScreen from '@/resources/screens/settings-screen.tsx'
import WordReference from '@/resources/components/word-reference.tsx'
import Word from '@/resources/components/word.tsx'
import WorkBookmarkedScreen from '@/resources/screens/word-bookmarked-screen.tsx'
import { useEffect } from 'react'
import useWordControllerStore from '@/app/controllers/word-controller'
import Spinner from '@/components/ui/spinner'

const HomeScreen = () => {
  const { newWord, fetchNewWord, isFetchingNewWord } = useWordControllerStore()

  useEffect(() => {
    const fetch = async () => {
      await fetchNewWord()
    }

    fetch().then()
  }, [fetchNewWord])

  return (
    <div className='w-[400px] min-h-[600px] scrollbar-hide'>
      <div className='flex w-full flex-row justify-between p-4 border-b-[1px] border-base-content/20'>
        <div className='flex flex-row gap-4 items-center'>
          <MenuItem
            title='Words'
            icon={Library}
            onClick={() => goTo(WordListScreen)}
          />
          <MenuItem
            title='Bookmarked'
            icon={BookmarkCheck}
            onClick={() => goTo(WorkBookmarkedScreen)}
          />
          <MenuItem
            title='Settings'
            icon={Settings}
            onClick={() => goTo(SettingsScreen)}
          />
        </div>
        <div className='flex flex-row gap-4 justify-center items-center'>
          <HeaderTitle title='WordDrop' />
        </div>
      </div>
      <div className='flex flex-col gap-4 mt-2'>
        {isFetchingNewWord ? (
          <div className='flex mt-20 justify-center items-center'>
            <Spinner />
          </div>
        ) : (
          <>
            <Word word={newWord} />
            <div className='px-4'>
              <Separator />
            </div>
            <WordReference news={newWord?.news[0] || null} />
          </>
        )}
      </div>
    </div>
  )
}

export default HomeScreen
