import {
	FileArchiveIcon,
	FileAudioIcon,
	FileCodeIcon,
	FileCogIcon,
	FileIcon,
	FileTextIcon,
	FileVideoIcon
} from 'lucide-react'
import * as React from 'react'

export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B'
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
	const i = Math.floor(Math.log(bytes) / Math.log(1024))
	return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${sizes[i]}`
}

export function getFileIcon(file: File): React.ReactElement {
	const type = file.type
	const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

	if (type.startsWith('video/')) {
		return React.createElement(FileVideoIcon)
	}

	if (type.startsWith('audio/')) {
		return React.createElement(FileAudioIcon)
	}

	if (
		type.startsWith('text/') ||
		['txt', 'md', 'rtf', 'pdf'].includes(extension)
	) {
		return React.createElement(FileTextIcon)
	}

	if (
		[
			'html',
			'css',
			'js',
			'jsx',
			'ts',
			'tsx',
			'json',
			'xml',
			'php',
			'py',
			'rb',
			'java',
			'c',
			'cpp',
			'cs'
		].includes(extension)
	) {
		return React.createElement(FileCodeIcon)
	}

	if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
		return React.createElement(FileArchiveIcon)
	}

	if (
		['exe', 'msi', 'app', 'apk', 'deb', 'rpm'].includes(extension) ||
		type.startsWith('application/')
	) {
		return React.createElement(FileCogIcon)
	}

	return React.createElement(FileIcon)
}
