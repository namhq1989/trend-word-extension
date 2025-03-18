import { useEffect } from 'react'
import HeaderTitle from '@/resources/components/header-title.tsx'
import BackButton from '@/resources/components/back-button.tsx'
import WordListItem from '@/resources/components/word-list-item.tsx'
import CategoryFilter from '@/resources/components/category-filter.tsx'
import useBookmarkedWordsController from '@/app/controllers/bookmarked-words-controller.ts'
import { Button } from '@/components/ui/button.tsx'
import { Loader2 } from 'lucide-react'

const WordBookmarkedScreen = () => {
  const {
    words,
    totalWords,
    hasMore,
    isLoading,
    selectedCategory,
    fetchBookmarkedWords,
    loadMore,
    setCategory,
    reset
  } = useBookmarkedWordsController()

  useEffect(() => {
    // Load bookmarked words when the component mounts
    fetchBookmarkedWords()

    // Clean up when the component unmounts
    return () => {
      reset()
    }
  }, [])

  console.log('words', words)

  return (
    <div className='flex flex-col w-[400px] min-h-[600px] scrollbar-hide'>
      <div className='flex w-full flex-row justify-between p-4 border-b-[1px]'>
        <BackButton />
        <HeaderTitle title='Bookmarked' />
      </div>
      <div className='flex flex-col p-4 gap-4'>
        <div className='flex justify-between items-center'>
          <CategoryFilter 
            value={selectedCategory} 
            onChange={setCategory} 
            disabled={isLoading} 
          />
          <div className='text-sm text-muted-foreground'>
            {totalWords} {totalWords === 1 ? 'word' : 'words'}
          </div>
        </div>

        {isLoading && words.length === 0 ? (
          <div className='flex justify-center items-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </div>
        ) : words.length > 0 ? (
          <>
            <div className='flex flex-col gap-4'>
              {words.map((word) => (
                <WordListItem key={word.id} word={word} />
              ))}
            </div>
            
            {hasMore && (
              <div className='flex justify-center mt-4'>
                <Button 
                  variant='outline' 
                  onClick={loadMore} 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className='flex flex-col justify-center items-center py-12 text-center'>
            <p className='text-lg font-medium'>No bookmarked words found</p>
            <p className='text-sm text-muted-foreground mt-2'>
              Bookmark words to see them here
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default WordBookmarkedScreen
