import { HTTPException } from 'hono/http-exception'
import type { UnitsService } from '../../units/units.service'
import { requireAuth } from '../middleware/auth.middleware'
import {
  unitSchemas,
  assignTenantSchema,
  unitPropertyIdSchema
} from '../schemas/unit.schemas'
import { createCrudRoutes, addNestedRoute, type CrudService } from '../factories/crud-route.factory'
import { safeValidator, safeParamValidator } from '../utils/safe-validator'
import type { Unit } from '@tenantflow/shared/types/properties'
import type { CreateUnitInput, UpdateUnitInput } from '@tenantflow/shared/types/api-inputs'
import type { UnitQuery } from '@tenantflow/shared/types/queries'




// Adapter to make UnitsService compatible with CrudService interface
class UnitsServiceAdapter implements CrudService<Unit, CreateUnitInput, UpdateUnitInput> {
  constructor(private service: UnitsService) {}

  async findAllByOwner(ownerId: string, _query?: UnitQuery) {
    return this.service.getUnitsByOwner(ownerId)
  }

  async findById(id: string, ownerId: string) {
    return this.service.getUnitById(id, ownerId)
  }

  async create(ownerId: string, data: CreateUnitInput) {
    return this.service.createUnit(ownerId, {
      ...data,
      rent: data.monthlyRent
    })
  }

  async update(id: string, ownerId: string, data: UpdateUnitInput) {
    const transformedData = {
      unitNumber: data.unitNumber,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      squareFeet: data.squareFeet,
      rent: data.monthlyRent,
      status: data.status,
      ...(data.lastInspectionDate && {
        lastInspectionDate: typeof data.lastInspectionDate === 'string' 
          ? new Date(data.lastInspectionDate) 
          : data.lastInspectionDate
      })
    }
    return this.service.updateUnit(id, ownerId, transformedData)
  }

  async delete(id: string, ownerId: string) {
    return this.service.deleteUnit(id, ownerId)
  }
}

export const createUnitsRoutes = (
  unitsService: UnitsService
) => {
  const adapter = new UnitsServiceAdapter(unitsService)

  return createCrudRoutes({
    service: adapter,
    schemas: unitSchemas,
    resourceName: 'Unit',
    customRoutes: (app, _service) => {
      // GET /units/by-property/:propertyId - Get units by property
      addNestedRoute(app, {
        path: '/by-property/:propertyId',
        paramSchema: unitPropertyIdSchema,
        handler: async (userId: string, params: { propertyId: string }) => {
          return unitsService.getUnitsByProperty(params.propertyId, userId)
        }
      })

      // POST /units/:id/assign-tenant - Assign tenant to unit
      app.post(
        '/:id/assign-tenant',
        requireAuth,
        safeParamValidator(unitSchemas.id),
        safeValidator(assignTenantSchema),
        async (c) => {
          const _user = c.get('user')!
          const paramData = c.req.valid('param' as never) as { id: string }
          const jsonData = c.req.valid('json' as never) as { tenantId: string }
          const { id: _id } = paramData
          const { tenantId: _tenantId } = jsonData

          try {
            // TODO: Implement assignTenant method in UnitsService
            throw new HTTPException(501, { message: 'assignTenant method not implemented' })
            // const unit = await unitsService.assignTenant(id, tenantId, user.id)
            // return c.json(unit)
          } catch (error) {
            if (error instanceof Error && (error.message === 'Unit not found' || error.message === 'Tenant not found')) {
              throw new HTTPException(404, { message: error.message })
            }
            if (error instanceof HTTPException) throw error
            throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
          }
        }
      )

      // POST /units/:id/remove-tenant - Remove tenant from unit
      app.post(
        '/:id/remove-tenant',
        requireAuth,
        safeParamValidator(unitSchemas.id),
        async (c) => {
          const _user = c.get('user')!
          const paramData = c.req.valid('param' as never) as { id: string }
          const { id: _id } = paramData

          try {
            // TODO: Implement removeTenant method in UnitsService
            throw new HTTPException(501, { message: 'removeTenant method not implemented' })
            // const unit = await unitsService.removeTenant(id, user.id)
            // return c.json(unit)
          } catch (error) {
            if (error instanceof Error && error.message === 'Unit not found') {
              throw new HTTPException(404, { message: error.message })
            }
            if (error instanceof HTTPException) throw error
            throw new HTTPException(500, { message: error instanceof Error ? error.message : "Unknown error" })
          }
        }
      )
    }
  })
}