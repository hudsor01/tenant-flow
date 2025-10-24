'use client'

import { Toaster } from 'sonner'

export function ToastProvider() {
	return (
		<Toaster
			position="top-right"
			toastOptions={{
				classNames: {
					toast: 'bg-background border-border',
					title: 'text-foreground',
					description: 'text-muted-foreground',
					actionButton: 'bg-primary text-primary-foreground',
					cancelButton: 'bg-muted text-muted-foreground',
					error: 'bg-destructive text-destructive-foreground border-destructive',
					success: 'bg-primary text-primary-foreground border-primary',
					warning: 'bg-amber-500 text-white border-amber-500',
					info: 'bg-blue-500 text-white border-blue-500'
				}
			}}
			richColors
			closeButton
		/>
	)
}
