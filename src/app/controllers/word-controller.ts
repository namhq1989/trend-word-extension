import { IWord } from '@/app/models/word.ts'
import { create } from 'zustand/react'
import { fetchNewWordApi } from '@/app/networking/word-api.ts'

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
      const word = await fetchNewWordApi({
        categories: ['politics', 'technology', 'business'],
      })
      set({ newWord: word })
    } catch (error) {
      console.error('Error fetching new word:', error)
    } finally {
      set({ isFetchingNewWord: false })
    }
  },
}))

export default useWordControllerStore
