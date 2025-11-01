type FileWithMeta = File & {
	preview?: string
	errors: readonly { code: string; message: string }[]
}

import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'

type HoistedMocks = {
	toastInfoMock: ReturnType<typeof vi.fn>
	toastSuccessMock: ReturnType<typeof vi.fn>
	toastErrorMock: ReturnType<typeof vi.fn>
	loggerInfoMock: ReturnType<typeof vi.fn>
	loggerErrorMock: ReturnType<typeof vi.fn>
	getPublicUrlMock: ReturnType<typeof vi.fn>
	fromMock: ReturnType<typeof vi.fn>
	uploadState: {
		files: FileWithMeta[]
		successes: string[]
		isSuccess: boolean
	}
	setFilesSpy: ReturnType<typeof vi.fn>
	onUploadMock: ReturnType<typeof vi.fn>
	compressImageMock: ReturnType<typeof vi.fn>
	MockHEICConversionError: typeof Error
	formatFileSizeMock: (bytes: number) => string
	isHEICFileMock: (file: File) => boolean
	createObjectURLMock: ReturnType<typeof vi.fn>
}

const {
	toastInfoMock,
	toastSuccessMock,
	toastErrorMock,
	loggerInfoMock,
	loggerErrorMock,
	getPublicUrlMock,
	fromMock,
	uploadState,
	setFilesSpy,
	onUploadMock,
	compressImageMock,
	MockHEICConversionError,
	formatFileSizeMock,
	isHEICFileMock,
	createObjectURLMock
} = vi.hoisted(() => {
	const toastInfoMock = vi.fn()
	const toastSuccessMock = vi.fn()
	const toastErrorMock = vi.fn()

	const loggerInfoMock = vi.fn()
	const loggerErrorMock = vi.fn()

	const getPublicUrlMock = vi.fn((path: string) => ({
		data: {
			publicUrl: `https://cdn.supabase.test/${path}`
		}
	}))

	const fromMock = vi.fn(() => ({
		getPublicUrl: getPublicUrlMock
	}))

	const uploadState = {
		files: [] as FileWithMeta[],
		successes: [] as string[],
		isSuccess: false
	}

	const setFilesSpy = vi.fn((files: FileWithMeta[]) => {
		uploadState.files = files
	})

	const onUploadMock = vi.fn(async () => {
		uploadState.isSuccess = true
		uploadState.successes = uploadState.files.map(file => file.name)
	})

	const compressImageMock = vi.fn(async (file: File) => {
		const convertedName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
		const compressedFile = new File(['compressed'], convertedName, {
			type: 'image/jpeg'
		})

		return {
			file: compressedFile,
			originalSize: file.size || 1024,
			compressedSize: 256,
			compressionRatio: 0.25,
			previewUrl: 'blob:compressed-url'
		}
	})

	class MockHEICConversionError extends Error {
		constructor(message: string) {
			super(message)
			this.name = 'HEICConversionError'
		}
	}

	const formatFileSizeMock = (bytes: number): string => `${bytes} bytes`

	const isHEICFileMock = (file: File): boolean =>
		file.type === 'image/heic' ||
		file.type === 'image/heif' ||
		file.name.toLowerCase().endsWith('.heic') ||
		file.name.toLowerCase().endsWith('.heif')

	const createObjectURLMock = vi.fn(() => 'blob:generated-url')

	return {
		toastInfoMock,
		toastSuccessMock,
		toastErrorMock,
		loggerInfoMock,
		loggerErrorMock,
		getPublicUrlMock,
		fromMock,
		uploadState,
		setFilesSpy,
		onUploadMock,
		compressImageMock,
		MockHEICConversionError,
		formatFileSizeMock,
		isHEICFileMock,
		createObjectURLMock
	}
}) as HoistedMocks

vi.mock('sonner', () => ({
	toast: {
		info: toastInfoMock,
		success: toastSuccessMock,
		error: toastErrorMock
	}
}))

vi.mock('@repo/shared/lib/frontend-logger', () => ({
	createLogger: () => ({
		info: loggerInfoMock,
		error: loggerErrorMock
	})
}))

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		storage: {
			from: fromMock
		}
	})
}))

vi.mock('#hooks/use-supabase-upload', () => ({
	useSupabaseUpload: vi.fn(() => ({
		get files() {
			return uploadState.files
		},
		setFiles: (files: FileWithMeta[]) => {
			setFilesSpy(files)
			uploadState.files = files
		},
		get successes() {
			return uploadState.successes
		},
		get isSuccess() {
			return uploadState.isSuccess
		},
		loading: false,
		errors: [],
		setErrors: vi.fn(),
		onUpload: onUploadMock,
		maxFileSize: 10 * 1024 * 1024,
		maxFiles: 1,
		allowedMimeTypes: ['image/*'],
		getRootProps: vi.fn(),
		getInputProps: vi.fn(),
		removeFile: vi.fn(),
		clearFiles: vi.fn()
	}))
}))

vi.mock('#lib/image-compression', () => ({
	compressImage: compressImageMock,
	formatFileSize: formatFileSizeMock,
	HEICConversionError: MockHEICConversionError,
	isHEICFile: isHEICFileMock
}))

Object.defineProperty(global.URL, 'createObjectURL', {
	configurable: true,
	value: createObjectURLMock
})

import { usePropertyImageUpload } from '../use-property-image-upload'

describe('usePropertyImageUpload - HEIC compression flow', () => {
	beforeEach(() => {
		uploadState.files = []
		uploadState.successes = []
		uploadState.isSuccess = false
		setFilesSpy.mockClear()
		onUploadMock.mockClear()
		compressImageMock.mockClear()
		getPublicUrlMock.mockClear()
		fromMock.mockClear()
		toastInfoMock.mockClear()
		toastSuccessMock.mockClear()
		toastErrorMock.mockClear()
		createObjectURLMock.mockClear()
		loggerInfoMock.mockClear()
		loggerErrorMock.mockClear()
		onUploadMock.mockImplementation(async () => {
			uploadState.isSuccess = true
			uploadState.successes = uploadState.files.map(file => file.name)
		})
	})

	it('compresses HEIC files during property image upload and resolves with public URL', async () => {
		const onUploadComplete = vi.fn()

		const { result, rerender } = renderHook(() =>
			usePropertyImageUpload({
				propertyId: 'prop-123',
				onUploadComplete
			})
		)

		const heicFile = new File(['heic-content'], 'living-room.heic', {
			type: 'image/heic'
		})

		const heicFileWithMeta = Object.assign(heicFile, {
			errors: [] as const
		})

		await act(async () => {
			result.current.setFiles([heicFileWithMeta])
			rerender()
		})

	await waitFor(() => expect(onUploadMock).toHaveBeenCalledTimes(1))

		expect(compressImageMock).toHaveBeenCalledTimes(1)
		expect(compressImageMock).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'living-room.heic' })
		)

		expect(toastInfoMock).toHaveBeenCalledWith(
			'Converting and compressing living-room.heic...'
		)

		expect(setFilesSpy).toHaveBeenCalled()
		const latestSetFilesArgs = setFilesSpy.mock.calls.at(-1)?.[0]
		expect(latestSetFilesArgs?.[0]?.name).toBe('living-room.jpg')

		expect(createObjectURLMock).toHaveBeenCalled()

		await waitFor(() => expect(onUploadComplete).toHaveBeenCalledTimes(1))
		expect(onUploadComplete).toHaveBeenCalledWith(
			'https://cdn.supabase.test/properties/prop-123/living-room.jpg'
		)

		expect(getPublicUrlMock).toHaveBeenCalledWith(
			'properties/prop-123/living-room.jpg'
		)
		expect(toastSuccessMock).toHaveBeenCalledWith(
			expect.stringContaining('Compressed:')
		)
		expect(toastErrorMock).not.toHaveBeenCalled()
	})
})
