'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { supabaseClient } from '@repo/shared'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface LogoutButtonProps extends React.ComponentProps<typeof Button> {
	redirectPath?: string
}

export const LogoutButton = React.forwardRef<
	React.ElementRef<typeof Button>,
	LogoutButtonProps
>(({ className, redirectPath = '/auth/login', children, onClick, ...props }, ref) => {
	const router = useRouter()

	const handleLogout = async (event: React.MouseEvent<HTMLButtonElement>) => {
		await onClick?.(event)
		await supabaseClient.auth.signOut()
		router.push(redirectPath)
	}

	return (
		<Button
			ref={ref}
			className={cn("", className)}
			onClick={handleLogout}
			{...props}
		>
			{children || 'Logout'}
		</Button>
	)
})
LogoutButton.displayName = 'LogoutButton'
