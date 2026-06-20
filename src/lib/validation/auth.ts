/**
 * Authentication validation schemas - CONSOLIDATED SHARED VALIDATION
 *
 * These schemas provide shared validation for authentication flows
 * Used across frontend and backend for consistency
 *
 * Zod 4 Best Practices:
 * - Use top-level validators: z.email(), z.uuid(), z.url()
 */

import { z } from "zod";
import { VALIDATION_LIMITS } from "#lib/constants/billing";

// AUTH FORM VALIDATION SCHEMAS

// Single source of truth for password complexity. Used by:
//  - registerZodSchema, signupFormSchema (this file)
//  - update-password-form.tsx, change-password-dialog.tsx, password-section.tsx
// Cycle-2 review (PR #724) caught three different password rules across
// these surfaces; consolidating here prevents drift.
export const PASSWORD_COMPLEXITY_RE =
	/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/;
export const PASSWORD_COMPLEXITY_MESSAGE =
	"Password must contain uppercase, lowercase, a number, and a special character";

// Login form validation schema
export const loginZodSchema = z.object({
	email: z.email({ message: "Please enter a valid email address" }),
	password: z.string().min(1, "Password is required"),
});

// Register form validation schema
export const registerZodSchema = z
	.object({
		email: z.email({ message: "Please enter a valid email address" }),
		password: z
			.string()
			.min(
				VALIDATION_LIMITS.PASSWORD_MIN_LENGTH,
				`Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} characters`,
			)
			.regex(PASSWORD_COMPLEXITY_RE, PASSWORD_COMPLEXITY_MESSAGE),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

// Trial signup schema (the pricing / subscribe dialog). Deliberately short to
// reduce friction on the "start free" path: first name, last name, email,
// password. No company field (solo landlords don't have one) and no
// confirm-password (a single field + browser autofill is enough).
export const signupFormSchema = z.object({
	first_name: z.string().min(1, "First name is required"),
	last_name: z.string().min(1, "Last name is required"),
	email: z.email({ message: "Please enter a valid email address" }),
	password: z
		.string()
		.min(
			VALIDATION_LIMITS.PASSWORD_MIN_LENGTH,
			`Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} characters`,
		)
		.regex(PASSWORD_COMPLEXITY_RE, PASSWORD_COMPLEXITY_MESSAGE),
});
