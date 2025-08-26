import { X } from 'lucide-react'
import { Dialog, DialogContent } from '../ui/dialog'
import { Button } from '../ui/button'
<<<<<<< HEAD
// Define props inline to avoid missing types
interface UpgradePromptModalProps {
	isOpen: boolean
	onClose: () => void
	reason?: string
}
=======
import type { UpgradePromptModalProps } from '@/types'
>>>>>>> origin/main

export function UpgradePromptModal({
	isOpen,
	onClose,
	reason
}: UpgradePromptModalProps) {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-md">
				<div className="relative p-6">
					<button
						onClick={onClose}
<<<<<<< HEAD
						className="hover:bg-muted absolute right-4 top-4 rounded-full p-2 transition-colors"
=======
						className="hover:bg-muted absolute top-4 right-4 rounded-full p-2 transition-colors"
>>>>>>> origin/main
					>
						<X className="h-4 w-4" />
					</button>

					<div className="text-center">
						<h2 className="mb-2 text-xl font-bold">
							Feature Coming Soon
						</h2>
						<p className="text-muted-foreground mb-4">{reason}</p>
						<p className="text-muted-foreground mb-6 text-sm">
							Upgrade and billing features will be available in
							the next release.
						</p>
						<Button
							onClick={onClose}
							variant="default"
							className="w-full"
						>
							Got it
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
