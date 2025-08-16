import { PartialType } from '@nestjs/mapped-types'
import { CreateMaintenanceRequestDto } from './create-maintenance-request.dto'
import { IsEnum, IsOptional } from 'class-validator'
import { Priority, RequestStatus } from '@repo/database'
import { UpdateMaintenanceRequestInput } from '@repo/shared'

export class UpdateMaintenanceRequestDto extends PartialType(CreateMaintenanceRequestDto) implements UpdateMaintenanceRequestInput {
  @IsEnum(RequestStatus, { message: 'Status must be one of: OPEN, IN_PROGRESS, COMPLETED, CANCELED, ON_HOLD' })
  @IsOptional()
  override status?: RequestStatus

  @IsEnum(Priority, { message: 'Priority must be one of: LOW, MEDIUM, HIGH, EMERGENCY' })
  @IsOptional()
  override priority?: Priority
}