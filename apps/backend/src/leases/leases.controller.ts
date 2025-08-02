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
import { LeasesService } from './leases.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ErrorHandlingInterceptor } from '../common/interceptors/error-handling.interceptor'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import { CreateLeaseDto, UpdateLeaseDto, LeaseQueryDto } from './dto'

@Controller('leases')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ErrorHandlingInterceptor)
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Get()
  async getLeases(
    @CurrentUser() user: ValidatedUser,
    @Query() query: LeaseQueryDto
  ) {
    return await this.leasesService.getByOwner(user.id, query as any)
  }

  @Get('stats')
  async getLeaseStats(@CurrentUser() user: ValidatedUser) {
    return await this.leasesService.getStats(user.id)
  }

  @Get('by-unit/:unitId')
  async getLeasesByUnit(
    @Param('unitId') unitId: string,
    @CurrentUser() user: ValidatedUser,
    @Query() query: LeaseQueryDto
  ) {
    return await this.leasesService.getByUnit(unitId, user.id, query)
  }

  @Get('by-tenant/:tenantId')
  async getLeasesByTenant(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: ValidatedUser,
    @Query() query: LeaseQueryDto
  ) {
    return await this.leasesService.getByTenant(tenantId, user.id, query)
  }

  @Get(':id')
  async getLease(
    @Param('id') id: string,
    @CurrentUser() user: ValidatedUser
  ) {
    return await this.leasesService.getByIdOrThrow(id, user.id)
  }

  @Post()
  async createLease(
    @Body() createLeaseDto: CreateLeaseDto,
    @CurrentUser() user: ValidatedUser
  ) {
    return await this.leasesService.create(
      createLeaseDto,
      user.id
    )
  }

  @Put(':id')
  async updateLease(
    @Param('id') id: string,
    @Body() updateLeaseDto: UpdateLeaseDto,
    @CurrentUser() user: ValidatedUser
  ) {
    return await this.leasesService.update(
      id,
      updateLeaseDto,
      user.id
    )
  }

  @Delete(':id')
  async deleteLease(
    @Param('id') id: string,
    @CurrentUser() user: ValidatedUser
  ) {
    await this.leasesService.delete(id, user.id)
    return { message: 'Lease deleted successfully' }
  }
}