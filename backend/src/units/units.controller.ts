import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestWithUser } from '../auth/auth.types';
import { UnitsService } from './units.service';

interface CreateUnitDto {
  unitNumber: string;
  propertyId: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  rent: number;
  status?: string;
}

interface UpdateUnitDto {
  unitNumber?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  rent?: number;
  status?: string;
  lastInspectionDate?: string;
}

@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUnits(
    @Request() req: RequestWithUser,
    @Query('propertyId') propertyId?: string,
  ) {
    try {
      if (propertyId) {
        return await this.unitsService.getUnitsByProperty(
          propertyId,
          req.user.userId,
        );
      }
      return await this.unitsService.getUnitsByOwner(req.user.userId);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Property not found or access denied'
      ) {
        throw new HttpException(
          'Property not found or access denied',
          HttpStatus.NOT_FOUND,
        );
      }
      throw new HttpException(
        'Failed to fetch units',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getUnitStats(@Request() req: RequestWithUser) {
    try {
      return await this.unitsService.getUnitStats(req.user.userId);
    } catch {
      throw new HttpException(
        'Failed to fetch unit statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUnit(@Param('id') id: string, @Request() req: RequestWithUser) {
    try {
      const unit = await this.unitsService.getUnitById(id, req.user.userId);

      if (!unit) {
        throw new HttpException('Unit not found', HttpStatus.NOT_FOUND);
      }

      return unit;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch unit',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createUnit(
    @Body() createUnitDto: CreateUnitDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      return await this.unitsService.createUnit(req.user.userId, createUnitDto);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Property not found or access denied'
      ) {
        throw new HttpException(
          'Property not found or access denied',
          HttpStatus.NOT_FOUND,
        );
      }
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        // Unique constraint violation
        throw new HttpException(
          'Unit number already exists for this property',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException('Failed to create unit', HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateUnit(
    @Param('id') id: string,
    @Body() updateUnitDto: UpdateUnitDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      // Convert lastInspectionDate string to Date if provided
      const unitData = {
        ...updateUnitDto,
        lastInspectionDate: updateUnitDto.lastInspectionDate
          ? new Date(updateUnitDto.lastInspectionDate)
          : undefined,
      };

      return await this.unitsService.updateUnit(id, req.user.userId, unitData);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Unit not found or access denied'
      ) {
        throw new HttpException(
          'Unit not found or access denied',
          HttpStatus.NOT_FOUND,
        );
      }
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new HttpException(
          'Unit number already exists for this property',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException('Failed to update unit', HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteUnit(@Param('id') id: string, @Request() req: RequestWithUser) {
    try {
      await this.unitsService.deleteUnit(id, req.user.userId);
      return { message: 'Unit deleted successfully' };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Unit not found or access denied'
      ) {
        throw new HttpException(
          'Unit not found or access denied',
          HttpStatus.NOT_FOUND,
        );
      }
      if (
        error instanceof Error &&
        error.message === 'Cannot delete unit with active leases'
      ) {
        throw new HttpException(
          'Cannot delete unit with active leases',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'Failed to delete unit',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
