'use client'

import { useTheme } from 'next-themes'
import type { ToasterProps } from 'sonner'
import { Toaster as Sonner } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme } = useTheme()

	const resolvedTheme = (theme ?? 'system') as NonNullable<
		ToasterProps['theme']
	>

	return (
		<Sonner
			theme={resolvedTheme}
			className="toaster group"
			style={
				{
					'--normal-bg': 'var(--popover)',
					'--normal-text': 'var(--popover-foreground)',
					'--normal-border': 'var(--border)'
				} as React.CSSProperties
			}
			{...props}
		/>
	)
}

export { Toaster }
