import { IWord } from '@/app/models/word.ts'
import { create } from 'zustand/react'
import useStorageStore from '@/core/storage.ts'
import { useEffect } from 'react'

interface IWordController {
  newWord: IWord | null
  isFetchingNewWord: boolean
  fetchNewWord: () => Promise<void>
  updateWord: (word: IWord) => void
}

// Create the store
const useWordControllerStore = create<IWordController>((set) => ({
  newWord: null,
  isFetchingNewWord: false,
  fetchNewWord: async () => {
    console.log('[WORD-CONTROLLER] Fetching new word')
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
      console.log('[WORD-CONTROLLER] Setting new word in store:', word.word)
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
  
  // Update word directly (used when receiving messages from background)
  updateWord: (word: IWord) => {
    console.log('[WORD-CONTROLLER] Updating word in store:', word.word)
    set({ newWord: word })
  },
}))

// Set up message listener hook
export const useWordMessageListener = () => {
  const { updateWord } = useWordControllerStore()
  
  useEffect(() => {
    // Function to handle messages from background script
    const handleMessage = (message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
      console.log('[WORD-CONTROLLER] Received message:', message.action)
      if (message.action === 'wordUpdated' && message.word) {
        console.log('[WORD-CONTROLLER] Received word update message with word:', message.word.word)
        updateWord(message.word)
        // Send a response to close the message channel properly
        sendResponse({ success: true })
        return true // Keep the message channel open for response
      }
      return false // No async response needed
    }

    // Add message listener when component mounts
    console.log('[WORD-CONTROLLER] Setting up message listener')
    chrome.runtime.onMessage.addListener(handleMessage)
    
    // Remove listener when component unmounts
    return () => {
      console.log('[WORD-CONTROLLER] Removing message listener')
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [updateWord])
}

export default useWordControllerStore
