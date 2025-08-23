/**
 * Simple success response utility to eliminate manual { success: true } objects
 * Uses existing ResponseUtil pattern but provides shortcuts for common cases
 */

import { ResponseUtil } from './response.util'

export class SuccessResponseUtil {
	/**
	 * Simple success response - replaces { success: true }
	 */
	static success(): { success: true } {
		return { success: true }
	}

	/**
	 * Success with message - replaces { success: true, message: '...' }
	 */
	static withMessage(message: string): { success: true; message: string } {
		return { success: true, message }
	}

	/**
	 * Success with data - uses existing ResponseUtil.success
	 */
	static withData<T>(data: T) {
		return ResponseUtil.success(data)
	}

	/**
	 * Success with spread data - replaces { success: true, ...data }
	 */
	static withSpreadData<T extends Record<string, unknown>>(data: T) {
		return { success: true, ...data }
	}
}