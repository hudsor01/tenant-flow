/**
 * Base Dialog Components
 *
 * Reusable dialog patterns for quick operations that stay on the current page.
 * For complex CRUD operations, use full-page routes with consolidated forms.
 *
 * ARCHITECTURE:
 * - Quick operations → Dialogs (CreateDialog, EditDialog)
 * - Complex CRUD → Full-page routes + consolidated forms
 *
 * USAGE:
 * - CreateDialog: Quick inline creates on list pages
 * - EditDialog: Special operations (renew, terminate, configure)
 *
 * @example
 * ```tsx
 * import { CreateDialog } from '#components/ui/base-dialogs'
 *
 * <CreateDialog
 *   triggerText="Add Unit"
 *   title="Create New Unit"
 *   description="Add a unit to this property"
 *   steps={UNIT_STEPS}
 *   formType="unit"
 *   onSubmit={handleSubmit}
 * >
 *   {(currentStep) => <UnitFormFields step={currentStep} />}
 * </CreateDialog>
 * ```
 */

// Quick inline create operations
export { CreateDialog } from './create-dialog'
export type { CreateDialogProps, FormStep } from './create-dialog'

// Special operations (renew, terminate, configure)
export { EditDialog } from './edit-dialog'
export type { EditDialogProps } from './edit-dialog'
