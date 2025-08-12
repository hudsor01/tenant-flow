import { useState } from 'react'
import { logger } from '@/lib/logger'
import { useAuth } from './use-auth'
import { toast } from 'sonner'

export interface ProfileFormData {
  fullName: string
  email: string
  phone?: string
  bio?: string
}

export interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function useEditProfileData() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [avatarState, setAvatarState] = useState<string | null>(null)

  const profileForm = {
    fullName: user?.user_metadata?.full_name || '',
    email: user?.email || ''
  }

  const passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)
    try {
      // Mock profile update for now
      logger.info('Updating profile:', { component: 'UEditProfileDataHook', data: data })
      toast.success('Profile updated successfully')
    } catch (error) {
      logger.error('Profile update error:', error instanceof Error ? error : new Error(String(error)), { component: 'UEditProfileDataHook' })
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const onAvatarChange = async (file: File | null) => {
    if (!file) return

    try {
      // Mock avatar upload for now
      logger.info('Uploading avatar:', { component: 'UEditProfileDataHook', data: file.name })
      toast.success('Avatar uploaded successfully')
    } catch (error) {
      logger.error('Avatar upload error:', error instanceof Error ? error : new Error(String(error)), { component: 'UEditProfileDataHook' })
      toast.error('Failed to upload avatar')
    }
  }

  const handlePasswordSubmit = async (data: PasswordFormData) => {
    setIsLoading(true)
    try {
      if (data.newPassword !== data.confirmPassword) {
        toast.error('Passwords do not match')
        return
      }
      
      // Mock password update for now
      logger.info('Updating password', { component: 'UEditProfileDataHook' })
      toast.success('Password updated successfully')
    } catch (error) {
      logger.error('Password update error:', error instanceof Error ? error : new Error(String(error)), { component: 'UEditProfileDataHook' })
      toast.error('Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    user,
    avatarState,
    setAvatarState,
    profileForm,
    passwordForm,
    onSubmit,
    onAvatarChange,
    handlePasswordSubmit,
    isLoading
  }
}