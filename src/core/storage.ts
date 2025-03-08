import { create } from 'zustand/react'

enum AuthProvider {
  extension = 'extension',
  google = 'google',
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
}

const useStorageStore = create<IStorage>(() => ({
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
}))

export default useStorageStore
