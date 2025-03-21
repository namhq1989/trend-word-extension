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
      console.log('IndexedDB initialized successfully')
      resolve(db)
    }
  })
}

// Helper function to get environment from storage with fallback
function getEnvironment() {
  return new Promise((resolve) => {
    chrome.storage.local.get('env', (result) => {
      const env = result.env || 'release' // Default to release if not set
      console.log(`Using environment: ${env}`)
      resolve(env)
    })
  })
}

// Helper function to get API host from storage with fallback
function getApiHost() {
  return new Promise((resolve) => {
    chrome.storage.local.get('apiHost', (result) => {
      const apiHost = result.apiHost || 'wd.bapbi.app' // Default to production API if not set
      console.log(`Using API host: ${apiHost}`)
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

    // Add timestamp to the word
    const wordWithDate = {
      ...word,
      date: new Date().toISOString(),
    }

    // Extract unique categories from news items
    if (word.news && word.news.length > 0) {
      console.log('Word has news items in addWordToDatabase:', word.news.length)

      const categoriesSet = new Set()
      word.news.forEach((newsItem) => {
        // Check for categories field in news items (which is the correct field according to IWordNews)
        if (newsItem.categories && Array.isArray(newsItem.categories)) {
          console.log(
            'Found categories array in news item:',
            newsItem.categories,
          )
          newsItem.categories.forEach((cat) => categoriesSet.add(cat))
        }
        // Also check for category field as fallback
        else if (newsItem.category) {
          console.log('Found category in news item:', newsItem.category)
          categoriesSet.add(newsItem.category)
        }
      })

      wordWithDate.categories = Array.from(categoriesSet)
      console.log(
        'Extracted categories in addWordToDatabase:',
        wordWithDate.categories,
      )
    }

    const transaction = db.transaction([WORDS_STORE_NAME], 'readwrite')
    const store = transaction.objectStore(WORDS_STORE_NAME)
    const request = store.put(wordWithDate) // Using put instead of add to handle updates

    request.onerror = (event) => {
      console.error('Error adding word to IndexedDB:', event.target.error)
      reject(event.target.error)
    }

    request.onsuccess = () => {
      console.log('Word added to IndexedDB successfully')
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
      console.error('Error getting words from IndexedDB:', event.target.error)
      reject(event.target.error)
    }

    request.onsuccess = () => {
      console.log(`Retrieved ${request.result.length} words from IndexedDB`)
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
      console.error('Error getting words from IndexedDB:', event.target.error)
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

      console.log(
        `Retrieved ${paginatedWords.length} words from IndexedDB (total: ${total})`,
      )
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
      console.error(
        'Error getting bookmarked words from IndexedDB:',
        event.target.error,
      )
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

      console.log(
        `Retrieved ${paginatedWords.length} bookmarked words from IndexedDB (total: ${total})`,
      )
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
      console.error('Error getting word from IndexedDB:', event.target.error)
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
            console.error(
              'Error adding new bookmarked word to IndexedDB:',
              event.target.error,
            )
            reject(event.target.error)
          }

          addRequest.onsuccess = () => {
            console.log('New bookmarked word added to IndexedDB successfully')
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
                console.error(
                  'Error adding new bookmarked word to IndexedDB:',
                  event.target.error,
                )
                reject(event.target.error)
              }

              addRequest.onsuccess = () => {
                console.log(
                  'New bookmarked word added to IndexedDB successfully',
                )
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
          console.error(
            'Error updating word bookmark status in IndexedDB:',
            event.target.error,
          )
          reject(event.target.error)
        }

        updateRequest.onsuccess = () => {
          console.log(
            `Word bookmark status updated to ${bookmarked} in IndexedDB successfully`,
          )
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
      console.error('Error getting word from IndexedDB:', event.target.error)
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
        console.log('Returning current word from storage:', currentWord.word);
        resolve(currentWord);
        return;
      }
      
      const transaction = db.transaction([WORDS_STORE_NAME], 'readonly')
      const store = transaction.objectStore(WORDS_STORE_NAME)
      const request = store.getAll()

      request.onerror = (event) => {
        console.error('Error getting words from IndexedDB:', event.target.error)
        reject(event.target.error)
      }

      request.onsuccess = () => {
        const words = request.result
        
        if (!words || words.length === 0) {
          // No words in database yet
          resolve(null)
          return
        }

        // Sort by date (newest first)
        words.sort((a, b) => {
          const dateA = new Date(a.date || 0)
          const dateB = new Date(b.date || 0)
          return dateB - dateA
        })

        // Try to get a different word if the current one matches
        let attempts = 0;
        let maxAttempts = 5;
        let selectedWord = words[0];
        
        // If we have a current word and it matches the latest word, try to find a different one
        if (forceNew && currentWord && currentWord.id === selectedWord.id && words.length > 1) {
          console.log('Current word matches latest word, trying to find a different one');
          
          while (attempts < maxAttempts && currentWord.id === selectedWord.id) {
            // Get a random index between 0 and words.length-1 (excluding the first word if it's the current one)
            const randomIndex = Math.floor(Math.random() * (words.length - 1)) + 1;
            selectedWord = words[randomIndex];
            attempts++;
            console.log(`Attempt ${attempts}: Selected word ${selectedWord.word}`);
          }
          
          if (attempts >= maxAttempts && currentWord.id === selectedWord.id) {
            console.log(`Reached max attempts (${maxAttempts}), using latest word anyway`);
            selectedWord = words[0];
          }
        }
        
        // Store the selected word as the current word
        chrome.storage.local.set({ currentWord: selectedWord });
        
        // Notify any open popups about the new word
        console.log('[BACKGROUND] Sending wordUpdated message with word:', selectedWord.word);
        chrome.runtime.sendMessage({
          action: 'wordUpdated',
          word: selectedWord
        }).then(() => {
          console.log('[BACKGROUND] Successfully sent wordUpdated message');
        }).catch(error => {
          // This error is expected if no popup is open to receive the message
          if (!error.message.includes('Could not establish connection')) {
            console.error('[BACKGROUND] Error sending word update message:', error);
          } else {
            console.log('[BACKGROUND] No popup open to receive message (expected)');
          }
        });
        
        // Return the selected word
        resolve(selectedWord);
      }
    });
  })
}

// Get the remaining time until the next notification
function getNextNotificationTime() {
  return new Promise((resolve, reject) => {
    chrome.alarms.get(NOTIFICATION_ALARM_NAME, (alarm) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting alarm:', chrome.runtime.lastError)
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
        periodInMinutes: alarm.periodInMinutes
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
        console.log(
          `Development mode: using ${freqNumber / 10} minutes instead of ${freqNumber} minutes`,
        )
        resolve((freqNumber / 10) * 60 * 1000) // convert to milliseconds with reduced time for testing
      } else {
        // In release mode, use minutes as normal
        console.log(`Release mode: using ${freqNumber} minutes`)
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
  console.log('Fetching new word from background script')

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
      const env = await new Promise((resolve) => {
        chrome.storage.local.get('environment', (result) => {
          resolve(result.environment || 'release')
        })
      })
      const unit = env === 'develop' ? 'minute' : 'hour'
      console.log(
        `Using last fetched word due to cooldown (${notificationFrequency} ${unit})`,
      )
      return lastFetchedWord
    }

    console.log('Cooldown expired or no previous word, fetching new word...')

    // Get list of selected categories
    let selectedCategories =
      categories.length > 0
        ? categories
        : ['politics', 'technology', 'business', 'science', 'health', 'sports', 'entertainment', 'world', 'education']

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
      console.log('All categories have been used, resetting...')
      // Reset fetchedCategories in cache
      cache.fetchedCategories = []
      await new Promise((resolve) => {
        chrome.storage.local.set({ wordsCache: cache }, resolve)
      })
      categoriesToFetch = selectedCategories
    }

    console.log('Categories available for fetch:', categoriesToFetch)

    // Get selected difficulty levels
    const allLevels = ['beginner', 'intermediate', 'advanced']
    const levelsToUse =
      difficultyLevels.length > 0 ? difficultyLevels : allLevels

    console.log('Using difficulty levels:', levelsToUse)

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
    console.log('Fetching word from URL:', url)

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
      console.log('API call failed, reset fetchedCategories to empty array')
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
      console.log('No word returned from API, reset fetchedCategories to empty array')
      
      if (lastFetchedWord) {
        console.log('Using last fetched word due to API failure')
        return lastFetchedWord
      }
      throw new Error('No word returned from API')
    }

    // Update cache information
    const updatedCache = {
      ...cache,
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
        console.log('Updated fetched categories with:', usedCategories)
      } else {
        // If we can't determine which category was used, assume the first one
        const fallbackCategory = categoriesToFetch[0]
        updatedCache.fetchedCategories = [
          ...(cache.fetchedCategories || []),
          fallbackCategory,
        ]
        console.log(
          'Could not determine used category, marking as used:',
          fallbackCategory,
        )
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
    console.error('Error fetching new word:', error)

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
      console.log('Error occurred, reset fetchedCategories to empty array')
    }

    if (cache && cache.lastFetchedWord) {
      return cache.lastFetchedWord
    }

    return null
  }
}

// Initialize the extension
chrome.runtime.onInstalled.addListener(async () => {
  await initializeDB()
  // Set up default alarm for notifications
  setupDefaultAlarm()
  // Set up word fetching interval
  setupWordFetchingInterval()
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
  console.log('Setting up word fetching interval')
  
  // Fetch a word immediately on startup
  fetchNewWord().then(word => {
    if (word) {
      console.log('Successfully fetched initial word:', word.word)
    } else {
      console.warn('Failed to fetch initial word')
    }
  }).catch(error => {
    console.error('Error fetching initial word:', error)
  })
  
  // Get environment from storage to determine interval
  const env = await getEnvironment()
  const intervalMinutes = env === 'develop' ? 
    WORD_FETCH_INTERVAL_MINUTES_DEV : 
    WORD_FETCH_INTERVAL_MINUTES_RELEASE
  
  console.log(`Environment: ${env}, using interval of ${intervalMinutes} minute(s)`)
  
  // Set up an alarm to fetch new words based on environment
  chrome.alarms.get(WORD_FETCH_ALARM_NAME, (alarm) => {
    // Clear any existing alarm first to ensure we use the correct interval
    chrome.alarms.clear(WORD_FETCH_ALARM_NAME, () => {
      // Create a new alarm with the appropriate interval
      chrome.alarms.create(WORD_FETCH_ALARM_NAME, {
        periodInMinutes: intervalMinutes
      })
      console.log(`Created word fetch alarm to run every ${intervalMinutes} minute(s)`)
    })
  })
}

// Create an alarm based on notification frequency
async function createNotificationAlarm(frequency) {
  // If frequency is set to never (-), just clear any existing alarm and return
  if (frequency === '-') {
    console.log('Notification frequency set to never (-), clearing alarm')
    chrome.alarms.clear(NOTIFICATION_ALARM_NAME)
    return
  }

  // Get environment value from storage
  const env = await getEnvironment()

  // Convert to minutes based on environment
  let minutes
  if (env === 'develop') {
    // In develop mode, frequency is already in minutes
    minutes = parseInt(frequency)
    console.log(`Development mode: setting alarm to ${minutes} minutes`)
  } else {
    // In release mode, convert hours to minutes
    minutes = parseInt(frequency) * 60
    console.log(
      `Release mode: setting alarm to ${minutes} minutes (${frequency} hours)`,
    )
  }

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
    const currentWord = await new Promise(resolve => {
      chrome.storage.local.get('currentWord', (result) => {
        resolve(result.currentWord || null);
      });
    });
    
    // Use fetchNewWord directly to ensure we get a fresh word from the API
    console.log('Notification alarm triggered, fetching a new word from API');
    let newWord = await fetchNewWord();
    
    // If we somehow got the same word back, try with getLatestWord as a fallback
    if (currentWord && newWord && currentWord.id === newWord.id) {
      console.log(`Notification alarm: Got same word from API (${newWord.word}), trying with IndexedDB`);
      
      // Try to get a different word from IndexedDB
      let attempts = 0;
      const maxAttempts = 5;
      
      while (currentWord && newWord && currentWord.id === newWord.id && attempts < maxAttempts) {
        // Get all words from IndexedDB
        const allWords = await new Promise((resolve, reject) => {
          const transaction = db.transaction([WORDS_STORE_NAME], 'readonly');
          const store = transaction.objectStore(WORDS_STORE_NAME);
          const request = store.getAll();
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
          
          request.onsuccess = () => {
            resolve(request.result || []);
          };
        });
        
        if (allWords.length <= 1) {
          break; // Not enough words to find a different one
        }
        
        // Filter out the current word
        const otherWords = allWords.filter(word => word.id !== currentWord.id);
        
        if (otherWords.length > 0) {
          // Get a random word from the filtered list
          const randomIndex = Math.floor(Math.random() * otherWords.length);
          newWord = otherWords[randomIndex];
          console.log(`Attempt ${attempts + 1}: Selected different word ${newWord.word}`);
          break; // We found a different word, exit the loop
        }
        
        attempts++;
      }
      
      if (currentWord && newWord && currentWord.id === newWord.id) {
        console.log(`Notification alarm: Failed to get different word after ${maxAttempts} attempts`);
      } else if (newWord) {
        console.log(`Notification alarm: Got new word: ${newWord.word}`);
      }
    } else {
      console.log(`Notification alarm: Successfully got new word: ${newWord ? newWord.word : 'null'}`);
    }
    
    // Store the new word as the current word
    if (newWord) {
      chrome.storage.local.set({ currentWord: newWord });
      
      // Notify any open popups about the new word
      console.log('[BACKGROUND] Notification alarm: Sending wordUpdated message with word:', newWord.word);
      chrome.runtime.sendMessage({
        action: 'wordUpdated',
        word: newWord
      }).then(() => {
        console.log('[BACKGROUND] Successfully sent wordUpdated message from notification alarm');
      }).catch(error => {
        // This error is expected if no popup is open to receive the message
        if (!error.message.includes('Could not establish connection')) {
          console.error('[BACKGROUND] Error sending word update message from notification alarm:', error);
        } else {
          console.log('[BACKGROUND] No popup open to receive message from notification alarm (expected)');
        }
      });
    }
    
    await showNewWordNotification(newWord);
  } else if (alarm.name === WORD_FETCH_ALARM_NAME) {
    console.log('Word fetch alarm triggered, fetching new word')
    try {
      const word = await fetchNewWord()
      if (word) {
        // Store the fetched word as the current word
        chrome.storage.local.set({ currentWord: word });
        console.log(`Successfully fetched new word: ${word.word}`)
        
        // Notify any open popups about the new word
        console.log('[BACKGROUND] Word fetch alarm: Sending wordUpdated message with word:', word.word);
        chrome.runtime.sendMessage({
          action: 'wordUpdated',
          word: word
        }).then(() => {
          console.log('[BACKGROUND] Successfully sent wordUpdated message from word fetch alarm');
        }).catch(error => {
          // This error is expected if no popup is open to receive the message
          if (!error.message.includes('Could not establish connection')) {
            console.error('[BACKGROUND] Error sending word update message from word fetch alarm:', error);
          } else {
            console.log('[BACKGROUND] No popup open to receive message from word fetch alarm (expected)');
          }
        });
      } else {
        console.warn('Failed to fetch new word from scheduled alarm')
      }
    } catch (error) {
      console.error('Error fetching word from scheduled alarm:', error)
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
        const forceNew = request.forceNew === true ? true : false;
        console.log(`getLatestWord message handler called with forceNew=${forceNew}`);
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
initializeDB().then(() => {
  // Set up the word fetching interval when the extension starts
  setupWordFetchingInterval()
}).catch((error) => {
  console.error('Failed to initialize database on startup:', error)
})
