/**
 * Common validation schemas and functions
 * Shared across frontend and backend for consistency
 *
 * Zod 4 Best Practices:
 * - Use top-level validators: z.email(), z.uuid(), z.url() (not z.string().email())
 * - Use z.stringbool() for env-style boolean parsing
 * - Use z.file() for file upload validation
 * - Use .meta() for schema documentation
 */

import { z } from "zod";
import { VALIDATION_LIMITS } from "#lib/constants/billing";

/**
 * Email validation schema (Zod 4 top-level)
 * @example emailSchema.parse('user@example.com')
 */
export const emailSchema = z
	.email({ message: "Please enter a valid email address" })
	.meta({
		description: "Valid email address",
		examples: ["user@example.com", "admin@tenantflow.app"],
	});

/**
 * UUID validation schema (Zod 4 top-level)
 * RFC 9562/4122 compliant UUID validation
 * @example uuidSchema.parse('550e8400-e29b-41d4-a716-446655440000')
 */
export const uuidSchema = z.uuid({ message: "Invalid UUID format" }).meta({
	description: "RFC 4122 compliant UUID identifier",
	examples: ["550e8400-e29b-41d4-a716-446655440000"],
	format: "uuid",
});

/**
 * URL validation schema with security checks
 * Only allows http/https protocols, blocks localhost in production
 */
export const urlSchema = z
	.url({ message: "Invalid URL format" })
	.refine((url) => isValidUrl(url), {
		message: "URL must use http/https protocol",
	})
	.meta({
		description: "Valid HTTP/HTTPS URL",
		examples: ["https://example.com", "https://tenantflow.app/properties"],
		format: "uri",
	});

/** Required non-empty string schema */
export const requiredString = z.string().min(1, "This field is required");

/** Non-empty string schema with trimming */
export const nonEmptyStringSchema = z
	.string()
	.trim()
	.min(1, "This field cannot be empty");

/** Required title schema (1-200 characters) */
export const requiredTitle = z
	.string()
	.trim()
	.min(1, "Title is required")
	.max(
		VALIDATION_LIMITS.TITLE_MAX_LENGTH,
		`Title cannot exceed ${VALIDATION_LIMITS.TITLE_MAX_LENGTH} characters`,
	);

/** Required description schema (1-2000 characters) */
export const requiredDescription = z
	.string()
	.trim()
	.min(1, "Description is required")
	.max(
		VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH,
		`Description cannot exceed ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters`,
	);

/** Non-negative number schema (>= 0) */
export const nonNegativeNumberSchema = z
	.number()
	.min(0, "Value must be non-negative");

/** Positive number schema (> 0) */
export const positiveNumberSchema = z
	.number()
	.positive("Value must be positive");

/**
 * Safe integer schema (Zod 4)
 * Validates integers within JavaScript's safe integer range
 */
export const safeIntegerSchema = z.int({ message: "Must be a valid integer" });

/** Phone number validation schema */
export const phoneSchema = z
	.string()
	.regex(
		/^[\d+()-\s]+$/,
		"Phone number can only contain digits, +, (), -, and spaces",
	)
	.min(10, "Phone number must be at least 10 characters")
	.max(
		VALIDATION_LIMITS.CONTACT_FORM_PHONE_MAX_LENGTH,
		`Phone number cannot exceed ${VALIDATION_LIMITS.CONTACT_FORM_PHONE_MAX_LENGTH} characters`,
	)
	.meta({
		description: "Phone number with optional formatting",
		examples: ["+1 (555) 123-4567", "555-123-4567", "5551234567"],
		format: "phone",
	});

/**
 * Environment-style boolean parsing (Zod 4)
 * Parses string values to boolean:
 * - true: "true", "1", "yes", "on", "y", "enabled"
 * - false: "false", "0", "no", "off", "n", "disabled"
 *
 * @example stringBoolSchema.parse("true") // => true
 * @example stringBoolSchema.parse("0") // => false
 */
export const stringBoolSchema = z.stringbool();

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate URL format and security
 */
export function isValidUrl(url: string): boolean {
	try {
		const parsedUrl = new URL(url);

		// Only allow http and https protocols
		if (!["http:", "https:"].includes(parsedUrl.protocol)) {
			return false;
		}

		// Prevent localhost in production
		if (
			process.env["NODE_ENV"] === "production" &&
			(parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1")
		) {
			return false;
		}

		return true;
	} catch {
		return false;
	}
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}
