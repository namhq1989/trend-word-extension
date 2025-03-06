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
}

const useStorageStore = create<IStorage>(() => ({
  saveUserData: () => {},
}))

export default useStorageStore
