// Constants
const NOTIFICATION_ALARM_NAME = 'wordDropNotification'
const DEFAULT_NOTIFICATION_FREQUENCY = '1' // every 1 hour
const DB_NAME = 'WordDropDB'
const DB_VERSION = 1
const WORDS_STORE_NAME = 'words'

// IndexedDB setup
let db = null;

// Initialize the IndexedDB
function initializeDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event.target.error);
      reject(event.target.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store for words if it doesn't exist
      if (!db.objectStoreNames.contains(WORDS_STORE_NAME)) {
        const store = db.createObjectStore(WORDS_STORE_NAME, { keyPath: 'id' });
        
        // Create indexes for searching
        store.createIndex('word', 'word', { unique: false });
        store.createIndex('level', 'level', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
    };
    
    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('IndexedDB initialized successfully');
      resolve(db);
    };
  });
}

// Store environment variable in chrome.storage.local
function storeEnvironmentVariable() {
  // For background scripts, we need to get the ENV from extension environment variables
  // This is typically passed from the manifest.json or build process
  // For testing purposes, we'll default to 'develop' in debug mode, 'release' otherwise
  const isDevelopmentMode = !('update_url' in chrome.runtime.getManifest());
  const env = isDevelopmentMode ? 'develop' : 'release';
  
  // Store in chrome.storage.local
  chrome.storage.local.set({ environment: env }, () => {
    console.log(`Environment stored in storage: ${env}`);
  });
}

// Add a word to the IndexedDB
function addWordToDatabase(word) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    // Add timestamp to the word
    const wordWithDate = {
      ...word,
      date: new Date().toISOString()
    };
    
    // Extract unique categories from news items
    if (word.news && word.news.length > 0) {
      console.log('Word has news items in addWordToDatabase:', word.news.length);
      
      const categoriesSet = new Set();
      word.news.forEach(newsItem => {
        // Check for categories field in news items (which is the correct field according to IWordNews)
        if (newsItem.categories && Array.isArray(newsItem.categories)) {
          console.log('Found categories array in news item:', newsItem.categories);
          newsItem.categories.forEach(cat => categoriesSet.add(cat));
        }
        // Also check for category field as fallback
        else if (newsItem.category) {
          console.log('Found category in news item:', newsItem.category);
          categoriesSet.add(newsItem.category);
        }
      });
      
      wordWithDate.categories = Array.from(categoriesSet);
      console.log('Extracted categories in addWordToDatabase:', wordWithDate.categories);
    }
    
    const transaction = db.transaction([WORDS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(WORDS_STORE_NAME);
    const request = store.put(wordWithDate); // Using put instead of add to handle updates
    
    request.onerror = (event) => {
      console.error('Error adding word to IndexedDB:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = () => {
      console.log('Word added to IndexedDB successfully');
      resolve();
    };
  });
}

// Get all words from the IndexedDB
function getAllWords() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([WORDS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(WORDS_STORE_NAME);
    const request = store.getAll();
    
    request.onerror = (event) => {
      console.error('Error getting words from IndexedDB:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = () => {
      console.log(`Retrieved ${request.result.length} words from IndexedDB`);
      resolve(request.result);
    };
  });
}

// Get words with pagination and category filtering
function getWords(start = 0, limit = 10, category) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([WORDS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(WORDS_STORE_NAME);
    const request = store.getAll();
    
    request.onerror = (event) => {
      console.error('Error getting words from IndexedDB:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = () => {
      let allWords = request.result;
      
      // Apply category filter if specified
      if (category) {
        allWords = allWords.filter(word => {
          // Check if the word has categories array
          if (word.categories && Array.isArray(word.categories)) {
            return word.categories.includes(category);
          }
          // Fallback to checking news items directly if categories array is not available
          else if (word.news && Array.isArray(word.news)) {
            return word.news.some(newsItem => newsItem.category === category);
          }
          // Legacy support for old word.category property
          else if (word.category) {
            return word.category === category;
          }
          return false;
        });
      }
      
      // Sort by date (newest first)
      allWords.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
      });
      
      // Get total count before pagination
      const total = allWords.length;
      
      // Apply pagination
      const paginatedWords = allWords.slice(start, start + limit);
      
      console.log(`Retrieved ${paginatedWords.length} words from IndexedDB (total: ${total})`);
      resolve({ words: paginatedWords, total });
    };
  });
}

// Get bookmarked words from IndexedDB with pagination and category filtering
function getBookmarkedWords(start = 0, limit = 10, category) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([WORDS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(WORDS_STORE_NAME);
    const request = store.getAll();
    
    request.onerror = (event) => {
      console.error('Error getting bookmarked words from IndexedDB:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = () => {
      // Filter words that are bookmarked
      let bookmarkedWords = request.result.filter(word => word.bookmarked === true);
      
      // Apply category filter if specified
      if (category) {
        bookmarkedWords = bookmarkedWords.filter(word => {
          // Check if the word has categories array
          if (word.categories && Array.isArray(word.categories)) {
            return word.categories.includes(category);
          }
          // Fallback to checking news items directly if categories array is not available
          else if (word.news && Array.isArray(word.news)) {
            return word.news.some(newsItem => newsItem.category === category);
          }
          // Legacy support for old word.category property
          else if (word.category) {
            return word.category === category;
          }
          return false;
        });
      }
      
      // Sort by date (newest first)
      bookmarkedWords.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
      });
      
      // Get total count before pagination
      const total = bookmarkedWords.length;
      
      // Apply pagination
      const paginatedWords = bookmarkedWords.slice(start, start + limit);
      
      console.log(`Retrieved ${paginatedWords.length} bookmarked words from IndexedDB (total: ${total})`);
      resolve({ words: paginatedWords, total });
    };
  });
}

// Toggle bookmark status for a word in IndexedDB
function toggleWordBookmark(wordId, bookmarked, wordData = null) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    // First, get the word from the database
    const transaction = db.transaction([WORDS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(WORDS_STORE_NAME);
    const request = store.get(wordId);
    
    request.onerror = (event) => {
      console.error('Error getting word from IndexedDB:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = () => {
      const word = request.result;
      
      if (!word) {
        // If word doesn't exist in IndexedDB yet
        if (wordData) {
          // If word data was provided, use it
          wordData.bookmarked = bookmarked;
          
          const addRequest = store.add(wordData);
          
          addRequest.onerror = (event) => {
            console.error('Error adding new bookmarked word to IndexedDB:', event.target.error);
            reject(event.target.error);
          };
          
          addRequest.onsuccess = () => {
            console.log('New bookmarked word added to IndexedDB successfully');
            resolve(bookmarked);
          };
        } else {
          // If no word data was provided, check local storage cache
          chrome.storage.local.get(['cachedWords'], (result) => {
            const cachedWords = result.cachedWords || {};
            const cachedWord = cachedWords[wordId];
            
            if (cachedWord) {
              // Use the cached word data and add bookmark status
              cachedWord.bookmarked = bookmarked;
              
              const addRequest = store.add(cachedWord);
              
              addRequest.onerror = (event) => {
                console.error('Error adding new bookmarked word to IndexedDB:', event.target.error);
                reject(event.target.error);
              };
              
              addRequest.onsuccess = () => {
                console.log('New bookmarked word added to IndexedDB successfully');
                resolve(bookmarked);
              };
            }
          });
        }
      } else {
        // Update the existing word with new bookmark status
        word.bookmarked = bookmarked;
        
        const updateRequest = store.put(word);
        
        updateRequest.onerror = (event) => {
          console.error('Error updating word bookmark status in IndexedDB:', event.target.error);
          reject(event.target.error);
        };
        
        updateRequest.onsuccess = () => {
          console.log(`Word bookmark status updated to ${bookmarked} in IndexedDB successfully`);
          resolve(bookmarked);
        };
      }
    };
  });
}

// Get bookmark status for a word from IndexedDB
function getWordBookmarkStatus(wordId) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const transaction = db.transaction([WORDS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(WORDS_STORE_NAME);
    const request = store.get(wordId);
    
    request.onerror = (event) => {
      console.error('Error getting word from IndexedDB:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = () => {
      const word = request.result;
      
      if (!word) {
        // Word not found in database, so it's not bookmarked
        resolve(false);
      } else {
        // Return the bookmark status (or false if not set)
        resolve(word.bookmarked || false);
      }
    };
  });
}

// Initialize the extension
chrome.runtime.onInstalled.addListener(async () => {
  await initializeDB();
  // Store the environment variable
  storeEnvironmentVariable();
  setupDefaultAlarm();
});

// Setup default alarm for notifications
function setupDefaultAlarm() {
  chrome.alarms.get(NOTIFICATION_ALARM_NAME, (alarm) => {
    if (!alarm) {
      createNotificationAlarm(DEFAULT_NOTIFICATION_FREQUENCY);
    }
  });
}

// Create an alarm based on notification frequency
function createNotificationAlarm(frequency) {
  // Clear any existing alarm first
  chrome.alarms.clear(NOTIFICATION_ALARM_NAME, () => {
    // Don't create a new alarm if frequency is set to never (-)
    if (frequency === '-') return;
    
    // Get environment value from storage
    chrome.storage.local.get('environment', (result) => {
      const env = result.environment || 'release';
      
      // Convert to minutes based on environment
      let minutes;
      if (env === 'develop') {
        // In develop mode, frequency is already in minutes
        minutes = parseInt(frequency);
        console.log(`Development mode: setting alarm to ${minutes} minutes`);
      } else {
        // In release mode, convert hours to minutes
        minutes = parseInt(frequency) * 60;
        console.log(`Release mode: setting alarm to ${minutes} minutes (${frequency} hours)`);
      }
      
      // Create a new repeating alarm
      chrome.alarms.create(NOTIFICATION_ALARM_NAME, {
        periodInMinutes: minutes
      });
    });
  });
}

// Listen for alarm trigger
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === NOTIFICATION_ALARM_NAME) {
    showNewWordNotification();
  }
});

// Show notification for new word
function showNewWordNotification() {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'WordDrop - New Word Available',
    message: 'Expand your vocabulary with a new word from today\'s headlines!',
    priority: 2
  });
}

// Listen for changes in notification frequency setting
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.notificationFrequency) {
    createNotificationAlarm(changes.notificationFrequency.newValue);
  }
  
  // If the environment is changed, update alarms accordingly
  if (area === 'local' && changes.environment) {
    chrome.storage.local.get('notificationFrequency', (result) => {
      if (result.notificationFrequency) {
        createNotificationAlarm(result.notificationFrequency);
      }
    });
  }
});

// Listen for notification clicks
chrome.notifications.onClicked.addListener(() => {
  chrome.action.openPopup();
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // This pattern is crucial for async message handling in Chrome extensions
  const handleAsyncMessage = async () => {
    // Initialize DB if not already done
    if (!db) {
      try {
        await initializeDB();
      } catch (error) {
        console.error('Failed to initialize database:', error);
        return { success: false, error: 'Failed to initialize database' };
      }
    }
    
    // Handle different message actions
    if (request.action === 'addWordToDatabase') {
      try {
        await addWordToDatabase(request.word);
        return { success: true };
      } catch (error) {
        console.error('Error handling addWordToDatabase:', error);
        return { success: false, error: error.message };
      }
    }
    
    if (request.action === 'getAllWords') {
      try {
        const words = await getAllWords();
        return { success: true, words };
      } catch (error) {
        console.error('Error handling getAllWords:', error);
        return { success: false, error: error.message };
      }
    }
    
    if (request.action === 'getWords') {
      try {
        const { start, limit, category } = request;
        const result = await getWords(start, limit, category);
        return { success: true, words: result.words, total: result.total };
      } catch (error) {
        console.error('Error handling getWords:', error);
        return { success: false, error: error.message };
      }
    }
    
    if (request.action === 'toggleWordBookmark') {
      try {
        const bookmarked = await toggleWordBookmark(request.wordId, request.bookmarked, request.wordData);
        return { success: true, bookmarked };
      } catch (error) {
        console.error('Error handling toggleWordBookmark:', error);
        return { success: false, error: error.message };
      }
    }
    
    if (request.action === 'getWordBookmarkStatus') {
      try {
        const bookmarked = await getWordBookmarkStatus(request.wordId);
        return { success: true, bookmarked };
      } catch (error) {
        console.error('Error handling getWordBookmarkStatus:', error);
        return { success: false, error: error.message };
      }
    }
    
    if (request.action === 'getBookmarkedWords') {
      try {
        const { start, limit, category } = request;
        const result = await getBookmarkedWords(start, limit, category);
        return { success: true, words: result.words, total: result.total };
      } catch (error) {
        console.error('Error handling getBookmarkedWords:', error);
        return { success: false, error: error.message };
      }
    }
    
    if (request.action === 'getEnvironment') {
      try {
        const environment = await new Promise((resolve) => {
          chrome.storage.local.get('environment', (result) => {
            resolve(result.environment || 'release');
          });
        });
        return { success: true, environment };
      } catch (error) {
        console.error('Error handling getEnvironment:', error);
        return { success: false, error: error.message };
      }
    }
    
    return null; // Not handling this message
  };

  // Execute the async function and send response when it resolves
  handleAsyncMessage().then(response => {
    if (response !== null) {
      sendResponse(response);
    }
  });
  
  // Return true to indicate that sendResponse will be called asynchronously
  return true;
});

// When the extension starts up, initialize the DB
initializeDB().catch(error => {
  console.error('Failed to initialize database on startup:', error);
});
