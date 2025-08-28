/**
 * Optimized Navigation - Server Component
 * Static navigation with locale-aware links
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface OptimizedNavigationProps {
	locale: string
}

export function OptimizedNavigation({ locale }: OptimizedNavigationProps) {
	return (
		<nav className="sticky top-0 z-50 border-b border-gray-200 bg-white bg-white/95 backdrop-blur-sm">
			<div className="container mx-auto flex h-16 items-center justify-between px-4">
				<Link
					href={`/${locale}`}
					className="flex items-center space-x-2"
				>
					<i className="i-lucide-building-2 inline-block text-primary h-8 w-8"  />
					<span className="text-xl font-bold text-gray-900">
						TenantFlow
					</span>
				</Link>

				<div className="hidden items-center space-x-8 md:flex">
					<Link
						href={`/${locale}/features`}
						className="text-gray-600 transition-colors hover:text-gray-900"
					>
						Features
					</Link>
					<Link
						href={`/${locale}/pricing`}
						className="text-gray-600 transition-colors hover:text-gray-900"
					>
						Pricing
					</Link>
					<Link
						href={`/${locale}/customers`}
						className="text-gray-600 transition-colors hover:text-gray-900"
					>
						Customers
					</Link>
					<Link
						href={`/${locale}/resources`}
						className="text-gray-600 transition-colors hover:text-gray-900"
					>
						Resources
					</Link>
				</div>

				<div className="flex items-center space-x-4">
					<Link href={`/${locale}/login`}>
						<Button
							variant="ghost"
							className="hidden sm:inline-flex"
						>
							Sign In
						</Button>
					</Link>
					<Link href={`/${locale}/signup`}>
						<Button className="bg-orange-500 font-semibold text-white hover:bg-orange-600">
							Start Free Trial
						</Button>
					</Link>
				</div>
			</div>
		</nav>
	)
}
