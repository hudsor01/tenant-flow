import { useContext } from 'react'
import { DropzoneContext } from '@/components/dropzone-context'

export function useDropzoneContext() {
	const context = useContext(DropzoneContext)

	if (!context) {
		throw new Error('useDropzoneContext must be used within a Dropzone')
	}

	return context
}
