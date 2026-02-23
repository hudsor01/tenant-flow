import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Request
} from '@nestjs/common'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { InspectionsService } from './inspections.service'
import { CreateInspectionDto } from './dto/create-inspection.dto'
import { UpdateInspectionDto } from './dto/update-inspection.dto'
import { CreateInspectionRoomDto } from './dto/create-inspection-room.dto'
import { UpdateInspectionRoomDto } from './dto/update-inspection-room.dto'
import { TenantReviewDto } from './dto/tenant-review.dto'
import { RecordPhotoDto } from './dto/record-photo.dto'

@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  // ============================================================
  // STATIC routes FIRST (before :id dynamic routes)
  // ============================================================

  @Get('by-lease/:leaseId')
  findByLease(
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.findByLease(leaseId, req.user.id)
  }

  @Post('rooms')
  createRoom(
    @Body() dto: CreateInspectionRoomDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.createRoom(dto, req.user.id)
  }

  @Put('rooms/:roomId')
  updateRoom(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateInspectionRoomDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.updateRoom(roomId, dto, req.user.id)
  }

  @Delete('rooms/:roomId')
  removeRoom(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.removeRoom(roomId, req.user.id)
  }

  @Post('photos')
  recordPhoto(
    @Body() dto: RecordPhotoDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.recordPhoto(dto, req.user.id)
  }

  @Delete('photos/:photoId')
  removePhoto(
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.removePhoto(photoId, req.user.id)
  }

  // ============================================================
  // DYNAMIC :id routes LAST
  // ============================================================

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.inspectionsService.findAll(req.user.id)
  }

  @Post()
  create(
    @Body() dto: CreateInspectionDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.create(dto, req.user.id)
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.findOne(id, req.user.id)
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInspectionDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.update(id, dto, req.user.id)
  }

  @Post(':id/complete')
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.complete(id, req.user.id)
  }

  @Post(':id/submit-for-review')
  submitForReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.submitForTenantReview(id, req.user.id)
  }

  @Post(':id/tenant-review')
  tenantReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TenantReviewDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.tenantReview(id, dto, req.user.id)
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.inspectionsService.remove(id, req.user.id)
  }
}
