import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { SupabaseService } from '../../../database/supabase.service'
import type { Database } from '@repo/shared/types/supabase'
import { parse } from 'csv-parse'
import { Readable } from 'stream'
import {
	normalizePropertyCsvRow,
	normalizePropertyType,
	VALID_PROPERTY_TYPES
} from '../utils/csv-normalizer'
import type { Request } from 'express'

// Helper to extract JWT token from request
function getTokenFromRequest(req: Request): string | null {
	const authHeader = req.headers.authorization
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null
	}
	return authHeader.substring(7)
}

@Injectable()
export class PropertyBulkImportService {
	private readonly logger: Logger
	private readonly CSV_MAX_RECORD_SIZE_BYTES = 100_000 // 100KB max per record

	constructor(
		private readonly supabase: SupabaseService,
		@Optional() logger?: Logger
	) {
		this.logger = logger ?? new Logger(PropertyBulkImportService.name)
	}

	/**
	 * Bulk import properties from CSV file
	 * Ephemeral processing: parse → validate ALL rows → atomic insert → discard file
	 * Returns summary of success/errors for user feedback
	 */
	async bulkImport(
		req: AuthenticatedRequest,
		fileBuffer: Buffer
	): Promise<{
		success: boolean
		imported: number
		failed: number
		errors: Array<{ row: number; error: string }>
	}> {
		const startTime = Date.now()
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('[BULK_IMPORT] No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)
		const user_id = req.user.id

		this.logger.log('[BULK_IMPORT:START] Bulk import initiated', {
			user_id,
			fileSize: fileBuffer.length,
			timestamp: new Date().toISOString()
		})

		try {
			// Parse CSV file using csv-parse (RFC 4180 compliant streaming parser)
			this.logger.debug('[BULK_IMPORT:PHASE1] Starting CSV parsing...', {
				fileSize: fileBuffer.length
			})

			const parseStartTime = Date.now()
		let parseTime = 0
			const records = await new Promise<Record<string, string>[]>(
				(resolve, reject) => {
					const rows: Record<string, string>[] = []
					const stream = Readable.from(fileBuffer.toString('utf-8'))

					stream
						.pipe(
							parse({
								columns: true, // Use first row as headers
								skip_empty_lines: true,
								trim: true,
								relax_quotes: true, // Allow quotes in unquoted fields
								relax_column_count: true, // Allow variable column counts
								max_record_size: this.CSV_MAX_RECORD_SIZE_BYTES,
								bom: true // Strip BOM so Excel exports don't break header mapping
							})
						)
						.on('data', (row: unknown) => {
							// Validate row structure with type guard
							if (!this.isValidCsvRow(row)) {
								reject(
									new BadRequestException(
										'Invalid CSV row format: expected string values only'
									)
								)
								return
							}
							rows.push(row)
						})
						.on('error', (error: Error) => {
							this.logger.error('[BULK_IMPORT:PHASE1:ERROR] CSV parsing failed', {
								error: error.message,
								user_id
							})
							reject(
								new BadRequestException(`CSV parsing failed: ${error.message}`)
							)
						})
						.on('end', () => {
							parseTime = Date.now() - parseStartTime
							this.logger.log('[BULK_IMPORT:PHASE1:COMPLETE] CSV parsing completed', {
								rowsParsed: rows.length,
								duration_ms: parseTime,
								user_id
							})
							resolve(rows)
						})
				}
			)

			if (records.length === 0) {
				this.logger.warn('[BULK_IMPORT:VALIDATION] No data rows found in CSV', {
					user_id
				})
				throw new BadRequestException('CSV file contains no data rows')
			}

			if (records.length > 100) {
				this.logger.warn('[BULK_IMPORT:VALIDATION] CSV exceeds max 100 rows', {
					rowCount: records.length,
					user_id
				})
				throw new BadRequestException(
					'Maximum 100 properties per import. Please split into smaller files.'
				)
			}

			// Use user_id from req.user.id (Supabase auth UUID) for RLS-compliant inserts
			const errors: Array<{ row: number; error: string }> = []
			const validRows: Array<
				Database['public']['Tables']['properties']['Insert']
			> = []

			// PHASE 1: Validate ALL rows before inserting anything
			this.logger.log('[BULK_IMPORT:PHASE2:START] Validating all rows...', {
				totalRows: records.length,
				user_id
			})

			const validationStartTime = Date.now()
			for (let i = 0; i < records.length; i++) {
				const row = records[i]
				if (!row) continue // Skip undefined rows

				const rowNumber = i + 2 // CSV row number (header is row 1)
				const normalizedRow = normalizePropertyCsvRow(row)

				try {
					// Required field validation
					const name = normalizedRow.name
					const address = normalizedRow.address
					const city = normalizedRow.city
					const state = normalizedRow.state
					const postal_code = normalizedRow.postal_code

					if (!name?.trim()) {
						throw new Error('Property name is required')
					}
					if (!address?.trim()) {
						throw new Error('Property address is required')
					}
					if (!city?.trim() || !state?.trim() || !postal_code?.trim()) {
						throw new Error('City, state, and zip code are required')
					}

					// Optional field validation
					const normalizedPropertyType = normalizePropertyType(
						normalizedRow.property_type
					)
					if (normalizedRow.property_type && !normalizedPropertyType) {
						throw new Error(
							`Invalid property type: ${normalizedRow.property_type}. Must be one of: ${VALID_PROPERTY_TYPES.join(', ')}`
						)
					}

					// Build insert object
					const insertData: Database['public']['Tables']['properties']['Insert'] =
						{
							property_owner_id: user_id,
							name: name.trim(),
							address_line1: address.trim(),
							city: city.trim(),
							state: state.trim(),
							postal_code: postal_code.trim(),
							property_type: normalizedPropertyType ?? 'OTHER'
						}

					validRows.push(insertData)

					this.logger.debug('[BULK_IMPORT:PHASE2:ROW_VALID]', {
						row: rowNumber,
						name: name.trim(),
						address: address.trim()
					})
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : 'Validation failed'
					errors.push({
						row: rowNumber,
						error: errorMessage
					})

					this.logger.warn('[BULK_IMPORT:PHASE2:ROW_INVALID]', {
						row: rowNumber,
						error: errorMessage,
						user_id
					})
				}
			}

			const validationTime = Date.now() - validationStartTime
			this.logger.log('[BULK_IMPORT:PHASE2:COMPLETE] Row validation completed', {
				validRows: validRows.length,
				invalidRows: errors.length,
				duration_ms: validationTime,
				user_id
			})

			// PHASE 2: If ANY validation errors, fail fast with ALL errors
			if (errors.length > 0) {
				this.logger.warn('[BULK_IMPORT:FAILED] Validation failed - aborting insert', {
					user_id,
					totalRows: records.length,
					failedRows: errors.length,
					validRows: validRows.length
				})

				return {
					success: false,
					imported: 0,
					failed: errors.length,
					errors
				}
			}

			// PHASE 3: Atomic batch insert (all or nothing)
			this.logger.log('[BULK_IMPORT:PHASE3:START] Starting atomic batch insert...', {
				rowCount: validRows.length,
				user_id
			})

			const insertStartTime = Date.now()
			const { data, error } = await client
				.from('properties')
				.insert(validRows)
				.select()

			if (error) {
				const insertTime = Date.now() - insertStartTime
				this.logger.error('[BULK_IMPORT:PHASE3:ERROR] Bulk insert failed', {
					error: error.message,
					errorCode: error.code,
					duration_ms: insertTime,
					rowCount: validRows.length,
					user_id
				})
				throw new BadRequestException(
					`Database insert failed: ${error.message}`
				)
			}

			const insertTime = Date.now() - insertStartTime
			const totalTime = Date.now() - startTime

			this.logger.log('[BULK_IMPORT:SUCCESS] Bulk import completed successfully', {
				user_id,
				imported: data?.length || 0,
				duration_ms: totalTime,
				phases: {
					parsing: parseTime,
					validation: validationTime,
					insertion: insertTime
				},
				timestamp: new Date().toISOString()
			})

			return {
				success: true,
				imported: data?.length || 0,
				failed: 0,
				errors: []
			}
		} catch (error) {
			const totalTime = Date.now() - startTime
			this.logger.error('[BULK_IMPORT:FATAL] Bulk import error', {
				error: error instanceof Error ? error.message : String(error),
				user_id,
				duration_ms: totalTime,
				timestamp: new Date().toISOString()
			})

			if (error instanceof BadRequestException) {
				throw error
			}

			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'
			throw new BadRequestException(
				`Failed to process CSV file: ${errorMessage}`
			)
		}
	}

	/**
	 * Type guard: Validate CSV row has expected string fields
	 * Prevents injection attacks and ensures data integrity
	 */
	private isValidCsvRow(row: unknown): row is Record<string, string> {
		if (!row || typeof row !== 'object') return false

		// CSV parser returns objects with string values
		// Validate all values are strings (not objects, arrays, etc.)
		return Object.values(row).every(
			value =>
				typeof value === 'string' || value === null || value === undefined
		)
	}
}
