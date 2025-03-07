import categories, { ICategory } from '@/app/models/category.ts'
import { create } from 'zustand/react'
import useStorageStore from '@/core/storage.ts'

interface IDataController {
  categories: ICategory[]
  getCategories: () => Promise<void>
  toggleCategory: (id: string) => Promise<void>
}

const useDataControllerStore = create<IDataController>((set) => ({
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
