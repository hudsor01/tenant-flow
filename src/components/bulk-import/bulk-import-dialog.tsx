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
import { useState } from 'react'
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
 * stepper state resets on close.
 */
export function BulkImportDialog<T>({
	config,
	triggerLabel = 'Bulk Import'
}: BulkImportDialogProps<T>) {
	const [open, setOpen] = useState(false)
	const [currentStep, setCurrentStep] = useState<ImportStep>('upload')

	const handleOpenChange = (isOpen: boolean) => {
		setOpen(isOpen)
		if (!isOpen) {
			setCurrentStep('upload')
		}
	}

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
				<DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
						onComplete={() => setOpen(false)}
					/>
				</DialogContent>
			</Dialog>
		</>
	)
}
