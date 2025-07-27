import { z } from 'zod'
import { MaintenanceStatus, MaintenancePriority, MaintenanceCategory } from '@tenantflow/shared'

// Maintenance ID schema
export const maintenanceIdSchema = z.object({
  id: z.string().uuid()
})

// Maintenance list query schema
export const maintenanceListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.nativeEnum(MaintenanceStatus).optional(),
  priority: z.nativeEnum(MaintenancePriority).optional(),
  category: z.nativeEnum(MaintenanceCategory).optional(),
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
  priority: z.nativeEnum(MaintenancePriority),
  category: z.nativeEnum(MaintenanceCategory),
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
  status: z.nativeEnum(MaintenanceStatus),
  assignedTo: z.string().optional(),
  completedAt: z.string().datetime().optional(),
  estimatedCost: z.number().positive().optional()
})

// Add maintenance note schema
export const addMaintenanceNoteSchema = z.object({
  note: z.string().min(1, 'Note is required'),
  isInternal: z.boolean().optional()
})