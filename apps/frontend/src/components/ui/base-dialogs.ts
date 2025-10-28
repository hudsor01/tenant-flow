/**
 * Base Dialog and Modal Components
 *
 * These are reusable UI patterns that wrap ShadCN/UI components with
 * common CRUD operation patterns. Domains customize inline for their needs.
 *
 * PHILOSOPHY:
 * - Dialogs: Smaller, overlays content (use for quick actions)
 * - Modals: Full-page overlays (use for complex multi-step forms)
 *
 * USAGE PATTERN:
 * 1. Import base component
 * 2. Pass domain-specific props (title, steps, formType)
 * 3. Customize form fields inline via children render function
 * 4. Handle submission with TanStack Query mutation
 *
 * @example
 * ```tsx
 * import { CreateDialog } from '#components/ui/base-dialogs'
 *
 * <CreateDialog
 *   triggerText="Add Property"
 *   title="Add New Property"
 *   description="Add a new property to your portfolio"
 *   steps={PROPERTY_STEPS}
 *   formType="property"
 *   onSubmit={handleSubmit}
 *   onValidateStep={validateStep}
 * >
 *   {(currentStep) => (
 *     <>
 *       {currentStep === 1 && <PropertyBasicInfoStep />}
 *       {currentStep === 2 && <PropertyAddressStep />}
 *       {currentStep === 3 && <PropertyDetailsStep />}
 *     </>
 *   )}
 * </CreateDialog>
 * ```
 */

// CREATE OPERATIONS
export { CreateDialog } from './create-dialog'
export type { CreateDialogProps, FormStep } from './create-dialog'

export { CreateModal } from './create-modal'
export type { CreateModalProps } from './create-modal'

// EDIT/UPDATE OPERATIONS
export { EditDialog } from './edit-dialog'
export type { EditDialogProps } from './edit-dialog'

export { EditModal } from './edit-modal'
export type { EditModalProps } from './edit-modal'

// DELETE OPERATIONS
export { DeleteDialog } from './delete-dialog'
export type { DeleteDialogProps } from './delete-dialog'

// VIEW OPERATIONS (Read-Only)
export { ViewDialog } from './view-dialog'
export type { ViewDialogProps } from './view-dialog'

export { ViewModal } from './view-modal'
export type { ViewModalProps } from './view-modal'
