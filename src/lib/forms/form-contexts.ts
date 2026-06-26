import { createFormHookContexts } from "@tanstack/react-form";

/**
 * Field/form contexts for the shared TanStack Form composition layer.
 *
 * Kept in its own module (not `form-hook.tsx`) so the field components can
 * import `useFieldContext` without creating a cycle: `form-hook.tsx` imports
 * the field components to register them, and the field components import only
 * these contexts.
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
	createFormHookContexts();
