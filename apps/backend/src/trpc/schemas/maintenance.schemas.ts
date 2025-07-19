import { z } from 'zod'
import { 
  uuidSchema, 
  nonEmptyStringSchema
} from './common.schemas'

// Maintenance request status enum
export const maintenanceStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS', 
  'COMPLETED',
  'CANCELED',
  'ON_HOLD'
])

// Maintenance priority enum
export const maintenancePrioritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'EMERGENCY'
])

// Maintenance category enum
export const maintenanceCategorySchema = z.enum([
  'PLUMBING',
  'ELECTRICAL',
  'HVAC',
  'APPLIANCE',
  'STRUCTURAL',
  'PAINTING',
  'FLOORING',
  'PEST_CONTROL',
  'LANDSCAPING',
  'SECURITY',
  'OTHER'
])

// Create maintenance request schema
export const createMaintenanceSchema = z.object({
  unitId: uuidSchema,
  title: nonEmptyStringSchema.max(255),
  description: nonEmptyStringSchema.max(2000),
  category: maintenanceCategorySchema,
  priority: maintenancePrioritySchema.default('MEDIUM'),
  preferredDate: z.string().datetime().optional(),
  allowEntry: z.boolean().default(true),
  contactPhone: z.string().optional(),
  photos: z.array(z.string().url()).optional(),
})

// Update maintenance request schema
export const updateMaintenanceSchema = z.object({
  id: z.string().uuid('Invalid maintenance request ID'),
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).max(2000).optional(),
  category: maintenanceCategorySchema.optional(),
  priority: maintenancePrioritySchema.optional(),
  status: maintenanceStatusSchema.optional(),
  preferredDate: z.string().datetime().optional(),
  allowEntry: z.boolean().optional(),
  contactPhone: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  estimatedCost: z.number().positive().optional(),
  actualCost: z.number().positive().optional(),
  completedAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  photos: z.array(z.string().url()).optional(),
})

// Maintenance query schema
export const maintenanceQuerySchema = z.object({
  unitId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  status: maintenanceStatusSchema.optional(),
  priority: maintenancePrioritySchema.optional(),
  category: maintenanceCategorySchema.optional(),
  assignedTo: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
})

// Maintenance ID schema
export const maintenanceIdSchema = z.object({
  id: z.string().uuid('Invalid maintenance request ID'),
})

// Assign maintenance schema
export const assignMaintenanceSchema = z.object({
  id: z.string().uuid('Invalid maintenance request ID'),
  assignedTo: z.string().uuid('Invalid user ID'),
  estimatedCost: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
})

// Complete maintenance schema
export const completeMaintenanceSchema = z.object({
  id: z.string().uuid('Invalid maintenance request ID'),
  actualCost: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
  photos: z.array(z.string().url()).optional(),
})

// Response schemas
export const unitReferenceSchema = z.object({
  id: z.string(),
  unitNumber: z.string(),
  Property: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    ownerId: z.string(),
  }),
})

export const tenantReferenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  User: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }).nullable(),
})

export const assigneeSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  phone: z.string().nullable(),
})

export const maintenanceRequestSchema = z.object({
  id: z.string(),
  unitId: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string().nullable(),
  priority: maintenancePrioritySchema,
  status: maintenanceStatusSchema,
  preferredDate: z.string().datetime().nullable(),
  allowEntry: z.boolean(),
  contactPhone: z.string().nullable(),
  requestedBy: z.string().nullable(),
  assignedTo: z.string().nullable(),
  estimatedCost: z.number().nullable(),
  actualCost: z.number().nullable(),
  completedAt: z.string().datetime().nullable(),
  notes: z.string().nullable(),
  photos: z.array(z.string()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  Unit: unitReferenceSchema.optional(),
  Assignee: assigneeSchema.nullable().optional(),
})

export const maintenanceListSchema = z.object({
  requests: z.array(maintenanceRequestSchema),
  total: z.number(),
  totalCost: z.number(),
})

export const maintenanceStatsSchema = z.object({
  totalRequests: z.number(),
  openRequests: z.number(),
  inProgressRequests: z.number(),
  completedRequests: z.number(),
  urgentRequests: z.number(),
  totalEstimatedCost: z.number(),
  totalActualCost: z.number(),
  averageCompletionTime: z.number(), // in hours
  categoryBreakdown: z.array(z.object({
    category: maintenanceCategorySchema,
    count: z.number(),
    percentage: z.number(),
  })),
  monthlyTrend: z.array(z.object({
    month: z.string(),
    count: z.number(),
    cost: z.number(),
  })).optional(),
})

export const maintenanceWorkOrderSchema = z.object({
  id: z.string(),
  maintenanceRequestId: z.string(),
  assignedTo: z.string(),
  scheduledDate: z.string().datetime(),
  estimatedHours: z.number().positive(),
  materials: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    cost: z.number(),
  })).optional(),
  instructions: z.string().optional(),
  createdAt: z.string().datetime(),
})