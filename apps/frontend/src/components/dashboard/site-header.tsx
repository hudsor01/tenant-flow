'use client'

import { NavUser } from '@/components/dashboard/nav-user'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

type SiteHeaderProps = React.ComponentProps<'header'>

export const SiteHeader = React.forwardRef<HTMLElement, SiteHeaderProps>(
	({ className, ...props }, ref) => {
		const router = useRouter()

		return (
			<header
				ref={ref}
				className={cn(
					'flex h-16 shrink-0 items-center gap-2 border-b px-6',
					className
				)}
				{...props}
			>
				<Button variant="ghost" size="icon" onClick={() => router.back()}>
					<ArrowLeft className="size-5" />
				</Button>
				{/* User Avatar */}
				<div className="ml-auto flex items-center gap-2">
					<NavUser />
				</div>
			</header>
		)
	}
)
SiteHeader.displayName = 'SiteHeader'
