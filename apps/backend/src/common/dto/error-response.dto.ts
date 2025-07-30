export interface BaseErrorResponse {
	statusCode: number
	message: string
	timestamp: string
	path: string
}

export interface ValidationErrorResponse extends BaseErrorResponse {
	error: 'Validation Error'
	details: ValidationErrorDetail[]
}

export interface ValidationErrorDetail {
	field: string
	constraint: string
	value?: unknown
}

export interface NotFoundErrorResponse extends BaseErrorResponse {
	error: 'Not Found'
	resource: string
	resourceId?: string
}

export interface BusinessErrorResponse extends BaseErrorResponse {
	error: 'Business Rule Violation'
	code: string
	context?: Record<string, unknown>
}

export interface ConflictErrorResponse extends BaseErrorResponse {
	error: 'Conflict'
	resource: string
	conflictingField?: string
}

export interface UnauthorizedErrorResponse extends BaseErrorResponse {
	error: 'Unauthorized'
	reason: 'invalid_token' | 'missing_token' | 'expired_token' | 'insufficient_permissions'
}

export interface InternalServerErrorResponse extends BaseErrorResponse {
	error: 'Internal Server Error'
	requestId?: string
}

export interface RateLimitErrorResponse extends BaseErrorResponse {
	error: 'Rate Limit Exceeded'
	retryAfter: number
	limit: number
	remaining: number
}

export interface FileUploadErrorResponse extends BaseErrorResponse {
	error: 'File Upload Error'
	reason: 'file_too_large' | 'invalid_file_type' | 'upload_failed' | 'no_file_provided'
	maxSize?: number
	allowedTypes?: string[]
}

export type ErrorResponse = 
	| ValidationErrorResponse
	| NotFoundErrorResponse
	| BusinessErrorResponse
	| ConflictErrorResponse
	| UnauthorizedErrorResponse
	| InternalServerErrorResponse
	| RateLimitErrorResponse
	| FileUploadErrorResponse