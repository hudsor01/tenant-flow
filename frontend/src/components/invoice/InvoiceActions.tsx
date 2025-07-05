import { Download, Eye, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InvoiceActionsProps {
	onGenerateInvoice: () => void
	onPreview: () => void
	onPrepareEmail: () => void
}

export function InvoiceActions({
	onGenerateInvoice,
	onPreview,
	onPrepareEmail
}: InvoiceActionsProps) {
	return (
		<div className="flex justify-center gap-4">
			<Button
				onClick={onGenerateInvoice}
				className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 font-semibold shadow-lg transition-all duration-200 hover:shadow-xl"
				size="lg"
			>
				<div className="flex items-center gap-2">
					<Download className="h-4 w-4" />
					<span>Generate Invoice</span>
				</div>
			</Button>

			<Button
				onClick={onPreview}
				size="lg"
				className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 font-semibold shadow-lg transition-all duration-200 hover:shadow-xl"
			>
				<div className="flex items-center gap-2">
					<Eye className="h-4 w-4" />
					<span>Preview</span>
				</div>
			</Button>

			<Button
				onClick={onPrepareEmail}
				size="lg"
				className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 font-semibold shadow-lg transition-all duration-200 hover:shadow-xl"
			>
				<div className="flex items-center gap-2">
					<Mail className="h-4 w-4" />
					<span>Prepare Email</span>
				</div>
			</Button>
		</div>
	)
}
