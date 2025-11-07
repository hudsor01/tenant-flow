/**
 * Form utility functions for TanStack Form error handling
 */

/**
 * Extracts error message from TanStack Form field errors
 * @param errors - Field error array from field.state.meta.errors
 * @returns First error message or empty string
 */
export function getFieldErrorMessage(errors: unknown[] | undefined): string {
	if (!errors?.[0]) return ''
	return typeof errors[0] === 'string'
		? errors[0]
		: (errors[0] as { message?: string })?.message || ''
}
