/**
 * Form Components - Next.js 15 Architecture
 * 
 * Decomposed from monolithic form-patterns.tsx into focused components:
 * - Server components for static form structure 
 * - Client islands for specific interactive behaviors
 * - Single responsibility principle for maintainability
 */

// Form Container & Layout (new decomposed components)
export { FormContainer } from './form-container'
export { FormLoadingOverlay } from './form-loading-overlay'

// Form Fields (new decomposed components)
export { 
  FormField, 
  TextField, 
  TextareaField, 
  SelectField 
} from './form-fields'

// Form Sections (new decomposed components)
export { 
  FormSection, 
  GridFormSection, 
  CollapsibleFormSection 
} from './form-sections'

// Form Actions (new decomposed components)
export { 
  FormActions, 
  SaveActions, 
  CrudActions 
} from './form-actions'

// Form Components
export { PropertyForm } from './property-form'
export { PropertyFormBasicInfo } from './property-form-basic-info'
export { PropertyFormFeatures } from './property-form-features'
export { PropertyFormActions } from './property-form-actions'
export { PropertyFormClient } from './property-form-client'
export { LeaseForm } from './lease-form'
export { SupabaseFormField } from './supabase-form-field'

// New React Query Optimized Components
export { TenantForm } from './tenant-form'
export { TenantFormClient } from './tenant-form-client'
export { TenantFormFields } from './tenant-form-fields'