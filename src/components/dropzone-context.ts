import { createContext } from 'react'
import { type UseSupabaseUploadReturn } from '@/hooks/use-supabase-upload'

export type DropzoneContextType = Omit<UseSupabaseUploadReturn, 'getRootProps' | 'getInputProps'>

export const DropzoneContext = createContext<DropzoneContextType | undefined>(undefined)