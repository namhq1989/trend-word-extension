import { useCallback, useEffect, useState } from 'react'
import { IWord } from '@/app/models/word'
import useStorageStore from '@/core/storage'

/**
 * Custom hook to handle word bookmark functionality
 * @param wordId The ID of the word
 * @param wordData Optional word data to store when bookmarking
 * @returns Object containing bookmark state and toggle function
 */
export const useWordBookmark = (wordId: string | undefined, wordData?: IWord) => {
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const { getWordBookmarkStatus, toggleWordBookmark } = useStorageStore()

  // Fetch bookmark status when word changes 
  useEffect(() => {
    if (wordId) {
      setIsLoading(true)
      getWordBookmarkStatus(wordId)
        .then(bookmarked => {
          setIsBookmarked(bookmarked)
        })
        .catch(error => {
          console.error('Error getting bookmark status:', error)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [wordId])

  const toggleBookmark = useCallback(() => {
    if (!wordId) return
    
    setIsLoading(true)
    toggleWordBookmark(wordId, !isBookmarked, wordData)
      .then(newStatus => {
        setIsBookmarked(newStatus)
      })
      .catch(error => {
        console.error('Error toggling bookmark:', error)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [wordId, isBookmarked, wordData])

  return {
    isBookmarked,
    isLoading,
    toggleBookmark
  }
}
