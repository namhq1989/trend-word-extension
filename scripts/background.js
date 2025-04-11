// Constants
const NOTIFICATION_ALARM_NAME = 'wordDropNotification'
const WORD_FETCH_ALARM_NAME = 'wordDropFetch'
const DEFAULT_NOTIFICATION_FREQUENCY = '30' // every 30 minutes
const WORD_FETCH_INTERVAL_MINUTES_DEV = 1 // fetch new words every minute in development
const WORD_FETCH_INTERVAL_MINUTES_RELEASE = 20 // fetch new words every 20 minutes in release
const DB_NAME = 'WordDropDB'
const DB_VERSION = 1
const WORDS_STORE_NAME = 'words'

// IndexedDB setup
let db = null

// Initialize the IndexedDB
function initializeDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event.target.error)
      reject(event.target.error)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // Create object store for words if it doesn't exist
      if (!db.objectStoreNames.contains(WORDS_STORE_NAME)) {
        const store = db.createObjectStore(WORDS_STORE_NAME, { keyPath: 'id' })

        // Create indexes for searching
        store.createIndex('word', 'word', { unique: false })
        store.createIndex('level', 'level', { unique: false })
        store.createIndex('date', 'date', { unique: false })
      }
    }

    request.onsuccess = (event) => {
      db = event.target.result
      // console.log('IndexedDB initialized successfully')
      resolve(db)
    }
  })
}

// Helper function to get environment from storage with fallback
function getEnvironment() {
  return new Promise((resolve) => {
    chrome.storage.local.get('env', (result) => {
      const env = result.env || 'release' // Default to release if not set
      // console.log(`Using environment: ${env}`)
      resolve(env)
    })
  })
}

// Helper function to get API host from storage with fallback
function getApiHost() {
  return new Promise((resolve) => {
    chrome.storage.local.get('apiHost', (result) => {
      const apiHost = result.apiHost || 'wd.bapbi.app' // Default to production API if not set
      // console.log(`Using API host: ${apiHost}`)
      resolve(apiHost)
    })
  })
}

// Add a word to the IndexedDB
function addWordToDatabase(word) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'))
      return
    }

    // Extract unique categories from news items
    if (word.news && word.news.length > 0) {
      // console.log('Word has news items in addWordToDatabase:', word.news.length)

      const categoriesSet = new Set()
      word.news.forEach((newsItem) => {
        // Check for categories field in news items (which is the correct field according to IWordNews)
        if (newsItem.categories && Array.isArray(newsItem.categories)) {
          // console.log(
          //   'Found categories array in news item:',
          //   newsItem.categories,
          // )
          newsItem.categories.forEach((cat) => categoriesSet.add(cat))
        }
        // Also check for category field as fallback
        else if (newsItem.category) {
          // console.log('Found category in news item:', newsItem.category)
          categoriesSet.add(newsItem.category)
        }
      })

      word.categories = Array.from(categoriesSet)
    }

    const transaction = db.transaction([WORDS_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(WORDS_STORE_NAME)
    const request = store.put(word) // Using put instead of add to handle updates

    request.onerror = (event) => {
      // console.error('Error adding word to IndexedDB:', event.target.error)
      reject(event.target.error)
    }

    request.onsuccess = () => {
      // console.log('Word added to IndexedDB successfully')
      resolve()
    }
  })
}

// Get all words from the IndexedDB
function getAllWords() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'))
      return
    }

    const transaction = db.transaction([WORDS_STORE_NAME], 'readonly')
    const store = transaction.objectStore(WORDS_STORE_NAME)
    const request = store.getAll()

    request.onerror = (event) => {
      // console.error('Error getting words from IndexedDB:', event.target.error)
      reject(event.target.error)
    }

    request.onsuccess = () => {
      // console.log(`Retrieved ${request.result.length} words from IndexedDB`)
      resolve(request.result)
    }
  })
}

// Get words with pagination and category filtering
function getWords(start = 0, limit = 10, category) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'))
      return
    }

    const transaction = db.transaction([WORDS_STORE_NAME], 'readonly')
    const store = transaction.objectStore(WORDS_STORE_NAME)
    const request = store.getAll()

    request.onerror = (event) => {
      // console.error('Error getting words from IndexedDB:', event.target.error)
      reject(event.target.error)
    }

    request.onsuccess = () => {
      let allWords = request.result

      // Apply category filter if specified
      if (category) {
        allWords = allWords.filter((word) => {
          // Check if the word has categories array
          if (word.categories && Array.isArray(word.categories)) {
            return word.categories.includes(category)
          }
          // Fallback to checking news items directly if categories array is not available
          else if (word.news && Array.isArray(word.news)) {
            return word.news.some((newsItem) => newsItem.category === category)
          }
          // Legacy support for old word.category property
          else if (word.category) {
            return word.category === category
          }
          return false
        })
      }

      // Sort by date (newest first)
      allWords.sort((a, b) => {
        const dateA = new Date(a.date || 0)
        const dateB = new Date(b.date || 0)
        return dateB - dateA
      })

      // Get total count before pagination
      const total = allWords.length

      // Apply pagination
      const paginatedWords = allWords.slice(start, start + limit)

      // console.log(
      //   `Retrieved ${paginatedWords.length} words from IndexedDB (total: ${total})`,
      // )
      resolve({ words: paginatedWords, total })
    }
  })
}

// Get bookmarked words from IndexedDB with pagination and category filtering
function getBookmarkedWords(start = 0, limit = 10, category) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'))
      return
    }

    const transaction = db.transaction([WORDS_STORE_NAME], 'readonly')
    const store = transaction.objectStore(WORDS_STORE_NAME)
    const request = store.getAll()

    request.onerror = (event) => {
      // console.error(
      //   'Error getting bookmarked words from IndexedDB:',
      //   event.target.error,
      // )
      reject(event.target.error)
    }

    request.onsuccess = () => {
      // Filter words that are bookmarked
      let bookmarkedWords = request.result.filter(
        (word) => word.bookmarked === true,
      )

      // Apply category filter if specified
      if (category) {
        bookmarkedWords = bookmarkedWords.filter((word) => {
          // Check if the word has categories array
          if (word.categories && Array.isArray(word.categories)) {
            return word.categories.includes(category)
          }
          // Fallback to checking news items directly if categories array is not available
          else if (word.news && Array.isArray(word.news)) {
            return word.news.some((newsItem) => newsItem.category === category)
          }
          // Legacy support for old word.category property
          else if (word.category) {
            return word.category === category
          }
          return false
        })
      }

      // Sort by date (newest first)
      bookmarkedWords.sort((a, b) => {
        const dateA = new Date(a.date || 0)
        const dateB = new Date(b.date || 0)
        return dateB - dateA
      })

      // Get total count before pagination
      const total = bookmarkedWords.length

      // Apply pagination
      const paginatedWords = bookmarkedWords.slice(start, start + limit)

      // console.log(
      //   `Retrieved ${paginatedWords.length} bookmarked words from IndexedDB (total: ${total})`,
      // )
      resolve({ words: paginatedWords, total })
    }
  })
}

// Toggle bookmark status for a word in IndexedDB
function toggleWordBookmark(wordId, bookmarked, wordData = null) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'))
      return
    }

    // First, get the word from the database
    const transaction = db.transaction([WORDS_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(WORDS_STORE_NAME)
    const request = store.get(wordId)

    request.onerror = (event) => {
      // console.error('Error getting word from IndexedDB:', event.target.error)
      reject(event.target.error)
    }

    request.onsuccess = () => {
      const word = request.result

      if (!word) {
        // If word doesn't exist in IndexedDB yet
        if (wordData) {
          // If word data was provided, use it
          wordData.bookmarked = bookmarked

          const addRequest = store.add(wordData)

          addRequest.onerror = (event) => {
            // console.error(
            //   'Error adding new bookmarked word to IndexedDB:',
            //   event.target.error,
            // )
            reject(event.target.error)
          }

          addRequest.onsuccess = () => {
            // console.log('New bookmarked word added to IndexedDB successfully')
            resolve(bookmarked)
          }
        } else {
          // If no word data was provided, check local storage cache
          chrome.storage.local.get(['cachedWords'], (result) => {
            const cachedWords = result.cachedWords || {}
            const cachedWord = cachedWords[wordId]

            if (cachedWord) {
              // Use the cached word data and add bookmark status
              cachedWord.bookmarked = bookmarked

              const addRequest = store.add(cachedWord)

              addRequest.onerror = (event) => {
                // console.error(
                //   'Error adding new bookmarked word to IndexedDB:',
                //   event.target.error,
                // )
                reject(event.target.error)
              }

              addRequest.onsuccess = () => {
                // console.log(
                //   'New bookmarked word added to IndexedDB successfully',
                // )
                resolve(bookmarked)
              }
            }
          })
        }
      } else {
        // Update the existing word with new bookmark status
        word.bookmarked = bookmarked

        const updateRequest = store.put(word)

        updateRequest.onerror = (event) => {
          // console.error(
          //   'Error updating word bookmark status in IndexedDB:',
          //   event.target.error,
          // )
          reject(event.target.error)
        }

        updateRequest.onsuccess = () => {
          // console.log(
          //   `Word bookmark status updated to ${bookmarked} in IndexedDB successfully`,
          // )
          resolve(bookmarked)
        }
      }
    }
  })
}

// Get bookmark status for a word from IndexedDB
function getWordBookmarkStatus(wordId) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'))
      return
    }

    const transaction = db.transaction([WORDS_STORE_NAME], 'readonly')
    const store = transaction.objectStore(WORDS_STORE_NAME)
    const request = store.get(wordId)

    request.onerror = (event) => {
      // console.error('Error getting word from IndexedDB:', event.target.error)
      reject(event.target.error)
    }

    request.onsuccess = () => {
      const word = request.result

      if (!word) {
        // Word not found in database, so it's not bookmarked
        resolve(false)
      } else {
        // Return the bookmark status (or false if not set)
        resolve(word.bookmarked || false)
      }
    }
  })
}

// Get the latest word from IndexedDB
// If forceNew is true, try to get a different word than the current one
// If forceNew is false, just return the current word from storage if available
function getLatestWord(forceNew = false) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'))
      return
    }

    // Get the current word from storage
    chrome.storage.local.get('currentWord', async (result) => {
      const currentWord = result.currentWord || null

      // If we're not forcing a new word and we have a current word, just return it
      if (!forceNew && currentWord) {
        // console.log('Returning current word from storage:', currentWord.word);
        resolve(currentWord)
        return
      }

      // Define a cutoff date (e.g., 7 days ago)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 3)
      // console.log('Using cutoff date for recent words:', cutoffDate.toISOString());

      // Maximum number of recent words to retrieve
      const maxWordsToRetrieve = 20

      // Use a transaction and get the date index
      const transaction = db.transaction([WORDS_STORE_NAME], 'readonly')
      const store = transaction.objectStore(WORDS_STORE_NAME)
      const dateIndex = store.index('date')

      // Open cursor on the date index in reverse order (newest first)
      const request = dateIndex.openCursor(null, 'prev')

      // Array to hold recent words
      const recentWords = []

      request.onerror = (event) => {
        // console.error('Error getting words from IndexedDB:', event.target.error);
        reject(event.target.error)
      }

      request.onsuccess = (event) => {
        const cursor = event.target.result

        if (cursor && recentWords.length < maxWordsToRetrieve) {
          const wordDate = new Date(cursor.value.date || 0)

          // Only include words newer than the cutoff date
          if (wordDate >= cutoffDate) {
            recentWords.push(cursor.value)
            // console.log(`Added recent word: ${cursor.value.word}, date: ${wordDate.toISOString()}`);
          }

          cursor.continue()
        } else {
          // If no recent words found within cutoff, get at least one most recent word
          if (recentWords.length === 0) {
            // console.log('No words found within date range, falling back to most recent word');

            // Create a new request to get the most recent word regardless of date
            const fallbackRequest = dateIndex.openCursor(null, 'prev')

            fallbackRequest.onsuccess = (fallbackEvent) => {
              const fallbackCursor = fallbackEvent.target.result

              if (fallbackCursor) {
                recentWords.push(fallbackCursor.value)
                // console.log(`Added fallback word: ${fallbackCursor.value.word}`);
                processRecentWords()
              } else {
                // No words at all in the database
                // console.log('No words found in database');
                resolve(null)
              }
            }

            fallbackRequest.onerror = (fallbackEvent) => {
              // console.error('Error in fallback request:', fallbackEvent.target.error);
              reject(fallbackEvent.target.error)
            }
          } else {
            // Process the words we've collected
            processRecentWords()
          }
        }
      }

      // Function to process the collected recent words
      function processRecentWords() {
        if (recentWords.length === 0) {
          // No words found at all
          resolve(null)
          return
        }

        // By default, use the most recent word
        let selectedWord = recentWords[0]

        // If we have a current word and it matches the most recent word, try to find a different one
        if (
          forceNew &&
          currentWord &&
          currentWord.id === selectedWord.id &&
          recentWords.length > 1
        ) {
          // console.log('Current word matches most recent word, trying to find a different one');

          // Create an array of candidate words (excluding the current word)
          const candidateWords = recentWords.filter(
            (word) => word.id !== currentWord.id,
          )

          if (candidateWords.length > 0) {
            // Select a random word from candidates
            selectedWord =
              candidateWords[Math.floor(Math.random() * candidateWords.length)]
            // console.log(`Selected different word: ${selectedWord.word}`);
          } else {
            // console.log('No alternative words available, using most recent word');
          }
        }

        // Store the selected word as the current word
        chrome.storage.local.set({ currentWord: selectedWord })

        // Notify any open popups about the new word
        // console.log('[BACKGROUND] Sending wordUpdated message with word:', selectedWord.word);
        chrome.runtime
          .sendMessage({
            action: 'wordUpdated',
            word: selectedWord,
          })
          .then(() => {
            // console.log('[BACKGROUND] Successfully sent wordUpdated message');
          })
          .catch((error) => {
            // This error is expected if no popup is open to receive the message
            // if (!error.message.includes('Could not establish connection')) {
            //   console.error('[BACKGROUND] Error sending word update message:', error);
            // } else {
            //   console.log('[BACKGROUND] No popup open to receive message (expected)');
            // }
          })

        // Return the selected word
        resolve(selectedWord)
      }
    })
  })
}

// Get the remaining time until the next notification
function getNextNotificationTime() {
  return new Promise((resolve, reject) => {
    chrome.alarms.get(NOTIFICATION_ALARM_NAME, (alarm) => {
      if (chrome.runtime.lastError) {
        // console.error('Error getting alarm:', chrome.runtime.lastError)
        reject(chrome.runtime.lastError)
        return
      }

      if (!alarm) {
        // No alarm set
        resolve(null)
        return
      }

      const now = Date.now()
      const nextAlarmTime = alarm.scheduledTime
      const remainingMs = Math.max(0, nextAlarmTime - now)

      resolve({
        scheduledTime: nextAlarmTime,
        remainingMs: remainingMs,
        periodInMinutes: alarm.periodInMinutes,
      })
    })
  })
}

// Helper function to get a random item from an array
const getRandomItem = (items) => {
  return items[Math.floor(Math.random() * items.length)]
}

// Helper function to convert notification frequency to milliseconds
const convertFrequencyToMs = (frequency) => {
  if (frequency === '-') return 0 // No cooldown

  const freqNumber = parseInt(frequency)

  // Get environment from storage
  return new Promise((resolve) => {
    chrome.storage.local.get('environment', (result) => {
      const env = result.environment || 'release'

      if (env === 'develop') {
        // In development mode, use a shorter interval for faster testing
        // console.log(
        //   `Development mode: using ${freqNumber / 10} minutes instead of ${freqNumber} minutes`,
        // )
        resolve((freqNumber / 10) * 60 * 1000) // convert to milliseconds with reduced time for testing
      } else {
        // In release mode, use minutes as normal
        // console.log(`Release mode: using ${freqNumber} minutes`)
        resolve(freqNumber * 60 * 1000) // convert minutes to milliseconds
      }
    })
  })
}

// Helper function to filter out already fetched categories
const filterFetchedCategories = (selectedCategories, fetchedCategories) => {
  return selectedCategories.filter(
    (category) => !fetchedCategories.includes(category),
  )
}

// Function to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Function to fetch a new word from the API
async function fetchNewWord() {
  // console.log('Fetching new word from background script')

  try {
    // Get necessary data from storage
    const storageData = await new Promise((resolve) => {
      chrome.storage.local.get(
        [
          'selectedDifficultyLevels',
          'selectedCategories',
          'notificationFrequency',
          'maxWordsPerDay',
          'wordsCache',
        ],
        (result) => {
          resolve(result)
        },
      )
    })

    const difficultyLevels = storageData.selectedDifficultyLevels || []
    const categories = storageData.selectedCategories || []
    const notificationFrequency = storageData.notificationFrequency || '1'
    const maxWordsPerDay = storageData.maxWordsPerDay || 10
    const cache = storageData.wordsCache || {
      date: getTodayDateString(),
      words: [],
      totalCalled: 0,
      lastApiCallTime: 0,
      lastFetchedWord: null,
      fetchedCategories: [],
    }

    // Check if the date has changed since last time
    const todayDateString = getTodayDateString()
    const cacheDate = cache.date || todayDateString

    // Reset counter if it's a new day
    if (cacheDate !== todayDateString) {
      // console.log('New day detected, resetting word counter')
      cache.date = todayDateString
      cache.totalCalled = 0

      // Save the updated cache with reset counter
      await new Promise((resolve) => {
        chrome.storage.local.set({ wordsCache: cache }, resolve)
      })
    }

    // Check if we've exceeded max words per day
    const totalCalled = cache.totalCalled || 0
    if (totalCalled >= maxWordsPerDay) {
      if (cache.words && cache.words.length > 0) {
        // Return a random word from the cache
        const randomWord = getRandomItem(cache.words)
        return randomWord
      }
      // If no cached words available, continue with fetching a new word
    }

    // Check last api called time
    const lastApiCallTime = cache.lastApiCallTime || 0
    const lastFetchedWord = cache.lastFetchedWord || null
    const now = Date.now()
    const cooldownMs = await convertFrequencyToMs(notificationFrequency)

    // Debug time checks
    // console.log('Cooldown milliseconds:', cooldownMs)
    // console.log(
    //   'Last API call time:',
    //   new Date(lastApiCallTime).toLocaleString(),
    // )
    // console.log('Current time:', new Date(now).toLocaleString())
    // console.log('Time difference (ms):', now - lastApiCallTime)
    // console.log('Should use cache?', now - lastApiCallTime < cooldownMs)

    // If cooldown is active and we have a last fetched word, return it
    if (
      cooldownMs > 0 &&
      lastFetchedWord &&
      now - lastApiCallTime < cooldownMs
    ) {
      const env = await new Promise((resolve) => {
        chrome.storage.local.get('environment', (result) => {
          resolve(result.environment || 'release')
        })
      })
      const unit = env === 'develop' ? 'minute' : 'hour'
      // console.log(
      //   `Using last fetched word due to cooldown (${notificationFrequency} ${unit})`,
      // )
      return lastFetchedWord
    }

    // console.log('Cooldown expired or no previous word, fetching new word...')

    // Get list of selected categories
    let selectedCategories =
      categories.length > 0
        ? categories
        : [
            'politics',
            'technology',
            'business',
            'science',
            'health',
            'sports',
            'entertainment',
            'world',
            'education',
          ]

    // Get already fetched categories
    const fetchedCategories = cache.fetchedCategories || []

    // Filter out already fetched categories
    let categoriesToFetch = filterFetchedCategories(
      selectedCategories,
      fetchedCategories,
    )

    // If all categories have been fetched, reset the fetchedCategories list
    // and use all selected categories again
    if (categoriesToFetch.length === 0) {
      // console.log('All categories have been used, resetting...')
      // Reset fetchedCategories in cache
      cache.fetchedCategories = []
      await new Promise((resolve) => {
        chrome.storage.local.set({ wordsCache: cache }, resolve)
      })
      categoriesToFetch = selectedCategories
    }

    // console.log('Categories available for fetch:', categoriesToFetch)

    // Get selected difficulty levels
    const allLevels = ['beginner', 'intermediate', 'advanced']
    const levelsToUse =
      difficultyLevels.length > 0 ? difficultyLevels : allLevels

    // console.log('Using difficulty levels:', levelsToUse)

    // Get API host with fallback to production URL
    const apiBaseUrl = await getApiHost()

    // Build query parameters
    const queryParams = new URLSearchParams()
    if (categoriesToFetch.length > 0) {
      queryParams.append('categories', categoriesToFetch.join(','))
    }
    if (levelsToUse.length > 0) {
      queryParams.append('levels', levelsToUse.join(','))
    }

    // Make the API request
    const url = `${apiBaseUrl}/api/word/new?${queryParams.toString()}`
    // console.log('Fetching word from URL:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      // Reset fetchedCategories when API call fails
      cache.fetchedCategories = []
      await new Promise((resolve) => {
        chrome.storage.local.set({ wordsCache: cache }, resolve)
      })
      // console.log('API call failed, reset fetchedCategories to empty array')
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    const word = data.data.word

    if (!word) {
      // Reset fetchedCategories when no word is returned
      cache.fetchedCategories = []
      await new Promise((resolve) => {
        chrome.storage.local.set({ wordsCache: cache }, resolve)
      })
      // console.log('No word returned from API, reset fetchedCategories to empty array')

      if (lastFetchedWord) {
        // console.log('Using last fetched word due to API failure')
        return lastFetchedWord
      }
      throw new Error('No word returned from API')
    }

    // Update cache information
    const updatedCache = {
      ...cache,
      date: getTodayDateString(), // Ensure date is always current
      totalCalled: (cache.totalCalled || 0) + 1,
      lastApiCallTime: Date.now(),
      lastFetchedWord: word,
    }

    // If word has news items, extract categories
    if (word.news && word.news.length > 0) {
      const wordCategories = []

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
        updatedCache.fetchedCategories = [
          ...(cache.fetchedCategories || []),
          ...usedCategories,
        ]
        // console.log('Updated fetched categories with:', usedCategories)
      } else {
        // If we can't determine which category was used, assume the first one
        const fallbackCategory = categoriesToFetch[0]
        updatedCache.fetchedCategories = [
          ...(cache.fetchedCategories || []),
          fallbackCategory,
        ]
        // console.log(
        //   'Could not determine used category, marking as used:',
        //   fallbackCategory,
        // )
      }
    }

    // Add word to cache
    if (!updatedCache.words) {
      updatedCache.words = []
    }

    // Check if word already exists in cache
    const wordExists = updatedCache.words.some((w) => w.id === word.id)
    if (!wordExists) {
      updatedCache.words.push(word)
    }

    // Save updated cache
    await new Promise((resolve) => {
      chrome.storage.local.set({ wordsCache: updatedCache }, resolve)
    })

    // Also add to IndexedDB
    await addWordToDatabase(word)

    return word
  } catch (error) {
    // console.error('Error fetching new word:', error)

    // Try to get the last fetched word from cache
    const cache = await new Promise((resolve) => {
      chrome.storage.local.get('wordsCache', (result) => {
        resolve(result.wordsCache || null)
      })
    })

    // Reset fetchedCategories when an error occurs
    if (cache) {
      cache.fetchedCategories = []
      await new Promise((resolve) => {
        chrome.storage.local.set({ wordsCache: cache }, resolve)
      })
      // console.log('Error occurred, reset fetchedCategories to empty array')
    }

    if (cache && cache.lastFetchedWord) {
      return cache.lastFetchedWord
    }

    return null
  }
}

async function getInitialWords() {
  try {
    // Get API host
    const apiHost = await getApiHost()
    const url = `${apiHost}/api/word/initial`

    // Fetch initial words
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`Initial API call failed: ${response.status}`)
      return null // Return null if API call fails
    }

    const data = await response.json()
    const words = data.data.words || []

    if (!words || words.length === 0) {
      console.warn('No words returned from initial API')
      return null
    }

    // Sort words by date (newest first)
    words.sort((a, b) => {
      const dateA = new Date(a.date || 0)
      const dateB = new Date(b.date || 0)
      return dateB - dateA // Descending order (newest first)
    })

    // Add all words to IndexedDB
    for (const word of words) {
      await addWordToDatabase(word)
    }

    // Mark setup as completed in storage
    await new Promise((resolve) => {
      chrome.storage.local.set({ initialSetupCompleted: true }, resolve)
    })

    // Return the first word from the sorted array
    return words[0]
  } catch (error) {
    console.error('Error during initial setup:', error)
    return null
  }
}

// Initialize the extension
chrome.runtime.onInstalled.addListener(async (details) => {
  await initializeDB()
  // Set up default alarm for notifications
  setupDefaultAlarm()
  // Set up word fetching interval
  setupWordFetchingInterval()

  if (details.reason === 'install') {
    await new Promise((resolve) => {
      chrome.storage.local.set({ needInitialWordsFetch: true }, resolve)
    })
  }
})

// Setup default alarm for notifications
function setupDefaultAlarm() {
  chrome.alarms.get(NOTIFICATION_ALARM_NAME, (alarm) => {
    if (!alarm) {
      createNotificationAlarm(DEFAULT_NOTIFICATION_FREQUENCY)
    }
  })
}

// Setup interval to fetch new words periodically
async function setupWordFetchingInterval() {
  // console.log('Setting up word fetching interval')

  // Fetch a word immediately on startup
  fetchNewWord()
    .then((word) => {
      if (word) {
        // console.log('Successfully fetched initial word:', word.word)
      } else {
        // console.warn('Failed to fetch initial word')
      }
    })
    .catch((error) => {
      // console.error('Error fetching initial word:', error)
    })

  // Get environment from storage to determine interval
  const env = await getEnvironment()
  const intervalMinutes =
    env === 'develop'
      ? WORD_FETCH_INTERVAL_MINUTES_DEV
      : WORD_FETCH_INTERVAL_MINUTES_RELEASE

  // console.log(`Environment: ${env}, using interval of ${intervalMinutes} minute(s)`)

  // Set up an alarm to fetch new words based on environment
  chrome.alarms.get(WORD_FETCH_ALARM_NAME, (alarm) => {
    // Clear any existing alarm first to ensure we use the correct interval
    chrome.alarms.clear(WORD_FETCH_ALARM_NAME, () => {
      // Create a new alarm with the appropriate interval
      chrome.alarms.create(WORD_FETCH_ALARM_NAME, {
        periodInMinutes: intervalMinutes,
      })
      // console.log(`Created word fetch alarm to run every ${intervalMinutes} minute(s)`)
    })
  })
}

// Create an alarm based on notification frequency
async function createNotificationAlarm(frequency) {
  // If frequency is set to never (-), just clear any existing alarm and return
  if (frequency === '-') {
    // console.log('Notification frequency set to never (-), clearing alarm')
    chrome.alarms.clear(NOTIFICATION_ALARM_NAME)
    return
  }

  // Parse frequency to minutes
  const minutes = parseInt(frequency)
  const env = await getEnvironment()
  // console.log(`${env === 'develop' ? 'Development' : 'Release'} mode: setting alarm to ${minutes} minutes`)

  // Clear any existing alarm first
  chrome.alarms.clear(NOTIFICATION_ALARM_NAME, () => {
    // Create a new repeating alarm
    chrome.alarms.create(NOTIFICATION_ALARM_NAME, {
      periodInMinutes: minutes,
    })
  })
}

// Listen for alarm trigger
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === NOTIFICATION_ALARM_NAME) {
    // Get current word first to compare
    const currentWord = await new Promise((resolve) => {
      chrome.storage.local.get('currentWord', (result) => {
        resolve(result.currentWord || null)
      })
    })

    // Use fetchNewWord directly to ensure we get a fresh word from the API
    // console.log('Notification alarm triggered, fetching a new word from API');
    let newWord = await fetchNewWord()

    // If we somehow got the same word back, try with getLatestWord as a fallback
    if (currentWord && newWord && currentWord.id === newWord.id) {
      // console.log(`Notification alarm: Got same word from API (${newWord.word}), trying with IndexedDB`);

      // Try to get a different word from IndexedDB
      let attempts = 0
      const maxAttempts = 5

      while (
        currentWord &&
        newWord &&
        currentWord.id === newWord.id &&
        attempts < maxAttempts
      ) {
        // Get all words from IndexedDB
        const allWords = await new Promise((resolve, reject) => {
          const transaction = db.transaction([WORDS_STORE_NAME], 'readonly')
          const store = transaction.objectStore(WORDS_STORE_NAME)
          const request = store.getAll()

          request.onerror = (event) => {
            reject(event.target.error)
          }

          request.onsuccess = () => {
            resolve(request.result || [])
          }
        })

        if (allWords.length <= 1) {
          break // Not enough words to find a different one
        }

        // Sort words by date in descending order (newest first)
        // Assuming each word has a 'createdAt' or 'updatedAt' field
        const sortedWords = [...allWords].sort((a, b) => {
          const dateA = a.createdAt || a.updatedAt || 0
          const dateB = b.createdAt || b.updatedAt || 0
          return new Date(dateB) - new Date(dateA)
        })

        // Take only the 5 latest words
        const latestWords = sortedWords.slice(0, 5)
        // console.log(`Found ${latestWords.length} latest words to choose from`);

        // Filter out the current word from the latest words
        const otherLatestWords = latestWords.filter(
          (word) => word.id !== currentWord.id,
        )

        if (otherLatestWords.length > 0) {
          // Get a random word from the filtered latest words
          const randomIndex = Math.floor(
            Math.random() * otherLatestWords.length,
          )
          newWord = otherLatestWords[randomIndex]
          // console.log(`Attempt ${attempts + 1}: Selected different word ${newWord.word} from latest words`);
          break // We found a different word, exit the loop
        }

        attempts++
      }

      if (currentWord && newWord && currentWord.id === newWord.id) {
        // console.log(`Notification alarm: Failed to get different word after ${maxAttempts} attempts`);
      } else if (newWord) {
        // console.log(`Notification alarm: Got new word: ${newWord.word}`);
      }
    } else {
      // console.log(`Notification alarm: Successfully got new word: ${newWord ? newWord.word : 'null'}`);
    }

    // Store the new word as the current word
    if (newWord) {
      chrome.storage.local.set({ currentWord: newWord })

      // Notify any open popups about the new word
      // console.log('[BACKGROUND] Notification alarm: Sending wordUpdated message with word:', newWord.word);
      chrome.runtime
        .sendMessage({
          action: 'wordUpdated',
          word: newWord,
        })
        .then(() => {
          // console.log('[BACKGROUND] Successfully sent wordUpdated message from notification alarm');
        })
        .catch((error) => {
          // This error is expected if no popup is open to receive the message
          if (!error.message.includes('Could not establish connection')) {
            // console.error('[BACKGROUND] Error sending word update message from notification alarm:', error);
          } else {
            // console.log('[BACKGROUND] No popup open to receive message from notification alarm (expected)');
          }
        })
    }

    await showNewWordNotification(newWord)
  } else if (alarm.name === WORD_FETCH_ALARM_NAME) {
    // console.log('Word fetch alarm triggered, fetching new word')
    try {
      const word = await fetchNewWord()
      if (word) {
        // Store the fetched word as the current word
        chrome.storage.local.set({ currentWord: word })
        // console.log(`Successfully fetched new word: ${word.word}`)

        // Notify any open popups about the new word
        // console.log('[BACKGROUND] Word fetch alarm: Sending wordUpdated message with word:', word.word);
        chrome.runtime
          .sendMessage({
            action: 'wordUpdated',
            word: word,
          })
          .then(() => {
            // console.log('[BACKGROUND] Successfully sent wordUpdated message from word fetch alarm');
          })
          .catch((error) => {
            // This error is expected if no popup is open to receive the message
            if (!error.message.includes('Could not establish connection')) {
              // console.error('[BACKGROUND] Error sending word update message from word fetch alarm:', error);
            } else {
              // console.log('[BACKGROUND] No popup open to receive message from word fetch alarm (expected)');
            }
          })
      } else {
        // console.warn('Failed to fetch new word from scheduled alarm')
      }
    } catch (error) {
      // console.error('Error fetching word from scheduled alarm:', error)
    }
  }
})

// Show notification for new word
async function showNewWordNotification(word) {
  let title = 'WordDrop - New Word Available'
  let message = "Expand your vocabulary with a new word from today's headlines!"

  if (word) {
    title = `WordDrop - "${word.word}"`
    const definition =
      word.definitions && word.definitions.length > 0
        ? word.definitions[0].definition
        : ''
    message =
      definition ||
      "Expand your vocabulary with this new word from today's headlines!"
  }

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    priority: 2,
  })
}

// Listen for changes in notification frequency setting
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.notificationFrequency) {
    createNotificationAlarm(changes.notificationFrequency.newValue)
  }

  // If the environment is changed, update alarms accordingly
  if (area === 'local' && changes.environment) {
    chrome.storage.local.get('notificationFrequency', (result) => {
      if (result.notificationFrequency) {
        createNotificationAlarm(result.notificationFrequency)
      }
    })
  }
})

// Listen for notification clicks
chrome.notifications.onClicked.addListener(() => {
  chrome.action.openPopup()
})

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // This pattern is crucial for async message handling in Chrome extensions
  const handleAsyncMessage = async () => {
    // Initialize DB if not already done
    if (!db) {
      try {
        await initializeDB()
      } catch (error) {
        console.error('Failed to initialize database:', error)
        return { success: false, error: 'Failed to initialize database' }
      }
    }

    if (request.action === 'checkFirstPopupOpen') {
      try {
        const result = await new Promise((resolve) => {
          chrome.storage.local.get(
            ['initialSetupCompleted', 'needInitialWordsFetch'],
            (result) => {
              resolve({
                isFirstOpen: !result.initialSetupCompleted,
                needInitialWordsFetch: !!result.needInitialWordsFetch,
              })
            },
          )
        })

        // If we need to fetch initial words, start the fetch
        if (result.needInitialWordsFetch) {
          // Clear the flag first to prevent duplicate attempts
          await new Promise((resolve) => {
            chrome.storage.local.set({ needInitialWordsFetch: false }, resolve)
          })

          // Fire a message to popup to show loading
          chrome.runtime
            .sendMessage({
              action: 'initialSetupStarted',
              message: 'Downloading initial words...',
            })
            .catch(() => {
              // Ignore error when no popup is open
            })

          // Start the fetch and wait for it to complete to get the first word
          const firstWord = await getInitialWords()

          // Set this as the current word
          if (firstWord) {
            chrome.storage.local.set({ currentWord: firstWord })
          }

          // Once completed, notify popup with the first word
          chrome.runtime
            .sendMessage({
              action: 'initialSetupCompleted',
              word: firstWord, // Include the first word in the message
            })
            .catch(() => {
              // Ignore error when no popup is open
            })
        }

        return {
          success: true,
          isFirstOpen: result.isFirstOpen,
          needsSetup: result.needInitialWordsFetch,
        }
      } catch (error) {
        console.error('Error handling checkFirstPopupOpen:', error)
        return { success: false, error: error.message }
      }
    }

    // Handle different message actions
    if (request.action === 'addWordToDatabase') {
      try {
        await addWordToDatabase(request.word)
        return { success: true }
      } catch (error) {
        console.error('Error handling addWordToDatabase:', error)
        return { success: false, error: error.message }
      }
    }

    if (request.action === 'getAllWords') {
      try {
        const words = await getAllWords()
        return { success: true, words }
      } catch (error) {
        console.error('Error handling getAllWords:', error)
        return { success: false, error: error.message }
      }
    }

    if (request.action === 'getWords') {
      try {
        const { start, limit, category } = request
        const result = await getWords(start, limit, category)
        return { success: true, words: result.words, total: result.total }
      } catch (error) {
        console.error('Error handling getWords:', error)
        return { success: false, error: error.message }
      }
    }

    if (request.action === 'toggleWordBookmark') {
      try {
        const bookmarked = await toggleWordBookmark(
          request.wordId,
          request.bookmarked,
          request.wordData,
        )
        return { success: true, bookmarked }
      } catch (error) {
        console.error('Error handling toggleWordBookmark:', error)
        return { success: false, error: error.message }
      }
    }

    if (request.action === 'getWordBookmarkStatus') {
      try {
        const bookmarked = await getWordBookmarkStatus(request.wordId)
        return { success: true, bookmarked }
      } catch (error) {
        console.error('Error handling getWordBookmarkStatus:', error)
        return { success: false, error: error.message }
      }
    }

    if (request.action === 'getBookmarkedWords') {
      try {
        const { start, limit, category } = request
        const result = await getBookmarkedWords(start, limit, category)
        return { success: true, words: result.words, total: result.total }
      } catch (error) {
        console.error('Error handling getBookmarkedWords:', error)
        return { success: false, error: error.message }
      }
    }

    if (request.action === 'getEnvironment') {
      try {
        const environment = await new Promise((resolve) => {
          chrome.storage.local.get('environment', (result) => {
            resolve(result.environment || 'release')
          })
        })
        return { success: true, environment }
      } catch (error) {
        console.error('Error handling getEnvironment:', error)
        return { success: false, error: error.message }
      }
    }

    if (request.action === 'fetchNewWord') {
      try {
        const word = await fetchNewWord()
        return { success: true, word }
      } catch (error) {
        console.error('Error handling fetchNewWord:', error)
        return { success: false, error: error.message }
      }
    }

    if (request.action === 'getLatestWord') {
      try {
        // Default to false to ensure the controller gets the current word
        // This can be overridden by explicitly setting forceNew=true in the request
        const forceNew = request.forceNew === true ? true : false
        // console.log(
        //   `getLatestWord message handler called with forceNew=${forceNew}`,
        // )
        const word = await getLatestWord(forceNew)
        return { success: true, word }
      } catch (error) {
        console.error('Error handling getLatestWord:', error)
        return { success: false, error: error.message }
      }
    }

    if (request.action === 'getNextNotificationTime') {
      try {
        const alarmInfo = await getNextNotificationTime()
        return { success: true, alarmInfo }
      } catch (error) {
        console.error('Error handling getNextNotificationTime:', error)
        return { success: false, error: error.message }
      }
    }

    if (request.action === 'getNextNotificationTime') {
      try {
        const alarmInfo = await getNextNotificationTime()
        return { success: true, alarmInfo }
      } catch (error) {
        console.error('Error handling getNextNotificationTime:', error)
        return { success: false, error: error.message }
      }
    }

    return null // Not handling this message
  }

  // Execute the async function and send response when it resolves
  handleAsyncMessage().then((response) => {
    if (response !== null) {
      sendResponse(response)
    }
  })

  // Return true to indicate that sendResponse will be called asynchronously
  return true
})

// When the extension starts up, initialize the DB and set up word fetching
initializeDB()
  .then(() => {
    // Set up the word fetching interval when the extension starts
    setupWordFetchingInterval()
  })
  .catch((error) => {
    console.error('Failed to initialize database on startup:', error)
  })
