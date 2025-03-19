import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel'
import SectionTitle from '@/resources/components/section-title.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { IWord } from '@/app/models/word'
import { useEffect, useState } from 'react'
import { goTo } from 'react-chrome-extension-router'
import WordDetailScreen from '@/resources/screens/word-detail-screen.tsx'

interface SimilarWordsProps {
  word: IWord
}

const SimilarWords = ({ word }: SimilarWordsProps) => {
  const [similarWords, setSimilarWords] = useState<IWord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSimilarWords = async () => {
      if (!word || !word.categories || word.categories.length === 0) {
        setLoading(false)
        return
      }

      try {
        // Get all words from IndexedDB
        const response = await chrome.runtime.sendMessage({ action: 'getAllWords' })
        
        if (response.success && response.words) {
          // Filter words that have at least one matching category
          // and exclude the current word
          const filtered = response.words.filter((w: IWord) => {
            // Skip the current word
            if (w.id === word.id) return false
            
            // Check if this word has categories
            if (!w.categories || w.categories.length === 0) return false
            
            // Check if any category matches
            return w.categories.some(category => 
              word.categories?.includes(category)
            )
          })
          
          // Get up to 6 similar words
          const limitedWords = filtered.slice(0, 6)
          setSimilarWords(limitedWords)
        }
      } catch (error) {
        console.error('Error fetching similar words:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSimilarWords()
  }, [word])

  // If there are no similar words and not loading, don't render the component
  if (!loading && similarWords.length === 0) {
    return null
  }

  return (
    <div className='flex flex-col gap-2 mt-2 mb-4'>
      <SectionTitle title='Similar Words' className='ml-4' />
      {loading ? (
        <div className='px-4 py-2'>Loading similar words...</div>
      ) : (
        <Carousel
          orientation='horizontal'
          opts={{
            align: 'start',
            dragFree: true,
          }}
          className='w-full'
        >
          <CarouselContent>
            {similarWords.map((similarWord) => (
              <CarouselItem 
                key={similarWord.id} 
                className='basis-1/2 flex items-center justify-center first:ml-4 h-full'
              >
                <div className='flex flex-col gap-2 bg-container p-4 w-full h-full'>
                  <p 
                    className='text-primary text-base font-bold cursor-pointer'
                    onClick={() => goTo(WordDetailScreen, { word: similarWord })}
                  >
                    {similarWord.word}
                  </p>
                  {similarWord.partsOfSpeech && similarWord.partsOfSpeech.length > 0 && (
                    <Badge variant='accent'>{similarWord.partsOfSpeech[0]}</Badge>
                  )}
                  <div className='flex-grow min-h-[60px]'>
                    {similarWord.definitions && similarWord.definitions.length > 0 && (
                      <p className='italic line-clamp-3 mt-1'>
                        {similarWord.definitions[0].definition}
                      </p>
                    )}
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      )}
    </div>
  )
}

export default SimilarWords
