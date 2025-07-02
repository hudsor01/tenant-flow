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
import { LeasesService } from './leases.service';
import { RequestWithUser } from '../auth/auth.types';

interface CreateLeaseDto {
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  securityDeposit: number;
  status?: string;
}

interface UpdateLeaseDto {
  startDate?: string;
  endDate?: string;
  rentAmount?: number;
  securityDeposit?: number;
  status?: string;
}

@Controller('leases')
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getLeases(@Request() req: RequestWithUser) {
    try {
      return await this.leasesService.getLeasesByOwner(req.user.id);
    } catch {
      throw new HttpException(
        'Failed to fetch leases',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getLeaseStats(@Request() req: RequestWithUser) {
    try {
      return await this.leasesService.getLeaseStats(req.user.id);
    } catch {
      throw new HttpException(
        'Failed to fetch lease statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('expiring')
  @UseGuards(JwtAuthGuard)
  async getExpiringLeases(
    @Request() req: RequestWithUser,
    @Query('days') days?: string,
  ) {
    try {
      const daysNumber = days ? parseInt(days, 10) : 30;
      return await this.leasesService.getExpiringLeases(
        req.user.id,
        daysNumber,
      );
    } catch {
      throw new HttpException(
        'Failed to fetch expiring leases',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getLease(@Param('id') id: string, @Request() req: RequestWithUser) {
    try {
      const lease = await this.leasesService.getLeaseById(id, req.user.id);

      if (!lease) {
        throw new HttpException('Lease not found', HttpStatus.NOT_FOUND);
      }

      return lease;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch lease',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createLease(
    @Body() createLeaseDto: CreateLeaseDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      return await this.leasesService.createLease(
        req.user.id,
        createLeaseDto,
      );
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
        error.message === 'Tenant not found or access denied'
      ) {
        throw new HttpException(
          'Tenant not found or access denied',
          HttpStatus.NOT_FOUND,
        );
      }
      if (
        error instanceof Error &&
        error.message === 'Unit has overlapping lease for the specified dates'
      ) {
        throw new HttpException(
          'Unit has overlapping lease for the specified dates',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException('Failed to create lease', HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateLease(
    @Param('id') id: string,
    @Body() updateLeaseDto: UpdateLeaseDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      return await this.leasesService.updateLease(
        id,
        req.user.id,
        updateLeaseDto,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Lease not found or access denied'
      ) {
        throw new HttpException(
          'Lease not found or access denied',
          HttpStatus.NOT_FOUND,
        );
      }
      if (
        error instanceof Error &&
        error.message === 'Unit has overlapping lease for the specified dates'
      ) {
        throw new HttpException(
          'Unit has overlapping lease for the specified dates',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException('Failed to update lease', HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteLease(@Param('id') id: string, @Request() req: RequestWithUser) {
    try {
      await this.leasesService.deleteLease(id, req.user.id);
      return { message: 'Lease deleted successfully' };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Lease not found or access denied'
      ) {
        throw new HttpException(
          'Lease not found or access denied',
          HttpStatus.NOT_FOUND,
        );
      }
      if (
        error instanceof Error &&
        error.message === 'Cannot delete active lease'
      ) {
        throw new HttpException(
          'Cannot delete active lease',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        error instanceof Error &&
        error.message === 'Cannot delete lease with payment history'
      ) {
        throw new HttpException(
          'Cannot delete lease with payment history',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'Failed to delete lease',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
