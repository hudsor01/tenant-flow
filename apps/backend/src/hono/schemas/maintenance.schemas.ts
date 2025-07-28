import { z } from 'zod'
import { REQUEST_STATUS, PRIORITY, MAINTENANCE_CATEGORY } from '@tenantflow/shared/constants/maintenance'



// Maintenance ID schema
export const maintenanceIdSchema = z.object({
  id: z.string().uuid()
})

// Maintenance list query schema
export const maintenanceListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.nativeEnum(REQUEST_STATUS).optional(),
  priority: z.nativeEnum(PRIORITY).optional(),
  category: z.nativeEnum(MAINTENANCE_CATEGORY).optional(),
  propertyId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  search: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  offset: z.string().optional()
})

// Create maintenance request schema
export const createMaintenanceRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.nativeEnum(PRIORITY),
  category: z.nativeEnum(MAINTENANCE_CATEGORY),
  propertyId: z.string().uuid(),
  unitId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  scheduledDate: z.string().datetime().optional(),
  estimatedCost: z.number().positive().optional()
})

// Update maintenance request schema
export const updateMaintenanceRequestSchema = createMaintenanceRequestSchema.partial()

// Update maintenance status schema
export const updateMaintenanceStatusSchema = z.object({
  status: z.nativeEnum(REQUEST_STATUS),
  assignedTo: z.string().optional(),
  completedAt: z.string().datetime().optional(),
  estimatedCost: z.number().positive().optional()
})

// Add maintenance note schema
export const addMaintenanceNoteSchema = z.object({
  note: z.string().min(1, 'Note is required'),
  isInternal: z.boolean().optional()
})
