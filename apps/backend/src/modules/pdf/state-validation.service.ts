/**
 * State Validation Service
 *
 * Validates and normalizes state codes for lease PDF generation.
 * Uses Zod for robust validation with clear error messages.
 */

import { Injectable } from '@nestjs/common'
import { z } from 'zod'
import {
	US_STATE_CODES,
	SUPPORTED_STATES,
	DEFAULT_STATE_CODE,
	DEFAULT_STATE_NAME,
	StateCode,
	SupportedStateCode
} from './state-constants'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * Zod schema for validating US state codes
 */
const stateCodeSchema = z
	.string()
	.min(2, 'State code must be exactly 2 characters')
	.max(2, 'State code must be exactly 2 characters')
	.regex(/^[A-Za-z]{2}$/, 'State code must contain only letters')
	.transform(val => val.toUpperCase())
	.refine(val => US_STATE_CODES.includes(val as StateCode), {
		message: `Invalid US state code. Must be one of: ${US_STATE_CODES.join(', ')}`
	})

/**
 * Validation options for state validation
 */
export interface StateValidationOptions {
	/**
	 * Whether to throw an error for unsupported states
	 * If false, will log warning and use default state
	 */
	throwOnUnsupported?: boolean

	/**
	 * Whether to log warnings for unsupported states
	 */
	logWarnings?: boolean
}

/**
 * Result of state validation
 */
export interface StateValidationResult {
	/**
	 * Whether the validation was successful
	 */
	isValid: boolean

	/**
	 * Normalized state code (uppercase)
	 */
	stateCode: SupportedStateCode

	/**
	 * State name for template file naming
	 */
	stateName: string

	/**
	 * Whether the state is supported (has template)
	 */
	isSupported: boolean

	/**
	 * Error message if validation failed
	 */
	error?: string

	/**
	 * Warning message if state is unsupported
	 */
	warning?: string
}

@Injectable()
export class StateValidationService {
	constructor(private readonly logger: AppLogger) {}

	/**
	 * Validate and normalize a state code
	 * @param stateCode - Input state code (any case)
	 * @param options - Validation options
	 * @returns Validation result
	 */
	validateState(
		stateCode?: string | null,
		options: StateValidationOptions = {}
	): StateValidationResult {
		const { throwOnUnsupported = false, logWarnings = true } = options

		// Handle null/undefined state code
		if (!stateCode) {
			const result: StateValidationResult = {
				isValid: true,
				stateCode: DEFAULT_STATE_CODE,
				stateName: DEFAULT_STATE_NAME,
				isSupported: true,
				warning: 'No state code provided, using default (TX)'
			}

			if (logWarnings) {
				this.logger.warn('No state code provided, using default', {
					defaultState: DEFAULT_STATE_CODE
				})
			}

			return result
		}

		// Validate state code format
		const validationResult = stateCodeSchema.safeParse(stateCode)

		if (!validationResult.success) {
			const error =
				validationResult.error.issues[0]?.message || 'Invalid state code'

			this.logger.error('Invalid state code format', {
				input: stateCode,
				error
			})

			if (throwOnUnsupported) {
				throw new Error(`Invalid state code: ${error}`)
			}

			// Fallback to default state
			return {
				isValid: false,
				stateCode: DEFAULT_STATE_CODE,
				stateName: DEFAULT_STATE_NAME,
				isSupported: true,
				error: `Invalid state code "${stateCode}": ${error}. Using default (${DEFAULT_STATE_CODE})`,
				warning: `Invalid state code "${stateCode}", using default (${DEFAULT_STATE_CODE})`
			}
		}

		const normalizedCode = validationResult.data as StateCode
		const isSupported = normalizedCode in SUPPORTED_STATES

		if (!isSupported) {
			const warning = `State "${normalizedCode}" is not supported (no template available). Using default (${DEFAULT_STATE_CODE})`

			if (logWarnings) {
				this.logger.warn('Unsupported state code', {
					stateCode: normalizedCode,
					supportedStates: Object.keys(SUPPORTED_STATES),
					defaultState: DEFAULT_STATE_CODE
				})
			}

			if (throwOnUnsupported) {
				throw new Error(
					`Unsupported state code: ${normalizedCode}. Supported states: ${Object.keys(SUPPORTED_STATES).join(', ')}`
				)
			}

			// Fallback to default state
			return {
				isValid: true,
				stateCode: DEFAULT_STATE_CODE,
				stateName: DEFAULT_STATE_NAME,
				isSupported: true,
				warning
			}
		}

		// Valid and supported state
		// TypeScript doesn't narrow based on `in` check, so we cast after validation
		const supportedCode = normalizedCode as SupportedStateCode
		const stateName: string = SUPPORTED_STATES[supportedCode]

		this.logger.log('State validation successful', {
			input: stateCode,
			normalized: supportedCode,
			stateName,
			isSupported
		})

		return {
			isValid: true,
			stateCode: supportedCode,
			stateName,
			isSupported: true
		}
	}

	/**
	 * Get all supported state codes
	 */
	getSupportedStates(): SupportedStateCode[] {
		return Object.keys(SUPPORTED_STATES) as SupportedStateCode[]
	}

	/**
	 * Check if a state code is supported
	 */
	isStateSupported(stateCode: string): boolean {
		const normalized = stateCode.toUpperCase()
		return normalized in SUPPORTED_STATES
	}

	/**
	 * Get state name for a given state code
	 */
	getStateName(stateCode: string): string {
		const normalized = stateCode.toUpperCase()
		return (
			SUPPORTED_STATES[normalized as SupportedStateCode] ?? DEFAULT_STATE_NAME
		)
	}
}
