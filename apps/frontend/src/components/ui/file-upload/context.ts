'use client'

import { createContext, useContext } from 'react'
import type { FileUploadContextValue, FileUploadItemContextValue } from './types'
import { ROOT_NAME, ITEM_NAME } from './types'

export const FileUploadContext =
	createContext<FileUploadContextValue | null>(null)

export function useFileUploadContext(
	consumerName: string
): FileUploadContextValue {
	const context = useContext(FileUploadContext)
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``)
	}
	return context
}

export const FileUploadItemContext =
	createContext<FileUploadItemContextValue | null>(null)

export function useFileUploadItemContext(
	consumerName: string
): FileUploadItemContextValue {
	const context = useContext(FileUploadItemContext)
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ITEM_NAME}\``)
	}
	return context
}
