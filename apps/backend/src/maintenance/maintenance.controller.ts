import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { MaintenanceService } from './maintenance.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ErrorHandlingInterceptor } from '../common/interceptors/error-handling.interceptor'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import { CreateMaintenanceRequestDto, UpdateMaintenanceRequestDto, MaintenanceRequestQueryDto } from './dto'



@Controller('maintenance-requests')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ErrorHandlingInterceptor)
export class MaintenanceController {
  constructor(
    private readonly maintenanceService: MaintenanceService
  ) {}

  @Get()
  async getMaintenanceRequests(
    @CurrentUser() user: ValidatedUser,
    @Query() query: MaintenanceRequestQueryDto
  ) {
    return await this.maintenanceService.getByOwner(user.id, query)
  }

  @Get('stats')
  async getMaintenanceRequestStats(@CurrentUser() user: ValidatedUser) {
    return await this.maintenanceService.getStats(user.id)
  }

  @Get('by-unit/:unitId')
  async getMaintenanceRequestsByUnit(
    @Param('unitId') unitId: string,
    @CurrentUser() user: ValidatedUser,
    @Query() query: MaintenanceRequestQueryDto
  ) {
    return await this.maintenanceService.getByUnit(unitId, user.id, query)
  }

  @Get(':id')
  async getMaintenanceRequest(
    @Param('id') id: string,
    @CurrentUser() user: ValidatedUser
  ) {
    return await this.maintenanceService.getByIdOrThrow(id, user.id)
  }

  @Post()
  async createMaintenanceRequest(
    @Body() createMaintenanceRequestDto: CreateMaintenanceRequestDto,
    @CurrentUser() user: ValidatedUser
  ) {
    return await this.maintenanceService.create(
      createMaintenanceRequestDto,
      user.id
    )
  }

  @Put(':id')
  async updateMaintenanceRequest(
    @Param('id') id: string,
    @Body() updateMaintenanceRequestDto: UpdateMaintenanceRequestDto,
    @CurrentUser() user: ValidatedUser
  ) {
    return await this.maintenanceService.update(
      id,
      updateMaintenanceRequestDto,
      user.id
    )
  }

  @Delete(':id')
  async deleteMaintenanceRequest(
    @Param('id') id: string,
    @CurrentUser() user: ValidatedUser
  ) {
    await this.maintenanceService.delete(id, user.id)
    return { message: 'Maintenance request deleted successfully' }
  }

}
