import { create } from 'zustand/react'

interface IAuthController {
  saveToken: (token: string) => void
  getToken: () => string
  removeToken: () => void
  isAuthenticated: () => boolean
  checkAuthStatus: () => Promise<void>
  onTapSignIn: () => void
}

const useAuthControllerStore = create<IAuthController>(() => ({
  saveToken: () => {},
  getToken: () => '',
  removeToken: () => {},
  isAuthenticated: () => false,
  checkAuthStatus: () => Promise.resolve(),
  onTapSignIn: () => {},
}))

export default useAuthControllerStore
