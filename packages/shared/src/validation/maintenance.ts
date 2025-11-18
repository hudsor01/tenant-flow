import { z } from 'zod'
import {
  uuidSchema,
  requiredString,
  nonEmptyStringSchema,
  positiveNumberSchema,
 nonNegativeNumberSchema
} from './common.js'
import { VALIDATION_LIMITS } from '@repo/shared/constants/billing'

// Maintenance priority enum validation
export const maintenancePrioritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
])

// Maintenance status enum validation
export const maintenanceStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
  'ON_HOLD'
])

// Base maintenance request input schema (matches database exactly)
export const maintenanceRequestInputSchema = z.object({
  unit_id: uuidSchema,
  tenant_id: uuidSchema,

  description: nonEmptyStringSchema
    .min(10, 'Description must be at least 10 characters')
    .max(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH, `Description cannot exceed ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters`),

  priority: maintenancePrioritySchema,

  status: maintenanceStatusSchema.default('PENDING'),

  requested_by: uuidSchema.optional(),

  assigned_to: uuidSchema.optional(),

  estimated_cost: positiveNumberSchema
    .max(VALIDATION_LIMITS.RENT_MAXIMUM_VALUE, 'Estimated cost seems unrealistic')
    .optional(),

  actual_cost: positiveNumberSchema
    .max(VALIDATION_LIMITS.RENT_MAXIMUM_VALUE, 'Actual cost seems unrealistic')
    .optional(),

  scheduled_date: z.string().optional(),

  completed_at: z.string().optional(),

  inspection_date: z.string().optional(),

  inspection_findings: z.string()
    .max(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH, `Inspection findings cannot exceed ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters`)
    .optional(),

  inspector_id: uuidSchema.optional()
})

// Full maintenance request schema (includes server-generated fields)
export const maintenanceRequestSchema = maintenanceRequestInputSchema.extend({
  id: uuidSchema,
  created_at: z.string(),
  updated_at: z.string()
})

// Maintenance request update schema (partial input)
export const maintenanceRequestUpdateSchema = maintenanceRequestInputSchema.partial().extend({
  id: uuidSchema.optional(),
  status: maintenanceStatusSchema.optional()
})

// Maintenance request query schema (for search/filtering)
export const maintenanceRequestQuerySchema = z.object({
  search: z.string().optional(),
  unit_id: uuidSchema.optional(),
  tenant_id: uuidSchema.optional(),
  priority: maintenancePrioritySchema.optional(),
  status: maintenanceStatusSchema.optional(),
  assigned_to: uuidSchema.optional(),
  requested_by: uuidSchema.optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  scheduled_after: z.string().optional(),
  scheduled_before: z.string().optional(),
  has_cost: z.boolean().optional(),
  min_cost: nonNegativeNumberSchema.optional(),
  max_cost: nonNegativeNumberSchema.optional(),
  sort_by: z.enum([
    'created_at',
    'scheduled_date',
    'priority',
    'status',
    'estimated_cost'
  ]).optional(),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(VALIDATION_LIMITS.API_QUERY_MAX_LIMIT).default(20)
})

// Maintenance request creation schema
export const maintenanceRequestCreateSchema = maintenanceRequestInputSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  status: true,
  completed_at: true,
  actual_cost: true
}).extend({
  status: maintenanceStatusSchema.default('PENDING')
})

// Maintenance cost update schema
export const maintenanceCostUpdateSchema = z.object({
  estimated_cost: positiveNumberSchema
    .max(VALIDATION_LIMITS.RENT_MAXIMUM_VALUE, 'Estimated cost seems unrealistic')
    .optional(),
  actual_cost: positiveNumberSchema
    .max(VALIDATION_LIMITS.RENT_MAXIMUM_VALUE, 'Actual cost seems unrealistic')
    .optional()
})

// Maintenance assignment schema
export const maintenanceAssignmentSchema = z.object({
 assigned_to: uuidSchema,
  scheduled_date: z.string().optional()
})

// Maintenance completion schema
export const maintenanceCompletionSchema = z.object({
  completed_at: z.string().min(1, 'Completion date is required'),
  actual_cost: positiveNumberSchema
    .max(VALIDATION_LIMITS.RENT_MAXIMUM_VALUE, 'Actual cost seems unrealistic')
    .optional(),
  completion_notes: z.string()
    .max(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH, `Completion notes cannot exceed ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters`)
    .optional()
})

// Maintenance inspection schema
export const maintenanceInspectionSchema = z.object({
  inspection_date: z.string().min(1, 'Inspection date is required'),
  inspection_findings: z.string()
    .min(1, 'Inspection findings are required')
    .max(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH, `Inspection findings cannot exceed ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters`),
  inspector_id: uuidSchema
})

// Export types
export type MaintenanceRequestInput = z.infer<typeof maintenanceRequestInputSchema>
export type MaintenanceRequest = z.infer<typeof maintenanceRequestSchema>
export type MaintenanceRequestUpdate = z.infer<typeof maintenanceRequestUpdateSchema>
export type MaintenanceRequestQuery = z.infer<typeof maintenanceRequestQuerySchema>
export type MaintenanceRequestCreate = z.infer<typeof maintenanceRequestCreateSchema>
export type MaintenanceCostUpdate = z.infer<typeof maintenanceCostUpdateSchema>
export type MaintenanceAssignment = z.infer<typeof maintenanceAssignmentSchema>
export type MaintenanceCompletion = z.infer<typeof maintenanceCompletionSchema>
export type MaintenanceInspection = z.infer<typeof maintenanceInspectionSchema>

// Frontend-specific form schemas
export const maintenanceRequestFormSchema = z.object({
  unit_id: requiredString,
 tenant_id: requiredString,
  description: requiredString,
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  requested_by: z.string().optional(),
  estimated_cost: z.string().optional(),
  scheduled_date: z.string().optional()
})

export const maintenanceAssignmentFormSchema = z.object({
  assigned_to: requiredString,
  scheduled_date: z.string().optional()
})

// Transform functions for form data
export const transformMaintenanceRequestFormData = (data: MaintenanceRequestFormData) => ({
  unit_id: data.unit_id,
  tenant_id: data.tenant_id,
  description: data.description,
  priority: data.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  requested_by: data.requested_by || undefined,
  estimated_cost: data.estimated_cost ? parseFloat(data.estimated_cost) : undefined,
  scheduled_date: data.scheduled_date || undefined
})

export type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestFormSchema>
export type MaintenanceAssignmentFormData = z.infer<typeof maintenanceAssignmentFormSchema>
export type TransformedMaintenanceRequestData = ReturnType<typeof transformMaintenanceRequestFormData>
