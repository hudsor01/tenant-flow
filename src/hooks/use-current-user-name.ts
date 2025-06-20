import { useAuthStore } from '@/store/authStore'

export const useCurrentUserName = () => {
  const { user } = useAuthStore()
  return user?.name || user?.email?.split('@')[0] || '?'
}
