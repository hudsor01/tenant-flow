/**
 * Form Components - Native React 19 + Next.js 15 Architecture
 * CONSOLIDATED: Removed duplicate and legacy components
 * Using ONLY native React 19 useActionState patterns
 */

// Form Container & Layout
export { FormContainer } from './form-container'
export { FormLoadingOverlay } from './form-loading-overlay'
export { CollapsibleFormSection } from './collapsible-form-section'

// Form Fields & Sections  
export { SupabaseFormField } from './supabase-form-field'
export { LeaseTermsSection } from './lease-terms-section'

// Auth Forms (using native React 19 useActionState)
export { SimpleLoginForm } from './supabase-login-form'
export { SimpleSignupForm } from './supabase-signup-form'
export { ForgotPasswordForm } from './supabase-forgot-password-form'
export { UpdatePasswordForm } from './update-password-form'

// Contact Form
export { ContactForm } from './contact-form'
