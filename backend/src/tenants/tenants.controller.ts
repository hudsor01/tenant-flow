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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestWithUser } from '../auth/auth.types';
import { TenantsService } from './tenants.service';

interface CreateTenantDto {
  name: string;
  email: string;
  phone?: string;
  emergencyContact?: string;
}

interface UpdateTenantDto {
  name?: string;
  email?: string;
  phone?: string;
  emergencyContact?: string;
}

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getTenants(@Request() req: RequestWithUser) {
    try {
      return await this.tenantsService.getTenantsByOwner(req.user.id);
    } catch {
      throw new HttpException(
        'Failed to fetch tenants',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getTenantStats(@Request() req: RequestWithUser) {
    try {
      return await this.tenantsService.getTenantStats(req.user.id);
    } catch {
      throw new HttpException(
        'Failed to fetch tenant statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getTenant(@Param('id') id: string, @Request() req: RequestWithUser) {
    try {
      const tenant = await this.tenantsService.getTenantById(
        id,
        req.user.id,
      );

      if (!tenant) {
        throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
      }

      return tenant;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch tenant',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createTenant(
    @Body() createTenantDto: CreateTenantDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      return await this.tenantsService.createTenant(
        req.user.id,
        createTenantDto,
      );
    } catch {
      throw new HttpException(
        'Failed to create tenant',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateTenant(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      return await this.tenantsService.updateTenant(
        id,
        req.user.id,
        updateTenantDto,
      );
    } catch {
      throw new HttpException(
        'Failed to update tenant',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteTenant(@Param('id') id: string, @Request() req: RequestWithUser) {
    try {
      await this.tenantsService.deleteTenant(id, req.user.id);
      return { message: 'Tenant deleted successfully' };
    } catch (error) {
      if (error instanceof Error && error.message === 'Tenant not found') {
        throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
      }
      if (
        error instanceof Error &&
        error.message === 'Cannot delete tenant with active leases'
      ) {
        throw new HttpException(
          'Cannot delete tenant with active leases',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'Failed to delete tenant',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
