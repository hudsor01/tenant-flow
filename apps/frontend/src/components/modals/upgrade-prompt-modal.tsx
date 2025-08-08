import { X } from 'lucide-react'
import { Dialog, DialogContent } from '../ui/dialog'
import { Button } from '../ui/button'

interface UpgradePromptModalProps {
	isOpen: boolean
	onClose: () => void
	action: string
	reason: string
	currentPlan: string
	suggestedPlan?: string
}

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
						className="absolute top-4 right-4 rounded-full p-2 hover:bg-muted transition-colors"
					>
						<X className="h-4 w-4" />
					</button>

					<div className="text-center">
						<h2 className="text-xl font-bold mb-2">
							Feature Coming Soon
						</h2>
						<p className="text-muted-foreground mb-4">
							{reason}
						</p>
						<p className="text-sm text-muted-foreground mb-6">
							Upgrade and billing features will be available in the next release.
						</p>
						<Button onClick={onClose} variant="default" className="w-full">
							Got it
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}