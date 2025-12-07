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
import { useModalStore } from '#stores/modal-store'
import { BulkImportStepper } from './bulk-import-stepper'
import type { ImportStep } from '@repo/shared/types/bulk-import'

export function PropertyBulkImportDialog() {
  const { openModal, closeModal, isModalOpen } = useModalStore()
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload')

  const modalId = 'bulk-import-properties'
  const isOpen = isModalOpen(modalId)

  const handleOpenModal = () => {
    openModal(
      modalId,
      {},
      {
        type: 'dialog',
        size: 'lg',
        animationVariant: 'fade',
        closeOnOutsideClick: true,
        closeOnEscape: true
      }
    )
  }

  const handleCloseModal = () => {
    closeModal(modalId)
    setCurrentStep('upload')
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCloseModal()
    }
  }

  return (
    <>
    <Button
        variant= "outline"
  size = "default"
  className = "min-h-11 transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-primary/40"
  onClick = { handleOpenModal }
    >
    <FileUp className="size-4 mr-2" />
      Bulk Import
        </Button>

        < Dialog open = { isOpen } onOpenChange = { handleOpenChange } >
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" >
            <DialogHeader>
            <DialogTitle>Import Properties </DialogTitle>
              <DialogDescription>
              Upload a CSV file to add multiple properties at once.
            </DialogDescription>
    </DialogHeader>

    < BulkImportStepper
  currentStep = { currentStep }
  onStepChange = { setCurrentStep }
  modalId = { modalId }
    />
    </DialogContent>
    </Dialog>
    </>
  )
}
