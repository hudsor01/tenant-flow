'use client'

import { Button } from '#components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '#components/ui/sheet'
import { mobileNavItemClasses, mobileNavLinkClasses } from '#lib/design-system'
import { Building2, Home, LogOut, Menu, Users, Wrench } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { memo, useMemo, useTransition } from 'react'
import { signOut } from '#app/actions/auth'

interface MobileNavItem {
	label: string
	href: string
	icon: React.ComponentType<{ className?: string }>
}

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
	{ label: 'Dashboard', href: '/', icon: Home },
	{ label: 'Properties', href: '/properties', icon: Building2 },
	{ label: 'Tenants', href: '/tenants', icon: Users },
	{ label: 'Maintenance', href: '/maintenance', icon: Wrench }
]

const NavItem = memo(({ item, isActive }: { item: MobileNavItem; isActive: boolean }) => {
	const Icon = item.icon

	return (
		<Link
			href={item.href}
			className={mobileNavItemClasses(isActive)}
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
	const [isPending, startTransition] = useTransition()

	const activeIndex = useMemo(() => {
		// First, try to find an exact match
		const exactMatchIndex = MOBILE_NAV_ITEMS.findIndex(item => pathname === item.href)
		if (exactMatchIndex !== -1) return exactMatchIndex

		// If no exact match, find the first prefix match
		return MOBILE_NAV_ITEMS.findIndex(item => pathname.startsWith(`${item.href}/`))
	}, [pathname])

	const handleSignOut = () => {
		startTransition(async () => {
			await signOut()
		})
	}

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
						<div className="flex flex-col h-full">
							<div className="flex-1 space-y-2 p-4">
								{MOBILE_NAV_ITEMS.map(item => {
									const Icon = item.icon
									const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
									return (
										<Link
											key={item.href}
											href={item.href}
											className={mobileNavLinkClasses(isActive)}
											aria-label={`${item.label} navigation`}
											aria-current={isActive ? 'page' : undefined}
										>
											<Icon className="size-4" aria-hidden />
											{item.label}
										</Link>
									)
								})}
							</div>

							{/* Logout Button */}
							<div className="border-t border-border p-4">
								<Button
									variant="outline"
									className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
									onClick={handleSignOut}
									disabled={isPending}
									aria-label="Sign out"
								>
									<LogOut className="size-4" aria-hidden />
									{isPending ? 'Signing out...' : 'Sign Out'}
								</Button>
							</div>
						</div>
					</SheetContent>
				</Sheet>
			</div>
		</div>
	)
})

MobileNav.displayName = 'MobileNav'
