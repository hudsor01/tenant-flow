/**
 * JSON API Response Utility
 * Implements the JSON API convention for consistent response structure
 */

export interface ApiResponse<T = unknown> {
  data?: T
  error?: {
    code: string
    message: string
    details?: object
  }
  meta?: {
    timestamp: string
    requestId?: string
  }
}

export class ResponseUtil {
  /**
   * Create a successful response with data
   */
  static success<T>(data: T, meta?: { requestId?: string }): ApiResponse<T> {
    return {
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    }
  }

  /**
   * Create an error response
   */
  static error(
    code: string,
    message: string,
    details?: object,
    meta?: { requestId?: string }
  ): ApiResponse<null> {
    return {
      error: {
        code,
        message,
        details
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    }
  }

  /**
   * Clean an object to make it JSON serializable
   */
  static clean<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
  }
}