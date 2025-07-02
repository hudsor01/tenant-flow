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
import { PropertiesService } from './properties.service';

interface CreatePropertyDto {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  description?: string;
  propertyType?: string;
}

interface UpdatePropertyDto {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  description?: string;
  propertyType?: string;
}

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getProperties(@Request() req: RequestWithUser) {
    try {
      return await this.propertiesService.getPropertiesByOwner(req.user.userId);
    } catch {
      throw new HttpException(
        'Failed to fetch properties',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getPropertyStats(@Request() req: RequestWithUser) {
    try {
      return await this.propertiesService.getPropertyStats(req.user.userId);
    } catch {
      throw new HttpException(
        'Failed to fetch property statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getProperty(@Param('id') id: string, @Request() req: RequestWithUser) {
    try {
      const property = await this.propertiesService.getPropertyById(
        id,
        req.user.userId,
      );

      if (!property) {
        throw new HttpException('Property not found', HttpStatus.NOT_FOUND);
      }

      return property;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch property',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createProperty(
    @Body() createPropertyDto: CreatePropertyDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      return await this.propertiesService.createProperty(
        req.user.userId,
        createPropertyDto,
      );
    } catch {
      throw new HttpException(
        'Failed to create property',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateProperty(
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      return await this.propertiesService.updateProperty(
        id,
        req.user.userId,
        updatePropertyDto,
      );
    } catch {
      throw new HttpException(
        'Failed to update property',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteProperty(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    try {
      await this.propertiesService.deleteProperty(id, req.user.userId);
      return { message: 'Property deleted successfully' };
    } catch {
      throw new HttpException(
        'Failed to delete property',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
