/**
 * Navigation - Server Component
 * Static navigation with locale-aware links
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface NavigationProps {
	locale: string
}

export function Navigation({ locale }: NavigationProps) {
	return (
		<nav className="sticky top-0 z-50 border-b border-gray-2 bg-white bg-white/95 backdrop-blur-sm">
			<div className="container mx-auto flex h-16 items-center justify-between px-4">
				<Link
					href={`/${locale}`}
					className="flex items-center space-x-2"
				>
					<i className="i-lucide-building-2 text-primary h-8 w-8"  />
					<span className="text-xl font-bold text-gray-9">
						TenantFlow
					</span>
				</Link>

				<div className="hidden items-center space-x-8 md:flex">
					<Link
						href={`/${locale}/features`}
						className="text-gray-6 transition-colors hover:text-gray-9"
					>
						Features
					</Link>
					<Link
						href={`/${locale}/pricing`}
						className="text-gray-6 transition-colors hover:text-gray-9"
					>
						Pricing
					</Link>
					<Link
						href={`/${locale}/customers`}
						className="text-gray-6 transition-colors hover:text-gray-9"
					>
						Customers
					</Link>
					<Link
						href={`/${locale}/resources`}
						className="text-gray-6 transition-colors hover:text-gray-9"
					>
						Resources
					</Link>
				</div>

				<div className="flex items-center space-x-4">
					<Link href={`/auth/login`}>
						<Button
							variant="ghost"
							className="hidden sm:inline-flex"
						>
							Sign In
						</Button>
					</Link>
					<Link href={`/auth/signup`}>
						<Button className="bg-orange-5 font-semibold text-white hover:bg-orange-6">
							Start Free Trial
						</Button>
					</Link>
				</div>
			</div>
		</nav>
	)
}
