/**
 * Shared validation schemas for TenantFlow
 * Common Zod schemas used across frontend and backend
 */

export * from './auth'
export * from './common'
export * from './properties'
export * from './tenants'
export * from './units'
export * from './maintenance'
export * from './leases'
export * from './documents'

// Re-export specific schemas that are commonly used
export {
	uuidSchema,
	emailSchema,
	nonEmptyStringSchema,
<<<<<<< HEAD
	requiredString,
	requiredStringField,
	requiredName,
	requiredTitle,
	requiredDescription,
=======
>>>>>>> origin/main
	positiveNumberSchema,
	nonNegativeNumberSchema,
	dateStringSchema,
	// Pagination schemas
	paginationSchema,
	paginationQuerySchema,
	paginationResponseSchema,
	// React 19 Action State schemas
	actionStateSchema,
	formActionStateSchema,
	serverActionResponseSchema,
	// Enhanced common schemas
	phoneSchema,
	currencyAmountSchema,
	percentageSchema,
	urlSchema,
	fileTypeSchema,
	fileSizeSchema,
	uploadedFileSchema,
	addressSchema,
	coordinatesSchema,
	// Query schemas
	sortSchema,
	advancedSearchSchema,
	timeRangeSchema,
	baseQuerySchema,
	// Bulk operation schemas
	bulkOperationSchema,
	bulkResponseSchema,
	// Webhook schemas
	webhookEventSchema,
	webhookDeliverySchema,
	// Response schemas
	successResponseSchema,
<<<<<<< HEAD
	errorResponseSchema
=======
	errorResponseSchema,
	// Utility functions
	createPaginatedResponseSchema,
	createApiResponseSchema,
	createListResponseSchema
>>>>>>> origin/main
} from './common'
