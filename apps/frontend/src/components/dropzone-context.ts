import { createContext } from 'react'
import type { UseFileUploadReturn } from '@/hooks/useFileUpload'

export type DropzoneContextType = Omit<
	UseFileUploadReturn,
	'getRootProps' | 'getInputProps'
>

export const DropzoneContext = createContext<DropzoneContextType | undefined>(
	undefined
)
