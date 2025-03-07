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

  saveSelectedCategories: (categories: string[]) => Promise<void>
  getSelectedCategories: () => Promise<string[]>
}

const useStorageStore = create<IStorage>(() => ({
  saveUserData: () => {},

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
