import { IWord } from '@/app/models/word.ts'
import { create } from 'zustand/react'

interface IBookmarkedWordsController {
  words: IWord[]
  totalWords: number
  currentPage: number
  pageSize: number
  hasMore: boolean
  isLoading: boolean
  selectedCategory: string
  
  // Actions
  fetchBookmarkedWords: (page?: number, category?: string) => Promise<void>
  loadMore: () => Promise<void>
  setCategory: (category: string) => void
  reset: () => void
}

const useBookmarkedWordsController = create<IBookmarkedWordsController>((set, get) => ({
  words: [],
  totalWords: 0,
  currentPage: 1,
  pageSize: 10,
  hasMore: false,
  isLoading: false,
  selectedCategory: 'all',
  
  fetchBookmarkedWords: async (page = 1, category = 'all') => {
    set({ isLoading: true });
    
    try {
      // Calculate pagination parameters
      const pageSize = get().pageSize;
      const start = (page - 1) * pageSize;
      const limit = pageSize;
      
      // Send message to background script to get bookmarked words
      const response = await new Promise<{success: boolean, words: IWord[], total: number}>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'getBookmarkedWords',
            start,
            limit,
            category: category !== 'all' ? category : undefined
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else if (!response || !response.success) {
              reject(new Error(response?.error || 'Unknown error'));
            } else {
              resolve(response);
            }
          }
        );
      });
      
      // If it's the first page, replace the words array
      // Otherwise, append the new words to the existing array
      if (page === 1) {
        set({ 
          words: response.words,
          totalWords: response.total,
          currentPage: 1,
          hasMore: response.total > response.words.length
        });
      } else {
        set((state) => ({ 
          words: [...state.words, ...response.words],
          currentPage: page,
          hasMore: state.words.length + response.words.length < response.total
        }));
      }
    } catch (error) {
      console.error('Error fetching bookmarked words:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  loadMore: async () => {
    const { currentPage, selectedCategory } = get();
    await get().fetchBookmarkedWords(currentPage + 1, selectedCategory);
  },
  
  setCategory: (category: string) => {
    set({ selectedCategory: category });
    get().fetchBookmarkedWords(1, category);
  },
  
  reset: () => {
    set({
      words: [],
      totalWords: 0,
      currentPage: 1,
      hasMore: false,
      isLoading: false,
      selectedCategory: 'all'
    });
  }
}));

export default useBookmarkedWordsController;
