'use client'

import { cn } from '#lib/utils'
import { useTheme } from 'next-themes'
import { useToast } from '#hooks/use-toast'
import type { ToasterProps } from 'sonner'
import { Toaster as Sonner, toast as sonnerToast } from 'sonner'
import { useEffect } from 'react'

const Toaster = ({ className, toastOptions, ...props }: ToasterProps) => {
	const { theme } = useTheme()
	const { toasts, removeToast } = useToast()

	const resolvedTheme = (theme ?? 'system') as NonNullable<
		ToasterProps['theme']
	>

	// Sync store toasts with sonner
	useEffect(() => {
		toasts.forEach(storeToast => {
			// Check if this toast is already shown by sonner
			const existingToast = document.querySelector(`[data-toast-id="${storeToast.id}"]`)
			if (!existingToast) {
				const toastFn = storeToast.type === 'error' ? sonnerToast.error
					: storeToast.type === 'success' ? sonnerToast.success
					: storeToast.type === 'warning' ? sonnerToast.warning
					: sonnerToast

				toastFn(storeToast.title || storeToast.description || '', {
					id: storeToast.id,
					description: storeToast.description,
					duration: storeToast.duration || 4000,
					onDismiss: () => removeToast(storeToast.id)
				})
			}
		})
	}, [toasts, removeToast])

	return (
		<Sonner
			theme={resolvedTheme}
			className={cn('toaster group', className)}
			toastOptions={{
				duration: toastOptions?.duration ?? 4000,
				...toastOptions,
				className: cn('sonner-toast', toastOptions?.className),
				classNames: {
					...toastOptions?.classNames,
					title: cn('sonner-toast__title', toastOptions?.classNames?.title),
					description: cn(
						'sonner-toast__description',
						toastOptions?.classNames?.description
					),
					actionButton: cn(
						'sonner-toast__action',
						toastOptions?.classNames?.actionButton
					),
					cancelButton: cn(
						'sonner-toast__cancel',
						toastOptions?.classNames?.cancelButton
					)
				}
			}}
			{...props}
		/>
	)
}

export { Toaster }