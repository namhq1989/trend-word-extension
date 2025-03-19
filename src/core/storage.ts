import { create } from 'zustand/react'
import { IWord } from '@/app/models/word.ts'

enum AuthProvider {
  extension = 'extension',
  google = 'google',
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'
export type NotificationFrequency = '1' | '2' | '3' | '-'

interface WordsCache {
  date: string
  words: IWord[]
  totalCalled: number
  lastApiCallTime: number // timestamp of the last API call
  lastFetchedWord: IWord | null // the last word fetched from API
  fetchedCategories: string[] // categories that have been fetched today
}

interface IStorage {
  saveUserData: (data: {
    userId: string
    authProvider: AuthProvider
    authToken: string
  }) => void

  saveSelectedLanguage: (id: string) => Promise<void>
  getSelectedLanguage: () => Promise<string>

  saveSelectedCategories: (categories: string[]) => Promise<void>
  getSelectedCategories: () => Promise<string[]>

  saveDifficultyLevel: (level: DifficultyLevel) => Promise<void>
  getDifficultyLevel: () => Promise<DifficultyLevel>

  saveSelectedDifficultyLevels: (levels: DifficultyLevel[]) => Promise<void>
  getSelectedDifficultyLevels: () => Promise<DifficultyLevel[]>

  saveNotificationFrequency: (frequency: NotificationFrequency) => Promise<void>
  getNotificationFrequency: () => Promise<NotificationFrequency>

  saveMaxWordsPerDay: (count: number) => Promise<void>
  getMaxWordsPerDay: () => Promise<number>

  saveWordToCache: (word: IWord, categories: string[]) => Promise<void>
  getCachedWords: () => Promise<WordsCache | null>
  incrementWordCallCount: () => Promise<number>
  updateLastApiCallTime: () => Promise<void>
  getLastApiCallInfo: () => Promise<{ time: number; word: IWord | null }>
  updateFetchedCategories: (categories: string[]) => Promise<string[]>
  getFetchedCategories: () => Promise<string[]>
  resetFetchedCategories: () => Promise<void>
  displayErrorNotification: (message: string) => Promise<void>
  
  toggleWordBookmark: (wordId: string, newStatus?: boolean, wordData?: IWord) => Promise<boolean>
  getWordBookmarkStatus: (wordId: string) => Promise<boolean>
}

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDateString = (): string => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Helper function to get or initialize cache
const getOrInitializeCache = (): Promise<WordsCache | null> => {
  return new Promise<WordsCache | null>((resolve, reject) => {
    chrome.storage.local.get('wordsCache', (result) => {
      if (chrome.runtime.lastError) {
        reject(null)
        return
      }

      const cache = result.wordsCache as WordsCache | undefined

      // If cache exists and is from today, return it
      if (cache && cache.date === getTodayDateString()) {
        resolve(cache)
      } else if (cache && cache.date !== getTodayDateString()) {
        // If cache is from a different day, return null
        resolve(null)
      } else {
        // If no cache exists, create a new one
        const newCache: WordsCache = {
          date: getTodayDateString(),
          words: [],
          totalCalled: 0,
          lastApiCallTime: 0,
          lastFetchedWord: null,
          fetchedCategories: [],
        }

        chrome.storage.local.set({ wordsCache: newCache }, () => {
          if (chrome.runtime.lastError) {
            reject(null)
          } else {
            resolve(newCache)
          }
        })
      }
    })
  })
}

// Initialize storage with all functions
const useStorageStore = create<IStorage>((_, get) => ({
  saveUserData: () => {},

  saveSelectedLanguage: (id: string) => {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ selectedLanguage: id }, () => {
        if (chrome.runtime.lastError) {
          reject()
        } else {
          resolve()
        }
      })
    })
  },
  getSelectedLanguage: () => {
    return new Promise<string>((resolve, reject) => {
      chrome.storage.local.get('selectedLanguage', (result) => {
        if (chrome.runtime.lastError) {
          reject('')
        } else {
          resolve(result.selectedLanguage || 'en')
        }
      })
    })
  },

  saveSelectedCategories: (categories: string[]) => {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ selectedCategories: categories }, () => {
        if (chrome.runtime.lastError) {
          reject()
        } else {
          resolve()
        }
      })
    })
  },
  getSelectedCategories: () => {
    return new Promise<string[]>((resolve, reject) => {
      chrome.storage.local.get('selectedCategories', (result) => {
        if (chrome.runtime.lastError) {
          reject([])
        } else {
          resolve(result.selectedCategories || [])
        }
      })
    })
  },

  saveDifficultyLevel: (level: DifficultyLevel) => {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ difficultyLevel: level }, () => {
        if (chrome.runtime.lastError) {
          reject()
        } else {
          resolve()
        }
      })
    })
  },

  getDifficultyLevel: () => {
    return new Promise<DifficultyLevel>((resolve, reject) => {
      chrome.storage.local.get('difficultyLevel', (result) => {
        if (chrome.runtime.lastError) {
          reject('beginner' as DifficultyLevel)
        } else {
          resolve((result.difficultyLevel || 'beginner') as DifficultyLevel)
        }
      })
    })
  },

  saveSelectedDifficultyLevels: (levels: DifficultyLevel[]) => {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ selectedDifficultyLevels: levels }, () => {
        if (chrome.runtime.lastError) {
          reject()
        } else {
          resolve()
        }
      })
    })
  },

  getSelectedDifficultyLevels: () => {
    return new Promise<DifficultyLevel[]>((resolve, reject) => {
      chrome.storage.local.get('selectedDifficultyLevels', (result) => {
        if (chrome.runtime.lastError) {
          reject([])
        } else {
          // If no levels are stored yet, return an empty array
          resolve(result.selectedDifficultyLevels || [])
        }
      })
    })
  },

  saveNotificationFrequency: (frequency: NotificationFrequency) => {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ notificationFrequency: frequency }, () => {
        if (chrome.runtime.lastError) {
          reject()
        } else {
          resolve()
        }
      })
    })
  },

  getNotificationFrequency: () => {
    return new Promise<NotificationFrequency>((resolve, reject) => {
      chrome.storage.local.get('notificationFrequency', (result) => {
        if (chrome.runtime.lastError) {
          reject('1' as NotificationFrequency)
        } else {
          resolve(
            (result.notificationFrequency || '1') as NotificationFrequency,
          )
        }
      })
    })
  },

  saveMaxWordsPerDay: (count: number) => {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ maxWordsPerDay: count }, () => {
        if (chrome.runtime.lastError) {
          reject()
        } else {
          resolve()
        }
      })
    })
  },

  getMaxWordsPerDay: () => {
    return new Promise<number>((resolve, reject) => {
      chrome.storage.local.get('maxWordsPerDay', (result) => {
        if (chrome.runtime.lastError) {
          reject(10)
        } else {
          resolve(result.maxWordsPerDay || 10)
        }
      })
    })
  },

  // Function to get or initialize the cache
  getCachedWords: () => {
    return getOrInitializeCache()
  },

  // Function to increment the total called count
  incrementWordCallCount: () => {
    return new Promise<number>((resolve, reject) => {
      getOrInitializeCache()
        .then((cache) => {
          if (!cache) {
            // Create new cache with totalCalled = 1
            const newCache: WordsCache = {
              date: getTodayDateString(),
              words: [],
              totalCalled: 1,
              lastApiCallTime: 0,
              lastFetchedWord: null,
              fetchedCategories: [],
            }

            chrome.storage.local.set({ wordsCache: newCache }, () => {
              if (chrome.runtime.lastError) {
                reject(0)
              } else {
                resolve(1)
              }
            })
          } else {
            // Increment existing cache
            cache.totalCalled += 1

            chrome.storage.local.set({ wordsCache: cache }, () => {
              if (chrome.runtime.lastError) {
                reject(0)
              } else {
                resolve(cache.totalCalled)
              }
            })
          }
        })
        .catch((error) => {
          console.error('Error in incrementWordCallCount:', error)
          reject(0)
        })
    })
  },

  // Function to update the last API call time and word
  updateLastApiCallTime: () => {
    return new Promise<void>((resolve, reject) => {
      get()
        .getCachedWords()
        .then((cache) => {
          if (!cache) {
            reject()
            return
          }

          cache.lastApiCallTime = Date.now()

          chrome.storage.local.set({ wordsCache: cache }, () => {
            if (chrome.runtime.lastError) {
              reject()
            } else {
              resolve()
            }
          })
        })
        .catch((error) => {
          console.error('Error in updateLastApiCallTime:', error)
          reject()
        })
    })
  },

  // Function to get the last API call information
  getLastApiCallInfo: () => {
    return new Promise<{ time: number; word: IWord | null }>((resolve) => {
      get()
        .getCachedWords()
        .then((cache) => {
          if (!cache) {
            resolve({ time: 0, word: null })
            return
          }

          resolve({
            time: cache.lastApiCallTime,
            word: cache.lastFetchedWord,
          })
        })
        .catch(() => {
          resolve({ time: 0, word: null })
        })
    })
  },

  // Function to save a word to the cache and update lastFetchedWord
  saveWordToCache: (word: IWord, categories: string[]) => {
    return new Promise<void>((resolve, reject) => {
      get()
        .getCachedWords()
        .then((cache) => {
          if (!cache) {
            reject()
            return
          }

          // Add word to the cache if it doesn't already exist
          const wordExists = cache.words.some((w) => w.id === word.id)

          if (!wordExists) {
            cache.words.push(word)
          }

          // Update the last fetched word
          cache.lastFetchedWord = word

          // Update the last API call time
          cache.lastApiCallTime = Date.now()

          // Update fetched categories
          const existingCategories = new Set(cache.fetchedCategories)
          categories.forEach((category) => existingCategories.add(category))
          cache.fetchedCategories = Array.from(existingCategories)

          chrome.storage.local.set({ wordsCache: cache }, () => {
            if (chrome.runtime.lastError) {
              reject()
            } else {
              // Also add to IndexedDB through background.js
              try {
                chrome.runtime.sendMessage({
                  action: 'addWordToDatabase',
                  word: word,
                })
              } catch (err) {
                console.error('Error sending message to background.js:', err)
              }

              resolve()
            }
          })
        })
        .catch((error) => {
          console.error('Error in saveWordToCache:', error)
          reject()
        })
    })
  },

  // Function to update fetched categories
  updateFetchedCategories: (categories: string[]) => {
    return new Promise<string[]>((resolve, reject) => {
      get()
        .getCachedWords()
        .then((cache) => {
          if (!cache) {
            resolve([])
            return
          }

          // Update fetched categories
          const existingCategories = new Set(cache.fetchedCategories)
          categories.forEach((category) => existingCategories.add(category))
          cache.fetchedCategories = Array.from(existingCategories)

          chrome.storage.local.set({ wordsCache: cache }, () => {
            if (chrome.runtime.lastError) {
              reject([])
            } else {
              resolve(cache.fetchedCategories)
            }
          })
        })
        .catch((error) => {
          console.error('Error in updateFetchedCategories:', error)
          reject([])
        })
    })
  },

  // Function to get fetched categories
  getFetchedCategories: () => {
    return new Promise<string[]>((resolve) => {
      get()
        .getCachedWords()
        .then((cache) => {
          if (!cache) {
            resolve([])
            return
          }
          resolve(cache.fetchedCategories)
        })
        .catch((error) => {
          console.error('Error in getFetchedCategories:', error)
          resolve([])
        })
    })
  },

  // Function to reset fetched categories
  resetFetchedCategories: () => {
    return new Promise<void>((resolve, reject) => {
      get()
        .getCachedWords()
        .then((cache) => {
          if (!cache) {
            resolve()
            return
          }
          
          // Reset the fetchedCategories array
          cache.fetchedCategories = []
          
          chrome.storage.local.set({ wordsCache: cache }, () => {
            if (chrome.runtime.lastError) {
              console.error('Error resetting fetched categories:', chrome.runtime.lastError)
              reject()
            } else {
              console.log('Fetched categories reset successfully')
              resolve()
            }
          })
        })
        .catch((error) => {
          console.error('Error in resetFetchedCategories:', error)
          reject()
        })
    })
  },

  // Function to display an error notification
  displayErrorNotification: (message: string) => {
    return new Promise<void>((resolve) => {
      try {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'assets/icons/icon48.png',
          title: 'Word Fetching Error',
          message: message,
        })
      } catch (error) {
        console.error('Error displaying notification:', error)
      }
      resolve()
    })
  },

  // Function to toggle bookmark status for a word
  toggleWordBookmark: (wordId: string, newStatus?: boolean, wordData?: IWord) => {
    return new Promise<boolean>((resolve, reject) => {
      // First, check the current bookmark status if newStatus is not provided
      const getStatus: Promise<boolean> = newStatus !== undefined 
        ? Promise.resolve(newStatus) 
        : get().getWordBookmarkStatus(wordId).then(status => !status); // Toggle if not provided
      
      getStatus.then((bookmarkStatus: boolean) => {
          // Send message to background script to update the word in IndexedDB
          chrome.runtime.sendMessage(
            {
              action: 'toggleWordBookmark',
              wordId,
              bookmarked: bookmarkStatus,
              wordData // Pass the complete word data if available
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error('Error toggling bookmark:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
              } else if (!response || !response.success) {
                console.error('Error toggling bookmark:', response?.error || 'Unknown error');
                reject(new Error(response?.error || 'Unknown error'));
              } else {
                // Also update the word in cache if it exists
                get().getCachedWords().then(cache => {
                  if (cache) {
                    const updatedWords = cache.words.map(word => {
                      if (word.id === wordId) {
                        return { ...word, bookmarked: bookmarkStatus };
                      }
                      return word;
                    });
                    
                    // Update the cache with the new words array
                    chrome.storage.local.set({
                      wordsCache: { ...cache, words: updatedWords }
                    }, () => {
                      if (chrome.runtime.lastError) {
                        console.error('Error updating cache:', chrome.runtime.lastError);
                      }
                    });
                    
                    // If the last fetched word is the one being bookmarked, update it too
                    if (cache.lastFetchedWord && cache.lastFetchedWord.id === wordId) {
                      const updatedLastFetchedWord = { ...cache.lastFetchedWord, bookmarked: bookmarkStatus };
                      chrome.storage.local.set({
                        wordsCache: { ...cache, lastFetchedWord: updatedLastFetchedWord }
                      });
                    }
                  }
                });
                
                resolve(bookmarkStatus);
              }
            }
          );
        })
        .catch(error => {
          console.error('Error getting bookmark status:', error);
          reject(error);
        });
    });
  },

  // Function to get bookmark status for a word
  getWordBookmarkStatus: (wordId: string) => {
    return new Promise<boolean>((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'getWordBookmarkStatus',
          wordId
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error getting bookmark status:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else if (!response || !response.success) {
            console.error('Error getting bookmark status:', response?.error || 'Unknown error');
            reject(new Error(response?.error || 'Unknown error'));
          } else {
            resolve(response.bookmarked || false);
          }
        }
      );
    });
  },
}))

export default useStorageStore