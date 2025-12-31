'use client'

import { cn } from '#lib/utils'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

interface NavbarMobileToggleProps {
	isOpen: boolean
	onToggle: () => void
}

export function NavbarMobileToggle({ isOpen, onToggle }: NavbarMobileToggleProps) {
	const [mobileButtonTap, setMobileButtonTap] = useState(false)

	return (
		<button
			onMouseDown={() => setMobileButtonTap(true)}
			onMouseUp={() => setMobileButtonTap(false)}
			onClick={onToggle}
			aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
			data-testid="mobile-nav-toggle"
			className={cn(
				'md:hidden p-2 text-foreground/80 hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-fast',
				mobileButtonTap && 'scale-95'
			)}
		>
			{isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
		</button>
	)
}
