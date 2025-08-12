import { toast } from 'sonner'
import { logger } from '@/lib/logger'

// Mock property document operations for now
export function usePropertyImages(_propertyId?: string) {
	return {
		data: [],
		isLoading: false,
		error: null as Error | null,
		refetch: () => Promise.resolve()
	}
}
export function useUploadPropertyImage() {
	return {
		mutateAsync: async (data: { propertyId: string; file: File }) => {
			logger.info('Uploading property image:', {
				component: 'UPropertyDocumentsHook',
				propertyId: data.propertyId,
				fileName: data.file.name
			})
			toast.success('Image uploaded successfully')
			return {
				id: 'mock-id',
				url: URL.createObjectURL(data.file),
				isPrimary: false,
				propertyId: data.propertyId
			}
		},
		isPending: false,
		error: null
	}
}

export function useDeletePropertyDocument() {
	return {
		mutateAsync: async (documentId: string) => {
			logger.info('Deleting property document:', {
				component: 'UPropertyDocumentsHook',
				data: documentId
			})
			toast.success('Document deleted successfully')
		},
		isPending: false,
		error: null
	}
}

export function useSetPrimaryPropertyImage() {
	return {
		mutateAsync: async (data: { propertyId: string; imageId: string }) => {
			logger.info('Setting primary image:', {
				component: 'UPropertyDocumentsHook',
				imageId: data.imageId,
				propertyId: data.propertyId
			})
			toast.success('Primary image updated successfully')
		},
		isPending: false,
		error: null
	}
}
