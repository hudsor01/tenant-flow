'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/css.utils'

interface MobileMenuProps {
	isOpen: boolean
	onClose: () => void
}

const mobileNavItems = [
	{ href: '/', label: 'Home' },
	{ href: '/features', label: 'Features' },
	{ href: '/pricing', label: 'Pricing' },
	{ href: '/demo', label: 'Demo' },
	{ href: '/resources', label: 'Resources' },
	{ href: '/auth', label: 'Sign In', variant: 'outline' },
	{ href: '/auth#register', label: 'Get Started', variant: 'primary' }
]

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
	const pathname = usePathname()

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -20 }}
					transition={{ duration: 0.2 }}
					className="fixed inset-x-0 top-20 z-40 md:hidden"
				>
					<div className="bg-background/95 backdrop-blur-md border-b">
						<div className="container mx-auto px-4 py-6 space-y-4">
							{mobileNavItems.map(item => (
								<Link
									key={item.href}
									href={item.href}
									onClick={onClose}
									className={cn(
										'block py-2 text-lg font-medium transition-colors',
										pathname === item.href
											? 'text-primary'
											: 'text-muted-foreground hover:text-primary',
										item.variant === 'primary' && 'text-primary',
										item.variant === 'outline' && 'text-muted-foreground'
									)}
								>
									{item.label}
								</Link>
							))}
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}