import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'

interface MobileMenuButtonProps {
	isOpen: boolean
	onToggle: () => void
	onSidebarToggle?: () => void
	context: 'public' | 'authenticated' | 'tenant-portal'
}

export function MobileMenuButton({ 
	isOpen, 
	onToggle, 
	onSidebarToggle,
	context 
}: MobileMenuButtonProps) {
	// For authenticated context, use sidebar toggle
	if (context === 'authenticated' && onSidebarToggle) {
		return (
			<Button
				variant="ghost"
				size="icon"
				className="md:hidden"
				onClick={onSidebarToggle}
				aria-label="Toggle sidebar"
			>
				<Menu className="h-5 w-5" />
			</Button>
		)
	}

	// For public context, use mobile menu
	return (
		<button
			onClick={onToggle}
			className="relative z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-md transition-all hover:bg-white/20 md:hidden"
			aria-label={isOpen ? 'Close menu' : 'Open menu'}
		>
			{isOpen ? (
				<X className="h-5 w-5 text-white" />
			) : (
				<Menu className="h-5 w-5 text-white" />
			)}
		</button>
	)
}