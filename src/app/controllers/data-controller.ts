import categories, { ICategory } from '@/app/models/category.ts'
import { create } from 'zustand/react'
import useStorageStore from '@/core/storage.ts'
import languages, { Language } from '@/app/models/language.ts'

interface IDataController {
  languages: Language[]
  getLanguages: () => Promise<void>
  setLanguage: (id: string) => Promise<void>

  categories: ICategory[]
  getCategories: () => Promise<void>
  toggleCategory: (id: string) => Promise<void>
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
}))

export default useDataControllerStore
