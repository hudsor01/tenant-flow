/**
 * Boundary validator for `document_template_definitions.custom_fields`.
 *
 * `custom_fields` is `jsonb NOT NULL DEFAULT '[]'` with no shape CHECK and is
 * owner-writable via PostgREST, so a malformed/legacy row must not crash the
 * dynamic-form renderer. `parseDynamicFields` is the never-throw boundary per
 * CLAUDE.md's "typed mapper / Zod safeParse at every boundary" rule
 * (mapDocumentRow precedent): a non-array payload degrades to `[]` and any
 * individual entry that fails validation is dropped with a logger warning.
 *
 * The schema mirrors the canonical `DynamicField` type from dynamic-form.tsx —
 * it is imported, never re-declared (Rule #3, no duplicate types).
 */

import { z } from "zod";
import type { DynamicField } from "#app/(owner)/documents/templates/components/dynamic-form";
import { logger } from "#lib/frontend-logger";

const listItemFieldSchema = z.object({
	key: z.string(),
	label: z.string(),
	type: z.enum(["text", "email", "tel", "number", "checkbox"]),
	placeholder: z.string().optional(),
});

const optionSchema = z.object({
	value: z.string(),
	label: z.string(),
});

// Zod's `.optional()` output widens optional keys to `string | undefined`,
// which under `exactOptionalPropertyTypes` is not directly assignable to the
// canonical `DynamicField` (its optionals are `?: string`). So the schema
// stays inferred and validated entries are asserted to `DynamicField` after a
// successful `safeParse` (the boundary cast — never `as unknown as`).
export const dynamicFieldSchema = z.object({
	name: z.string().min(1),
	label: z.string(),
	type: z.enum([
		"text",
		"email",
		"tel",
		"date",
		"textarea",
		"select",
		"checkbox",
		"number",
		"list",
	]),
	placeholder: z.string().optional(),
	description: z.string().optional(),
	options: z.array(optionSchema).optional(),
	section: z.string().optional(),
	fullWidth: z.boolean().optional(),
	rows: z.number().optional(),
	itemFields: z.array(listItemFieldSchema).optional(),
	addLabel: z.string().optional(),
	itemLabel: z.string().optional(),
});

/**
 * Parse a raw `custom_fields` jsonb payload into a sound `DynamicField[]`.
 * Never throws: non-array input yields `[]`; entries that fail the schema are
 * dropped (logged) so one bad legacy field cannot blank the whole template.
 */
export function parseDynamicFields(raw: unknown): DynamicField[] {
	if (!Array.isArray(raw)) {
		if (raw !== null && raw !== undefined) {
			logger.warn("parseDynamicFields: custom_fields is not an array", {
				action: "parse_dynamic_fields_non_array",
				metadata: { received: typeof raw },
			});
		}
		return [];
	}

	const fields: DynamicField[] = [];
	for (const entry of raw) {
		const parsed = dynamicFieldSchema.safeParse(entry);
		if (parsed.success) {
			fields.push(parsed.data as DynamicField);
		} else {
			logger.warn("parseDynamicFields: dropped invalid custom field", {
				action: "parse_dynamic_fields_invalid_entry",
				metadata: { issues: parsed.error.issues },
			});
		}
	}
	return fields;
}
