/**
 * Modal component type definitions - NOW USING SHARED TYPES  
 * All types moved to @repo/shared/types/ui for centralization
 */

// Use shared modal component types
export type {
	BaseModalProps,
	UpgradePromptModalProps,
	BaseFormModalProps,
	EmailModalProps,
	EmailData,
	ConfirmationModalProps,
	FormModalProps,
	FormField  // Already available from common types
} from '@repo/shared'
