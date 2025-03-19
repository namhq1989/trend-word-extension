import { IWord } from '@/app/models/word.ts'
import { create } from 'zustand/react'
import useStorageStore from '@/core/storage.ts'

interface IWordController {
  newWord: IWord | null
  isFetchingNewWord: boolean
  fetchNewWord: () => Promise<void>
}

const useWordControllerStore = create<IWordController>((set) => ({
  newWord: null,
  isFetchingNewWord: false,
  fetchNewWord: async () => {
    set({ isFetchingNewWord: true })

    try {
      // Use runtime message to get the latest word from IndexedDB
      const response = await chrome.runtime.sendMessage({
        action: 'getLatestWord',
      })

      if (!response || !response.success) {
        console.error(
          'Error retrieving latest word:',
          response?.error || 'Unknown error',
        )
        throw new Error(response?.error || 'Failed to retrieve latest word')
      }

      const word = response.word

      if (!word) {
        // Display error notification if no word available
        const storage = useStorageStore.getState()
        await storage.displayErrorNotification(
          'No words available. Please try again later.',
        )
        set({ newWord: null })
        return
      }

      // Set the new word in the store
      set({ newWord: word })
    } catch (error) {
      console.error('Error in fetchNewWord:', error)

      // Display error notification
      const storage = useStorageStore.getState()
      await storage.displayErrorNotification(
        'An unexpected error occurred. Please try again later.',
      )

      set({ newWord: null })
    } finally {
      set({ isFetchingNewWord: false })
    }
  },
}))

export default useWordControllerStore
