'use client'

import { Button } from '#components/ui/button'
import { cn } from '#lib/utils'
import type { LucideIcon } from 'lucide-react'
import { Plus } from 'lucide-react'
import Link from 'next/link'

interface FloatingActionButtonProps {
	href: string
	label: string
	icon?: LucideIcon
	className?: string
}

export function FloatingActionButton({
	href,
	label,
	icon: Icon = Plus,
	className
}: FloatingActionButtonProps) {
	return (
		<Button
			asChild
			size="icon"
			className={cn(
				'fixed right-4 bottom-24 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition hover:scale-105 focus-visible:ring-4 focus-visible:ring-primary/30 md:hidden',
				className
			)}
			aria-label={label}
		>
			<Link href={href}>
				<Icon aria-hidden className="size-5" />
			</Link>
		</Button>
	)
}
