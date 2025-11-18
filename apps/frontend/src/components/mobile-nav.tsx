'use client'

import { Button } from '#components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '#components/ui/sheet'
import { cn } from '#lib/utils'
import { Building2, Home, Menu, Users, Wrench } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { memo, useMemo } from 'react'

interface MobileNavItem {
	label: string
	href: string
	icon: React.ComponentType<{ className?: string }>
}

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
	{ label: 'Dashboard', href: '/manage', icon: Home },
	{ label: 'Properties', href: '/manage/properties', icon: Building2 },
	{ label: 'Tenants', href: '/manage/tenants', icon: Users },
	{ label: 'Maintenance', href: '/manage/maintenance', icon: Wrench }
]

const NavItem = memo(({ item, isActive }: { item: MobileNavItem; isActive: boolean }) => {
	const Icon = item.icon

	return (
		<Link
			href={item.href}
			className={cn(
				'flex h-14 w-16 flex-col items-center justify-center rounded-lg text-xs font-medium transition-colors',
				isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
			)}
			aria-label={`${item.label} navigation`}
			aria-current={isActive ? 'page' : undefined}
		>
			<Icon className="size-5 mb-1" aria-hidden />
			<span>{item.label}</span>
		</Link>
	)
})
NavItem.displayName = 'NavItem'

export const MobileNav = memo(() => {
	const pathname = usePathname()

	const activeIndex = useMemo(() => {
		// First, try to find an exact match
		const exactMatchIndex = MOBILE_NAV_ITEMS.findIndex(item => pathname === item.href)
		if (exactMatchIndex !== -1) return exactMatchIndex

		// If no exact match, find the first prefix match
		return MOBILE_NAV_ITEMS.findIndex(item => pathname.startsWith(`${item.href}/`))
	}, [pathname])

	return (
		<div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background md:hidden">
			<div className="flex items-center justify-between px-2 py-1">
				{MOBILE_NAV_ITEMS.map((item, index) => (
					<NavItem key={item.href} item={item} isActive={index === activeIndex} />
				))}

				<Sheet>
					<SheetTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="size-14 rounded-lg"
							aria-label="Open navigation menu"
						>
							<Menu className="size-5" />
						</Button>
					</SheetTrigger>
					<SheetContent side="bottom" className="h-[60vh] px-0">
						<div className="space-y-2 p-4">
							{MOBILE_NAV_ITEMS.map(item => {
								const Icon = item.icon
								const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
								return (
									<Link
										key={item.href}
										href={item.href}
										className={cn(
											'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
											isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
										)}
										aria-label={`${item.label} navigation`}
										aria-current={isActive ? 'page' : undefined}
									>
										<Icon className="size-4" aria-hidden />
										{item.label}
										</Link>
									)
							})}
						</div>
					</SheetContent>
				</Sheet>
			</div>
		</div>
	)
})

MobileNav.displayName = 'MobileNav'
