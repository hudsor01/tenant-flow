'use client'

import * as React from 'react'
import type { FileUploadContextValue, FileUploadItemContextValue } from './types'
import { ROOT_NAME, ITEM_NAME } from './types'

export const FileUploadContext =
	React.createContext<FileUploadContextValue | null>(null)

export function useFileUploadContext(
	consumerName: string
): FileUploadContextValue {
	const context = React.useContext(FileUploadContext)
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``)
	}
	return context
}

export const FileUploadItemContext =
	React.createContext<FileUploadItemContextValue | null>(null)

export function useFileUploadItemContext(
	consumerName: string
): FileUploadItemContextValue {
	const context = React.useContext(FileUploadItemContext)
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ITEM_NAME}\``)
	}
	return context
}
