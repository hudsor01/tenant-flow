import { PartialType } from '@nestjs/mapped-types'
import { CreateMaintenanceRequestDto } from './create-maintenance-request.dto'
import { IsOptional, IsEnum } from 'class-validator'
import { RequestStatus, Priority } from '@repo/database'

export class UpdateMaintenanceRequestDto extends PartialType(CreateMaintenanceRequestDto) {
  @IsEnum(RequestStatus, { message: 'Status must be one of: OPEN, IN_PROGRESS, COMPLETED, CANCELED, ON_HOLD' })
  @IsOptional()
  override status?: RequestStatus

  @IsEnum(Priority, { message: 'Priority must be one of: LOW, MEDIUM, HIGH, EMERGENCY' })
  @IsOptional()
  override priority?: Priority
}