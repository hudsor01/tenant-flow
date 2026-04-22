/**
 * Generic bulk-import types (v2.3 Phase 58).
 *
 * Consumers (property/tenant/unit/lease importers) supply a
 * BulkImportConfig<T> to the generic stepper + dialog. Only things that
 * legitimately differ per entity are parameterized:
 *
 *   - entityLabel — "Property"/"Properties" used in step titles and the
 *     commit button label.
 *   - templateHeaders/templateSampleRows/templateFilename — CSV template
 *     the user downloads before uploading. templateSampleRows is a tuple
 *     of strings that must have the same length as templateHeaders — see
 *     `templateSampleRows` type below.
 *   - parseAndValidate — CSV text → validated rows using the entity's
 *     Zod schema.
 *   - insertRow — single-row PostgREST insert. The stepper loops row-by-
 *     row and surfaces per-row errors; no bulk RPC required.
 *   - invalidateKeys — TanStack Query keys to invalidate after a
 *     successful import (covers dashboards + list views).
 */

import type { QueryKey } from '@tanstack/react-query'
import type { ParsedRow } from '#types/api-contracts'

export interface BulkImportParseResult<T> {
	rows: ParsedRow<T>[]
	tooManyRows: boolean
	totalRowCount: number
}

export interface BulkImportConfig<TInsert> {
	entityLabel: { singular: string; plural: string }
	templateFilename: string
	templateHeaders: readonly string[]
	/**
	 * Each sample row is a plain string tuple — same length as
	 * templateHeaders. Enforced via a length-check in the unit tests for
	 * each entity config (`properties.bulk-import-config.test.ts` etc.).
	 * We don't encode the length on the type because TypeScript's tuple
	 * inference collapses readonly arrays to `readonly string[]` through
	 * the config factory return type.
	 */
	templateSampleRows: readonly (readonly string[])[]
	requiredFields: string
	optionalFields?: string
	parseAndValidate: (csvText: string) => BulkImportParseResult<TInsert>
	insertRow: (row: TInsert) => Promise<{ error: Error | null }>
	invalidateKeys: QueryKey[]
}
