'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createLogger } from '#lib/frontend-logger'
import type { BulkImportResult, ImportProgress } from '#types/api-contracts'
import type { BulkImportConfig } from './types'

const logger = createLogger({ component: 'useBulkImportMutation' })

// Flush progress at most every ~120 ms of wall-clock + every 5 rows to avoid
// the 100-re-render storm when a user imports 100 rows back-to-back.
const PROGRESS_BATCH_EVERY_ROWS = 5
const PROGRESS_BATCH_EVERY_MS = 120

export interface BulkImportMutationInput<T> {
	csvLine: number
	parsed: T
}

interface UseBulkImportMutationArgs<T> {
	config: BulkImportConfig<T>
	setImportProgress: (progress: ImportProgress | null) => void
	setResult: (result: BulkImportResult | null) => void
	mountedRef: React.MutableRefObject<boolean>
}

// Per-row insertRow failures AND thrown exceptions both surface as errors[];
// onError synthesizes a failure result so a queryClient/invalidate blowup
// can't freeze the UI on a pending dialog.
export function useBulkImportMutation<T>({
	config,
	setImportProgress,
	setResult,
	mountedRef
}: UseBulkImportMutationArgs<T>) {
	const queryClient = useQueryClient()
	const lastRowCountRef = useRef(0)

	return useMutation({
		mutationFn: async (
			rows: BulkImportMutationInput<T>[]
		): Promise<BulkImportResult> => {
			lastRowCountRef.current = rows.length
			const errors: Array<{ row: number; error: string }> = []
			let succeeded = 0
			let lastFlush = Date.now()

			for (let i = 0; i < rows.length; i++) {
				const entry = rows[i]!
				try {
					const { error } = await config.insertRow(entry.parsed)
					if (error) {
						// Record the real CSV line number so Retry / Download-
						// failed-rows can match on a stable identifier.
						errors.push({ row: entry.csvLine, error: error.message })
					} else {
						succeeded++
					}
				} catch (err) {
					// Defensive — `insertRow` is typed to return {error} not
					// throw, but a programming error or network blowup would
					// otherwise take the whole batch down invisibly.
					errors.push({
						row: entry.csvLine,
						error: err instanceof Error ? err.message : String(err)
					})
				}

				const now = Date.now()
				const isLast = i === rows.length - 1
				const hitRowBatch = (i + 1) % PROGRESS_BATCH_EVERY_ROWS === 0
				const hitTimeBatch = now - lastFlush >= PROGRESS_BATCH_EVERY_MS
				if ((isLast || hitRowBatch || hitTimeBatch) && mountedRef.current) {
					setImportProgress({
						current: i + 1,
						total: rows.length,
						succeeded,
						failed: errors.length
					})
					lastFlush = now
				}
			}

			return {
				success: errors.length === 0,
				imported: succeeded,
				failed: errors.length,
				errors
			}
		},
		onSuccess: async data => {
			for (const key of config.invalidateKeys) {
				await queryClient.invalidateQueries({ queryKey: key })
			}
			if (mountedRef.current) setResult(data)
		},
		onError: err => {
			logger.error('Bulk import mutation threw', {
				error: err,
				entity: config.entityLabel.plural
			})
			if (!mountedRef.current) return
			setImportProgress(null)
			setResult({
				success: false,
				imported: 0,
				failed: lastRowCountRef.current,
				errors: [
					{
						row: 0,
						error:
							err instanceof Error
								? err.message
								: 'Unexpected error during import.'
					}
				]
			})
		}
	})
}

// Re-export for convenience.
export function useMountedRef() {
	const ref = useRef(true)
	useEffect(() => {
		ref.current = true
		return () => {
			ref.current = false
		}
	}, [])
	return ref
}
