import { create } from 'zustand/react'
import { toast } from 'sonner'

export interface INotificationData {
  description: string
  title?: string
  duration?: number
}

interface INotification {
  showSuccessNotification: (notification: INotificationData) => void
  showErrorNotification: (notification: INotificationData) => void
}

const useNotificationStore = create<INotification>(() => ({
  showSuccessNotification: (notification: INotificationData) => {
    toast.success(notification.title ?? 'WordDrop', {
      description: notification.description,
      duration: notification.duration || 3000,
    })
  },
  showErrorNotification: (notification: INotificationData) => {
    toast.error(notification.title ?? 'WordDrop', {
      description: notification.description,
      duration: notification.duration || 5000,
    })
  },
}))

export default useNotificationStore
