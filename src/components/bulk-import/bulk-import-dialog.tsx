'use client'

import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { FileUp } from 'lucide-react'
import { useCallback, useState } from 'react'
import { BulkImportStepper } from './bulk-import-stepper'
import type { ImportStep } from '#types/api-contracts'
import type { BulkImportConfig } from './types'

interface BulkImportDialogProps<T> {
	config: BulkImportConfig<T>
	triggerLabel?: string
}

/**
 * Generic bulk-import dialog. Consumers pass an entity-specific
 * `BulkImportConfig<T>` and an optional trigger button label. Internal
 * stepper state resets on close. Close is blocked while an import is in
 * flight so the user cannot walk away mid-batch and miss partial results.
 */
export function BulkImportDialog<T>({
	config,
	triggerLabel = 'Bulk Import'
}: BulkImportDialogProps<T>) {
	const [open, setOpen] = useState(false)
	const [currentStep, setCurrentStep] = useState<ImportStep>('upload')
	const [importPending, setImportPending] = useState(false)

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen && importPending) return
		setOpen(isOpen)
		if (!isOpen) {
			setCurrentStep('upload')
		}
	}

	const handleInteractOutside = useCallback(
		(e: Event) => {
			if (importPending) e.preventDefault()
		},
		[importPending]
	)

	// Memoize so the stepper's auto-close `useEffect` doesn't tear down
	// and recreate the 5-second timer on every parent re-render.
	const handleComplete = useCallback(() => setOpen(false), [])

	return (
		<>
			<Button
				variant="outline"
				size="default"
				className="min-h-11 transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-primary/40"
				onClick={() => setOpen(true)}
			>
				<FileUp className="size-4 mr-2" />
				{triggerLabel}
			</Button>

			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent
					className="sm:max-w-3xl max-h-[90vh] overflow-y-auto"
					onInteractOutside={handleInteractOutside}
					onEscapeKeyDown={e => { if (importPending) e.preventDefault() }}
				>
					<DialogHeader>
						<DialogTitle>Import {config.entityLabel.plural}</DialogTitle>
						<DialogDescription>
							Upload a CSV file to add multiple {config.entityLabel.plural.toLowerCase()} at once.
						</DialogDescription>
					</DialogHeader>

					<BulkImportStepper
						config={config}
						currentStep={currentStep}
						onStepChange={setCurrentStep}
						onComplete={handleComplete}
						onPendingChange={setImportPending}
					/>
				</DialogContent>
			</Dialog>
		</>
	)
}
