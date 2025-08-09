import { Controller, Get, Param, Query } from '@nestjs/common'
import { MaintenanceService } from './maintenance.service'
import { MaintenanceRequest } from '@repo/database'
import { CreateMaintenanceRequestDto, UpdateMaintenanceRequestDto, MaintenanceRequestQueryDto } from './dto'
import { BaseCrudController, type CrudService } from '../common/controllers/base-crud.controller'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'

// Create the base CRUD controller class
const MaintenanceCrudController = BaseCrudController<
  MaintenanceRequest,
  CreateMaintenanceRequestDto,
  UpdateMaintenanceRequestDto,
  MaintenanceRequestQueryDto
>({
  entityName: 'MaintenanceRequest',
  enableStats: true
})

@Controller('maintenance-requests')
export class MaintenanceController extends MaintenanceCrudController {
  constructor(private readonly maintenanceService: MaintenanceService) {
    // Cast to compatible interface - the services implement the same functionality with different signatures
    super(maintenanceService as CrudService<MaintenanceRequest, CreateMaintenanceRequestDto, UpdateMaintenanceRequestDto, MaintenanceRequestQueryDto>)
  }

  // Add maintenance-specific endpoints that aren't part of basic CRUD

  @Get('by-unit/:unitId')
  async getMaintenanceRequestsByUnit(
    @Param('unitId') unitId: string,
    @CurrentUser() user: ValidatedUser,
    @Query() query: MaintenanceRequestQueryDto
  ) {
    const requests = await this.maintenanceService.getByUnit(unitId, user.id, query)
    return {
      success: true,
      data: requests,
      message: 'Maintenance requests retrieved successfully'
    }
  }
}
