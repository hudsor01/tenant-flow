'use client'

import type { ComponentProps, ReactNode, RefObject } from 'react'

export const ROOT_NAME = 'FileUpload'
export const DROPZONE_NAME = 'FileUploadDropzone'
export const TRIGGER_NAME = 'FileUploadTrigger'
export const LIST_NAME = 'FileUploadList'
export const ITEM_NAME = 'FileUploadItem'
export const ITEM_PREVIEW_NAME = 'FileUploadItemPreview'
export const ITEM_METADATA_NAME = 'FileUploadItemMetadata'
export const ITEM_PROGRESS_NAME = 'FileUploadItemProgress'
export const ITEM_DELETE_NAME = 'FileUploadItemDelete'
export const CLEAR_NAME = 'FileUploadClear'

export type Direction = 'ltr' | 'rtl'

export interface FileState {
	file: File
	progress: number
	error?: string
	status: 'idle' | 'uploading' | 'error' | 'success'
}

export interface StoreState {
	files: Map<File, FileState>
	dragOver: boolean
	invalid: boolean
}

export type StoreAction =
	| { type: 'ADD_FILES'; files: File[] }
	| { type: 'SET_FILES'; files: File[] }
	| { type: 'SET_PROGRESS'; file: File; progress: number }
	| { type: 'SET_SUCCESS'; file: File }
	| { type: 'SET_ERROR'; file: File; error: string }
	| { type: 'REMOVE_FILE'; file: File }
	| { type: 'SET_DRAG_OVER'; dragOver: boolean }
	| { type: 'SET_INVALID'; invalid: boolean }
	| { type: 'CLEAR' }

export interface Store {
	getState: () => StoreState
	dispatch: (action: StoreAction) => void
	subscribe: (listener: () => void) => () => void
}

export interface FileUploadContextValue {
	inputId: string
	dropzoneId: string
	listId: string
	labelId: string
	disabled: boolean
	dir: Direction
	inputRef: RefObject<HTMLInputElement | null>
	urlCache: WeakMap<File, string>
}

export interface FileUploadItemContextValue {
	id: string
	fileState: FileState | undefined
	nameId: string
	sizeId: string
	statusId: string
	messageId: string
}

/**
 * Internal type for props ref used by store reducer.
 * Uses `| undefined` syntax for exactOptionalPropertyTypes compatibility.
 */
export interface FileUploadInternalPropsRef {
	onValueChange: ((files: File[]) => void) | undefined
	onAccept: ((files: File[]) => void) | undefined
	onFileAccept: ((file: File) => void) | undefined
	onFileReject: ((file: File, message: string) => void) | undefined
	onFileValidate: ((file: File) => string | null | undefined) | undefined
	onUpload:
		| ((
				files: File[],
				options: {
					onProgress: (file: File, progress: number) => void
					onSuccess: (file: File) => void
					onError: (file: File, error: Error) => void
				}
		  ) => Promise<void> | void)
		| undefined
}

export interface FileUploadProps
	extends Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange'> {
	value?: File[]
	defaultValue?: File[]
	onValueChange?: (files: File[]) => void
	onAccept?: (files: File[]) => void
	onFileAccept?: (file: File) => void
	onFileReject?: (file: File, message: string) => void
	onFileValidate?: (file: File) => string | null | undefined
	onUpload?: (
		files: File[],
		options: {
			onProgress: (file: File, progress: number) => void
			onSuccess: (file: File) => void
			onError: (file: File, error: Error) => void
		}
	) => Promise<void> | void
	accept?: string
	maxFiles?: number
	maxSize?: number
	dir?: Direction
	label?: string
	name?: string
	asChild?: boolean
	disabled?: boolean
	invalid?: boolean
	multiple?: boolean
	required?: boolean
}

export interface FileUploadDropzoneProps extends ComponentProps<'div'> {
	asChild?: boolean
}

export interface FileUploadTriggerProps
	extends ComponentProps<'button'> {
	asChild?: boolean
}

export interface FileUploadListProps extends ComponentProps<'div'> {
	orientation?: 'horizontal' | 'vertical'
	asChild?: boolean
	forceMount?: boolean
}

export interface FileUploadItemProps extends ComponentProps<'div'> {
	value: File
	asChild?: boolean
}

export interface FileUploadItemPreviewProps extends ComponentProps<'div'> {
	render?: (file: File, fallback: () => ReactNode) => ReactNode
	asChild?: boolean
}

export interface FileUploadItemMetadataProps
	extends ComponentProps<'div'> {
	asChild?: boolean
	size?: 'default' | 'sm'
}

export interface FileUploadItemProgressProps
	extends ComponentProps<'div'> {
	variant?: 'linear' | 'circular' | 'fill'
	size?: number
	asChild?: boolean
	forceMount?: boolean
}

export interface FileUploadItemDeleteProps
	extends ComponentProps<'button'> {
	asChild?: boolean
}

export interface FileUploadClearProps extends ComponentProps<'button'> {
	forceMount?: boolean
	asChild?: boolean
}
