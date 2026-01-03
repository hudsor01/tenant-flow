'use client'

import { useDirection } from '@radix-ui/react-direction'
import { Slot } from '@radix-ui/react-slot'
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef
} from 'react'
import type { ChangeEvent } from 'react'
import { cn } from '#lib/utils'
import { useAsRef } from '#hooks/use-as-ref'
import { useLazyRef } from '#hooks/use-lazy-ref'
import { FileUploadContext } from './context'
import { StoreContext, createStoreReducer } from './store'
import type {
	FileUploadProps,
	FileUploadContextValue,
	Store,
	StoreState,
	FileState
} from './types'

export function FileUpload(props: FileUploadProps) {
	const {
		value,
		defaultValue,
		onValueChange,
		onAccept,
		onFileAccept,
		onFileReject,
		onFileValidate,
		onUpload,
		accept,
		maxFiles,
		maxSize,
		dir: dirProp,
		label,
		name,
		asChild,
		disabled = false,
		invalid = false,
		multiple = false,
		required = false,
		children,
		className,
		...rootProps
	} = props

	const inputId = useId()
	const dropzoneId = useId()
	const listId = useId()
	const labelId = useId()

	const dir = useDirection(dirProp)
	const listeners = useLazyRef(() => new Set<() => void>()).current
	const files = useLazyRef<Map<File, FileState>>(() => new Map()).current
	const urlCache = useLazyRef(() => new WeakMap<File, string>()).current
	const inputRef = useRef<HTMLInputElement>(null)
	const isControlled = value !== undefined

	const propsRef = useAsRef({
		onValueChange,
		onAccept,
		onFileAccept,
		onFileReject,
		onFileValidate,
		onUpload
	})

	const store = useMemo<Store>(() => {
		let state: StoreState = {
			files,
			dragOver: false,
			invalid: invalid
		}

		const reducer = createStoreReducer(files, urlCache, propsRef)

		return {
			getState: () => state,
			dispatch: (action) => {
				state = reducer(state, action)
				for (const listener of listeners) {
					listener()
				}
			},
			subscribe: (listener) => {
				listeners.add(listener)
				return () => listeners.delete(listener)
			}
		}
	}, [listeners, files, invalid, propsRef, urlCache])

	const acceptTypes = useMemo(
		() => accept?.split(',').map((t) => t.trim()) ?? null,
		[accept]
	)

	const onProgress = useLazyRef(() => {
		let frame = 0
		return (file: File, progress: number) => {
			if (frame) return
			frame = requestAnimationFrame(() => {
				frame = 0
				store.dispatch({
					type: 'SET_PROGRESS',
					file,
					progress: Math.min(Math.max(0, progress), 100)
				})
			})
		}
	}).current

	useEffect(() => {
		if (isControlled) {
			store.dispatch({ type: 'SET_FILES', files: value })
		} else if (
			defaultValue &&
			defaultValue.length > 0 &&
			!store.getState().files.size
		) {
			store.dispatch({ type: 'SET_FILES', files: defaultValue })
		}
	}, [value, defaultValue, isControlled, store])

	useEffect(() => {
		return () => {
			for (const file of files.keys()) {
				const cachedUrl = urlCache.get(file)
				if (cachedUrl) {
					URL.revokeObjectURL(cachedUrl)
				}
			}
		}
	}, [files, urlCache])

	const onFilesUpload = useCallback(
		async (filesToUpload: File[]) => {
			try {
				for (const file of filesToUpload) {
					store.dispatch({ type: 'SET_PROGRESS', file, progress: 0 })
				}

				if (propsRef.current.onUpload) {
					await propsRef.current.onUpload(filesToUpload, {
						onProgress,
						onSuccess: (file) => {
							store.dispatch({ type: 'SET_SUCCESS', file })
						},
						onError: (file, error) => {
							store.dispatch({
								type: 'SET_ERROR',
								file,
								error: error.message ?? 'Upload failed'
							})
						}
					})
				} else {
					for (const file of filesToUpload) {
						store.dispatch({ type: 'SET_SUCCESS', file })
					}
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Upload failed'
				for (const file of filesToUpload) {
					store.dispatch({
						type: 'SET_ERROR',
						file,
						error: errorMessage
					})
				}
			}
		},
		[store, propsRef, onProgress]
	)

	const onFilesChange = useCallback(
		(originalFiles: File[]) => {
			if (disabled) return

			let filesToProcess = [...originalFiles]
			let isInvalid = false

			if (maxFiles) {
				const currentCount = store.getState().files.size
				const remainingSlotCount = Math.max(0, maxFiles - currentCount)

				if (remainingSlotCount < filesToProcess.length) {
					const rejectedFiles = filesToProcess.slice(remainingSlotCount)
					isInvalid = true

					filesToProcess = filesToProcess.slice(0, remainingSlotCount)

					for (const file of rejectedFiles) {
						let rejectionMessage = `Maximum ${maxFiles} files allowed`

						if (propsRef.current.onFileValidate) {
							const validationMessage = propsRef.current.onFileValidate(file)
							if (validationMessage) {
								rejectionMessage = validationMessage
							}
						}

						propsRef.current.onFileReject?.(file, rejectionMessage)
					}
				}
			}

			const acceptedFiles: File[] = []

			for (const file of filesToProcess) {
				let rejected = false
				let rejectionMessage = ''

				if (propsRef.current.onFileValidate) {
					const validationMessage = propsRef.current.onFileValidate(file)
					if (validationMessage) {
						rejectionMessage = validationMessage
						propsRef.current.onFileReject?.(file, rejectionMessage)
						rejected = true
						isInvalid = true
						continue
					}
				}

				if (acceptTypes) {
					const fileType = file.type
					const fileExtension = `.${file.name.split('.').pop()}`

					if (
						!acceptTypes.some(
							(type) =>
								type === fileType ||
								type === fileExtension ||
								(type.includes('/*') &&
									fileType.startsWith(type.replace('/*', '/')))
						)
					) {
						rejectionMessage = 'File type not accepted'
						propsRef.current.onFileReject?.(file, rejectionMessage)
						rejected = true
						isInvalid = true
					}
				}

				if (maxSize && file.size > maxSize) {
					rejectionMessage = 'File too large'
					propsRef.current.onFileReject?.(file, rejectionMessage)
					rejected = true
					isInvalid = true
				}

				if (!rejected) {
					acceptedFiles.push(file)
				}
			}

			if (isInvalid) {
				store.dispatch({ type: 'SET_INVALID', invalid: true })
				setTimeout(() => {
					store.dispatch({ type: 'SET_INVALID', invalid: false })
				}, 2000)
			}

			if (acceptedFiles.length > 0) {
				store.dispatch({ type: 'ADD_FILES', files: acceptedFiles })

				if (isControlled && propsRef.current.onValueChange) {
					const currentFiles = Array.from(store.getState().files.values()).map(
						(f) => f.file
					)
					propsRef.current.onValueChange([...currentFiles])
				}

				if (propsRef.current.onAccept) {
					propsRef.current.onAccept(acceptedFiles)
				}

				for (const file of acceptedFiles) {
					propsRef.current.onFileAccept?.(file)
				}

				if (propsRef.current.onUpload) {
					requestAnimationFrame(() => {
						onFilesUpload(acceptedFiles)
					})
				}
			}
		},
		[
			store,
			isControlled,
			propsRef,
			onFilesUpload,
			maxFiles,
			acceptTypes,
			maxSize,
			disabled
		]
	)

	const onInputChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const changedFiles = Array.from(event.target.files ?? [])
			onFilesChange(changedFiles)
			event.target.value = ''
		},
		[onFilesChange]
	)

	const contextValue = useMemo<FileUploadContextValue>(
		() => ({
			dropzoneId,
			inputId,
			listId,
			labelId,
			dir,
			disabled,
			inputRef,
			urlCache
		}),
		[dropzoneId, inputId, listId, labelId, dir, disabled, urlCache]
	)

	const RootPrimitive = asChild ? Slot : 'div'

	return (
		<StoreContext.Provider value={store}>
			<FileUploadContext.Provider value={contextValue}>
				<RootPrimitive
					data-disabled={disabled ? '' : undefined}
					data-slot="file-upload"
					dir={dir}
					{...rootProps}
					className={cn('relative flex flex-col gap-2', className)}
				>
					{children}
					<input
						type="file"
						id={inputId}
						aria-labelledby={labelId}
						aria-describedby={dropzoneId}
						ref={inputRef}
						tabIndex={-1}
						accept={accept}
						name={name}
						className="sr-only"
						disabled={disabled}
						multiple={multiple}
						required={required}
						onChange={onInputChange}
					/>
					<span id={labelId} className="sr-only">
						{label ?? 'File upload'}
					</span>
				</RootPrimitive>
			</FileUploadContext.Provider>
		</StoreContext.Provider>
	)
}
