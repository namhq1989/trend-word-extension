import categories, { ICategory } from '@/app/models/category.ts'
import { create } from 'zustand/react'
import useStorageStore, { DifficultyLevel, NotificationFrequency } from '@/core/storage.ts'
import languages, { Language } from '@/app/models/language.ts'

interface IDataController {
  languages: Language[]
  getLanguages: () => Promise<void>
  setLanguage: (id: string) => Promise<void>

  categories: ICategory[]
  getCategories: () => Promise<void>
  toggleCategory: (id: string) => Promise<void>
  
  difficultyLevel: DifficultyLevel
  getDifficultyLevel: () => Promise<void>
  setDifficultyLevel: (level: DifficultyLevel) => Promise<void>
  
  notificationFrequency: NotificationFrequency
  getNotificationFrequency: () => Promise<void>
  setNotificationFrequency: (frequency: NotificationFrequency) => Promise<void>
  
  maxWordsPerDay: number
  getMaxWordsPerDay: () => Promise<void>
  setMaxWordsPerDay: (count: number) => Promise<void>
}

const useDataControllerStore = create<IDataController>((set) => ({
  languages: [],
  getLanguages: async () => {
    const storage = useStorageStore.getState()
    const selectedLanguage = await storage.getSelectedLanguage()
    const result = languages.map((language) => {
      language.isSelected = language.id === selectedLanguage
      return language
    })
    set({ languages: result })
  },
  setLanguage: async (id: string) => {
    const storage = useStorageStore.getState()
    await storage.saveSelectedLanguage(id)
    const result = languages.map((language) => {
      language.isSelected = language.id === id
      return language
    })
    set({ languages: result })
  },

  categories: [],
  getCategories: async () => {
    const storage = useStorageStore.getState()
    const selectedCategories = await storage.getSelectedCategories()
    const result = categories.map((category) => {
      category.isSelected = selectedCategories.includes(category.id)
      return category
    })
    set({ categories: result })
  },
  toggleCategory: async (id: string) => {
    const storage = useStorageStore.getState()
    const selectedCategories = await storage.getSelectedCategories()
    if (selectedCategories.includes(id)) {
      selectedCategories.splice(selectedCategories.indexOf(id), 1)
    } else {
      selectedCategories.push(id)
    }

    await storage.saveSelectedCategories(selectedCategories)

    const result = categories.map((category) => {
      category.isSelected = selectedCategories.includes(category.id)
      return category
    })
    set({ categories: result })
  },
  
  difficultyLevel: 'beginner',
  getDifficultyLevel: async () => {
    const storage = useStorageStore.getState()
    const level = await storage.getDifficultyLevel()
    set({ difficultyLevel: level })
  },
  setDifficultyLevel: async (level: DifficultyLevel) => {
    const storage = useStorageStore.getState()
    await storage.saveDifficultyLevel(level)
    set({ difficultyLevel: level })
  },
  
  notificationFrequency: '1',
  getNotificationFrequency: async () => {
    const storage = useStorageStore.getState()
    const frequency = await storage.getNotificationFrequency()
    set({ notificationFrequency: frequency })
  },
  setNotificationFrequency: async (frequency: NotificationFrequency) => {
    const storage = useStorageStore.getState()
    await storage.saveNotificationFrequency(frequency)
    set({ notificationFrequency: frequency })
  },
  
  maxWordsPerDay: 10,
  getMaxWordsPerDay: async () => {
    const storage = useStorageStore.getState()
    const count = await storage.getMaxWordsPerDay()
    set({ maxWordsPerDay: count })
  },
  setMaxWordsPerDay: async (count: number) => {
    const storage = useStorageStore.getState()
    await storage.saveMaxWordsPerDay(count)
    set({ maxWordsPerDay: count })
  }
}))

export default useDataControllerStore