export type ImportStep = 'upload' | 'validate' | 'confirm'

export interface BulkImportResult {
  success: boolean
  imported: number
  failed: number
  errors: Array<{ row: number; error: string }>
}

export interface ParsedRow {
  row: number
  data: Record<string, string>
  errors: string[]
}

export interface BulkImportStepperProps {
  currentStep: ImportStep
  onStepChange: (step: ImportStep) => void
  modalId: string
}
