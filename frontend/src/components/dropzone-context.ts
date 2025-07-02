import { createContext } from 'react'
import { type UseSupabaseUploadReturn } from '@/hooks/useSupabaseUpload'

export type DropzoneContextType = Omit<UseSupabaseUploadReturn, 'getRootProps' | 'getInputProps'>

export const DropzoneContext = createContext<DropzoneContextType | undefined>(undefined)