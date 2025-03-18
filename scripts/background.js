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

// Initialize the extension
chrome.runtime.onInstalled.addListener(async () => {
  await initializeDB();
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
    
    // Convert to minutes (frequency is in hours)
    const minutes = parseInt(frequency) * 60;
    
    // Create a new repeating alarm
    chrome.alarms.create(NOTIFICATION_ALARM_NAME, {
      periodInMinutes: minutes
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
});

// Listen for notification clicks
chrome.notifications.onClicked.addListener(() => {
  chrome.action.openPopup();
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  // Initialize DB if not already done
  if (!db) {
    try {
      await initializeDB();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      sendResponse({ success: false, error: 'Failed to initialize database' });
      return true;
    }
  }
  
  // Handle different message actions
  if (request.action === 'addWordToDatabase') {
    try {
      await addWordToDatabase(request.word);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error handling addWordToDatabase:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  if (request.action === 'getAllWords') {
    try {
      const words = await getAllWords();
      sendResponse({ success: true, words });
    } catch (error) {
      console.error('Error handling getAllWords:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  return false; // Not handling this message
});

// When the extension starts up, initialize the DB
initializeDB().catch(error => {
  console.error('Failed to initialize database on startup:', error);
});