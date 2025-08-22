/**
 * Form Components - React 19 + RHF Direct Usage
 *
 * Simplified form architecture using React Hook Form directly:
 * - No over-abstractions or unnecessary component splits
 * - Direct RHF usage (useForm, useController, etc.)
 * - Single responsibility components that are genuinely reused
 */

// Core Form Components (using RHF directly)
export { PropertyForm } from './property-form'
export { TenantForm } from './tenant-form'
export { LeaseForm } from './lease-form'

// Remaining Shared Components
export { CollapsibleFormSection } from './collapsible-form-section'
export { LeaseFormClient } from './lease-form-client'
export { LeaseFormFields } from './lease-form-fields'
export { LeaseTermsSection } from './lease-terms-section'
