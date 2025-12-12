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
import type { ImportStep } from '@repo/shared/types/bulk-import'

export function PropertyBulkImportDialog() {
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
        Bulk Import
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Properties</DialogTitle>
            <DialogDescription>
              Upload a CSV file to add multiple properties at once.
            </DialogDescription>
          </DialogHeader>

          <BulkImportStepper
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            onComplete={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
