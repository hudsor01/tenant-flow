import { toast } from 'sonner'

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
      console.log('Uploading property image:', data.propertyId, data.file.name)
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
      console.log('Deleting property document:', documentId)
      toast.success('Document deleted successfully')
    },
    isPending: false,
    error: null
  }
}

export function useSetPrimaryPropertyImage() {
  return {
    mutateAsync: async (data: { propertyId: string; imageId: string }) => {
      console.log('Setting primary image:', data.imageId, 'for property:', data.propertyId)
      toast.success('Primary image updated successfully')
    },
    isPending: false,
    error: null
  }
}