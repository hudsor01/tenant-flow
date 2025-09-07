'use client'

import * as React from 'react'
import { Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ModeToggleProps extends React.ComponentProps<typeof Button> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export const ModeToggle = React.forwardRef<
  React.ElementRef<typeof Button>, 
  ModeToggleProps
>(({ className, variant = 'secondary', size = 'icon', ...props }, ref) => {
	const { setTheme, resolvedTheme } = useTheme()

	const toggleTheme = React.useCallback(() => {
		setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
	}, [resolvedTheme, setTheme])

	return (
		<Button
			ref={ref}
			variant={variant}
			size={size}
			className={cn("group/toggle size-8", className)}
			onClick={toggleTheme}
			{...props}
		>
			<Sun />
			<span className="sr-only">Toggle theme</span>
		</Button>
	)
})
ModeToggle.displayName = 'ModeToggle'
