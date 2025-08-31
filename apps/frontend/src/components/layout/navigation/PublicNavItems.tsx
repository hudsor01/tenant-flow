import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/css.utils'

const navItems = [
	{ href: '/features', label: 'Features' },
	{ href: '/pricing', label: 'Pricing' },
	{ href: '/demo', label: 'Demo' },
	{ href: '/resources', label: 'Resources' }
]

export function PublicNavItems() {
	const pathname = usePathname()

	return (
		<>
			{navItems.map(item => (
				<Link
					key={item.href}
					href={item.href}
					className={cn(
						'text-sm font-medium transition-colors hover:text-primary',
						pathname === item.href
							? 'text-primary'
							: 'text-muted-foreground'
					)}
				>
					{item.label}
				</Link>
			))}
		</>
	)
}