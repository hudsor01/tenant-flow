import { useAuthStore } from '@/store/authStore'

export const useCurrentUserImage = () => {
  const { user } = useAuthStore()
  return user?.avatarUrl || null
}
