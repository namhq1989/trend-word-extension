import { IWord } from '@/app/models/word.ts'
import { create } from 'zustand/react'
import { fetchNewWordApi } from '@/app/networking/word-api.ts'
import useDataControllerStore from '@/app/controllers/data-controller.ts'
import useStorageStore, { NotificationFrequency } from '@/core/storage.ts'

interface IWordController {
  newWord: IWord | null
  isFetchingNewWord: boolean
  fetchNewWord: () => Promise<void>
}

// Helper function to get a random item from an array
const getRandomItem = <T>(items: T[]): T => {
  return items[Math.floor(Math.random() * items.length)]
}

// Helper function to convert notification frequency to milliseconds
const convertFrequencyToMs = (frequency: NotificationFrequency): number => {
  if (frequency === '-') return 0 // No cooldown

  const freqNumber = parseInt(frequency)

  // Vite exposes custom env variables with the VITE_ prefix
  const env = import.meta.env.VITE_ENV || 'release'

  if (env === 'develop') {
    // In development mode, use minutes instead of hours for faster testing
    console.log(
      `Development mode: using ${freqNumber} minutes instead of hours`,
    )
    return freqNumber * 60 * 1000 // convert minutes to milliseconds
  } else {
    // In release mode, use hours as normal
    console.log(`Release mode: using ${freqNumber} hours`)
    return freqNumber * 60 * 60 * 1000 // convert hours to milliseconds
  }
}

// Helper function to filter out already fetched categories
const filterFetchedCategories = (
  selectedCategories: string[],
  fetchedCategories: string[],
): string[] => {
  return selectedCategories.filter(
    (category) => !fetchedCategories.includes(category),
  )
}

const useWordControllerStore = create<IWordController>((set) => ({
  newWord: null,
  isFetchingNewWord: false,
  fetchNewWord: async () => {
    set({ isFetchingNewWord: true })

    try {
      const storage = useStorageStore.getState()

      // Get the data controller settings
      const {
        getCategories,
        getDifficultyLevel,
        getNotificationFrequency,
        getMaxWordsPerDay,
      } = useDataControllerStore.getState()

      // Load settings from storage
      await getCategories()
      await getDifficultyLevel()
      await getNotificationFrequency()
      await getMaxWordsPerDay()

      const {
        categories,
        difficultyLevel,
        notificationFrequency,
        maxWordsPerDay,
      } = useDataControllerStore.getState()

      // Get cache data to check current count
      const cache = await storage.getCachedWords()
      const totalCalled = cache ? cache.totalCalled : 0

      // Check if we've exceeded max words per day
      if (totalCalled >= maxWordsPerDay) {
        if (cache && cache.words.length > 0) {
          // Return a random word from the cache
          const randomWord = getRandomItem(cache.words)
          set({ newWord: randomWord })
          return
        }
        // If no cached words available, continue with fetching a new word
      }

      // Check last api called time
      const lastApiCallInfo = await storage.getLastApiCallInfo()
      const lastApiCallTime = lastApiCallInfo.time
      const lastFetchedWord = lastApiCallInfo.word
      const now = Date.now()
      const cooldownMs = convertFrequencyToMs(notificationFrequency)

      // Debug time checks
      console.log('Cooldown milliseconds:', cooldownMs)
      console.log(
        'Last API call time:',
        new Date(lastApiCallTime).toLocaleString(),
      )
      console.log('Current time:', new Date(now).toLocaleString())
      console.log('Time difference (ms):', now - lastApiCallTime)
      console.log('Should use cache?', now - lastApiCallTime < cooldownMs)

      // If cooldown is active and we have a last fetched word, return it
      if (
        cooldownMs > 0 &&
        lastFetchedWord &&
        now - lastApiCallTime < cooldownMs
      ) {
        const env = import.meta.env.VITE_ENV || 'release'
        const unit = env === 'develop' ? 'minute' : 'hour'
        console.log(
          `Using last fetched word due to cooldown (${notificationFrequency} ${unit})`,
        )
        set({ newWord: lastFetchedWord })
        return
      }

      console.log('Cooldown expired or no previous word, fetching new word...')

      // Get list of selected categories
      let selectedCategories = categories
        .filter((category) => category.isSelected)
        .map((category) => category.id)

      // Use default categories if none are selected
      const defaultCategories = ['politics', 'technology', 'business']
      selectedCategories =
        selectedCategories.length > 0 ? selectedCategories : defaultCategories

      // Get already fetched categories
      const fetchedCategories = await storage.getFetchedCategories()

      // Filter out already fetched categories
      let categoriesToFetch = filterFetchedCategories(
        selectedCategories,
        fetchedCategories,
      )

      // If all categories have been fetched, reset the fetchedCategories list
      // and use all selected categories again
      if (categoriesToFetch.length === 0) {
        console.log('All categories have been used, resetting...')
        await storage.resetFetchedCategories()
        categoriesToFetch = selectedCategories
      }

      console.log('Categories available for fetch:', categoriesToFetch)

      // Fetch word from API
      let word: IWord | null = null

      try {
        word = await fetchNewWordApi({
          categories: categoriesToFetch, // Send all available categories, not just one
          level: difficultyLevel,
        })

        // Only increment the counter when we successfully get a word from the API
        await storage.incrementWordCallCount()

        // Update last API call time
        await storage.updateLastApiCallTime()

        // When we get a word back, we can determine which category it came from
        // and add only that category to the fetchedCategories list
        if (word && word.news && word.news.length > 0) {
          const wordCategories: string[] = []

          word.news.forEach((newsItem) => {
            if (newsItem.categories && Array.isArray(newsItem.categories)) {
              wordCategories.push(...newsItem.categories)
            }
          })

          // Filter to only include categories that were in our available list
          const usedCategories = wordCategories.filter((cat) =>
            categoriesToFetch.includes(cat),
          )

          if (usedCategories.length > 0) {
            // Update the fetched categories with the categories actually used
            await storage.updateFetchedCategories(usedCategories)
            console.log('Updated fetched categories with:', usedCategories)
          } else {
            // If we can't determine which category was used, assume the first one
            const fallbackCategory = categoriesToFetch[0]
            await storage.updateFetchedCategories([fallbackCategory])
            console.log(
              'Could not determine used category, marking as used:',
              fallbackCategory,
            )
          }
        }
      } catch (error) {
        console.error('Error fetching word from API:', error)
      }

      // If API call failed or no word returned, use last fetched word
      if (!word) {
        if (lastFetchedWord) {
          console.log('Using last fetched word due to API failure')
          set({ newWord: lastFetchedWord })
        } else {
          // Display error notification if no word available
          await storage.displayErrorNotification(
            'Failed to fetch a word. Please try again later.',
          )
          set({ newWord: null })
        }
        return
      }

      // Persist the new word
      await storage.saveWordToCache(word, categoriesToFetch)

      // Set the new word
      set({ newWord: word })
    } catch (error) {
      console.error('Error in fetchNewWord:', error)

      // Display error notification
      const storage = useStorageStore.getState()
      await storage.displayErrorNotification(
        'An unexpected error occurred. Please try again later.',
      )
    } finally {
      set({ isFetchingNewWord: false })
    }
  },
}))

export default useWordControllerStore
