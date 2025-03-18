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
  return items[Math.floor(Math.random() * items.length)];
};

// Helper function to convert notification frequency to milliseconds
const convertFrequencyToMs = (frequency: NotificationFrequency): number => {
  if (frequency === '-') return 0; // No cooldown
  
  // Convert hours to milliseconds (1, 2, or 3 hours)
  return parseInt(frequency) * 60 * 60 * 1000;
};

// Helper function to filter out already fetched categories
const filterFetchedCategories = (selectedCategories: string[], fetchedCategories: string[]): string[] => {
  return selectedCategories.filter(category => !fetchedCategories.includes(category));
};

const useWordControllerStore = create<IWordController>((set) => ({
  newWord: null,
  isFetchingNewWord: false,
  fetchNewWord: async () => {
    set({ isFetchingNewWord: true });
    
    try {
      const storage = useStorageStore.getState();
      
      // Get the data controller settings
      const { getCategories, getDifficultyLevel, getNotificationFrequency, getMaxWordsPerDay } =
        useDataControllerStore.getState();
      
      // Load settings from storage
      await getCategories();
      await getDifficultyLevel();
      await getNotificationFrequency();
      await getMaxWordsPerDay();
      
      const { categories, difficultyLevel, notificationFrequency, maxWordsPerDay } = 
        useDataControllerStore.getState();
      
      // Get cache data to check current count
      const cache = await storage.getCachedWords();
      const totalCalled = cache ? cache.totalCalled : 0;
      
      // Check if we've exceeded max words per day
      if (totalCalled >= maxWordsPerDay) {
        if (cache && cache.words.length > 0) {
          // Return a random word from the cache
          const randomWord = getRandomItem(cache.words);
          set({ newWord: randomWord });
          return;
        }
        // If no cached words available, continue with fetching a new word
      }
      
      // Check last api called time
      const lastApiCallInfo = await storage.getLastApiCallInfo();
      const lastApiCallTime = lastApiCallInfo.time;
      const lastFetchedWord = lastApiCallInfo.word;
      const now = Date.now();
      const cooldownMs = convertFrequencyToMs(notificationFrequency);
      
      // If cooldown is active and we have a last fetched word, return it
      if (cooldownMs > 0 && lastFetchedWord && (now - lastApiCallTime < cooldownMs)) {
        console.log(`Using last fetched word due to cooldown (${notificationFrequency} hour)`);
        set({ newWord: lastFetchedWord });
        return;
      }
      
      // Get list of selected categories
      let selectedCategories = categories
        .filter((category) => category.isSelected)
        .map((category) => category.id);
      
      // Use default categories if none are selected
      selectedCategories = selectedCategories.length > 0
        ? selectedCategories
        : ['politics', 'technology', 'business'];
      
      // Get already fetched categories
      const fetchedCategories = await storage.getFetchedCategories();
      
      // Filter out already fetched categories
      let categoriesToFetch = filterFetchedCategories(selectedCategories, fetchedCategories);
      
      // If all categories have been fetched, use all selected categories
      if (categoriesToFetch.length === 0) {
        categoriesToFetch = selectedCategories;
      }
      
      console.log('Categories to fetch:', categoriesToFetch);
      
      // Fetch word from API
      let word: IWord | null = null;
      
      try {
        word = await fetchNewWordApi({
          categories: categoriesToFetch,
          level: difficultyLevel,
        });
        
        // Only increment the counter when we successfully get a word from the API
        await storage.incrementWordCallCount();
        
        // Update last API call time
        await storage.updateLastApiCallTime();
      } catch (error) {
        console.error('Error fetching word from API:', error);
      }
      
      // If API call failed or no word returned, use last fetched word
      if (!word) {
        if (lastFetchedWord) {
          console.log('Using last fetched word due to API failure');
          set({ newWord: lastFetchedWord });
        } else {
          // Display error notification if no word available
          await storage.displayErrorNotification('Failed to fetch a word. Please try again later.');
          set({ newWord: null });
        }
        return;
      }
      
      // Persist the new word
      await storage.saveWordToCache(word, categoriesToFetch);
      
      // Set the new word
      set({ newWord: word });
    } catch (error) {
      console.error('Error in fetchNewWord:', error);
      
      // Display error notification
      const storage = useStorageStore.getState();
      await storage.displayErrorNotification('An unexpected error occurred. Please try again later.');
    } finally {
      set({ isFetchingNewWord: false });
    }
  },
}))

export default useWordControllerStore