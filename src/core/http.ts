import ky, { KyInstance } from 'ky'
import useAuthControllerStore from '@/app/controllers/auth-controller.ts'
import { create } from 'zustand/react'

interface IHttp {
  http: KyInstance

  get: <T>(path: string, payload?: object) => Promise<T>
  post: <T>(path: string, payload: object) => Promise<T>
  put: <T>(path: string, payload: object) => Promise<T>
  delete: <T>(path: string, payload: object) => Promise<T>
  patch: <T>(path: string, payload: object) => Promise<T>
}

interface INotSuccessResponse {
  code: string
  message: string
}

export interface IApiResponse<T> {
  data: T
  message: string
  code: string
}

const kyInstance = ky.create({
  prefixUrl: import.meta.env.VITE_API_HOST || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  hooks: {
    beforeRequest: [
      (request) => {
        const userToken = useAuthControllerStore.getState().getToken()
        if (userToken) {
          request.headers.set('Authorization', `Bearer ${userToken}`)
        }
      },
    ],
    afterResponse: [
      async (_, __, response) => {
        if (response.status === 401) {
          // Handle unauthorized error
          console.error('Unauthorized access - 401')
          // Optionally, you can remove the token from the store here
        } else if (response.status === 500) {
          // Handle server error
          console.error('Server error - 500')
        } else if (!response.ok) {
          const error: INotSuccessResponse = await response.json()
          throw new Error(error.message)
        }
      },
    ],
  },
})

const handleApiResponse = async <T>(response: Response): Promise<T> => {
  const data = (await response.json()) as IApiResponse<T>
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong')
  }

  return data.data
}

const useHttpStore = create<IHttp>((_, get) => ({
  http: kyInstance,

  get: async <T>(path: string, payload?: object): Promise<T> => {
    if (!payload) {
      const response = await get().http.get(path)
      return handleApiResponse<T>(response)
    }

    const processedPayload: Record<string, string> = {}
    Object.entries(payload).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        processedPayload[key] = value.join(',')
      } else {
        processedPayload[key] = String(value)
      }
    })

    const queryParams = new URLSearchParams(processedPayload).toString()
    const fullPath = `${path}?${queryParams}`

    const response = await get().http.get(fullPath)
    return handleApiResponse<T>(response)
  },

  post: async <T>(path: string, payload: object): Promise<T> => {
    const response = await get().http.post(path, { json: payload })
    return handleApiResponse<T>(response)
  },

  put: async <T>(path: string, payload: object): Promise<T> => {
    const response = await get().http.put(path, { json: payload })
    return handleApiResponse<T>(response)
  },

  delete: async <T>(path: string, payload?: object): Promise<T> => {
    const response = await get().http.delete(path, { json: payload })
    return handleApiResponse<T>(response)
  },

  patch: async <T>(path: string, payload: object): Promise<T> => {
    const response = await get().http.patch(path, { json: payload })
    return handleApiResponse<T>(response)
  },
}))

export default useHttpStore
