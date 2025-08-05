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
  UseInterceptors,
  Type,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
  BadRequestException
} from '@nestjs/common'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { ErrorHandlingInterceptor } from '../interceptors/error-handling.interceptor'  
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../../auth/auth.service'
import type { ApiResponse } from '@repo/shared'

/**
 * Base CRUD Controller Interface
 * 
 * Defines the contract that services must implement to work with BaseCrudController
 */
export interface CrudService<TEntity, TCreateDto, TUpdateDto, TQueryDto = any> {
  // Core CRUD operations
  create(ownerId: string, createDto: TCreateDto): Promise<TEntity>
  findByOwner(ownerId: string, query?: TQueryDto): Promise<TEntity[]>
  findById(ownerId: string, id: string): Promise<TEntity | null>
  update(ownerId: string, id: string, updateDto: TUpdateDto): Promise<TEntity>
  delete(ownerId: string, id: string): Promise<void>
  
  // Optional stats method
  getStats?(ownerId: string): Promise<any>
}

/**
 * Base CRUD Controller Options
 */
export interface BaseCrudControllerOptions {
  // Entity name for logging and error messages
  entityName: string
  
  // Whether to include stats endpoint
  enableStats?: boolean
  
  // Custom validation pipes
  createValidationPipe?: ValidationPipe
  updateValidationPipe?: ValidationPipe
  queryValidationPipe?: ValidationPipe
  
  // Custom guards (in addition to JwtAuthGuard)
  additionalGuards?: Type<any>[]
  
  // Custom interceptors (in addition to ErrorHandlingInterceptor)
  additionalInterceptors?: Type<any>[]
}

/**
 * Base CRUD Controller Factory
 * 
 * Creates a standardized CRUD controller with:
 * - JWT authentication
 * - Error handling
 * - Consistent response formats
 * - Owner-based filtering (multi-tenant security)
 * - Input validation
 * - Type safety
 * 
 * @param options Configuration options for the controller
 */
export function BaseCrudController<TEntity, TCreateDto, TUpdateDto, TQueryDto = any>(
  options: BaseCrudControllerOptions
) {
  const {
    entityName,
    enableStats = false,
    createValidationPipe = new ValidationPipe({ transform: true, whitelist: true }),
    updateValidationPipe = new ValidationPipe({ transform: true, whitelist: true }),
    queryValidationPipe = new ValidationPipe({ transform: true, whitelist: true }),
    additionalGuards = [],
    additionalInterceptors = []
  } = options

  // Build guards array
  const guards = [JwtAuthGuard, ...additionalGuards]
  
  // Build interceptors array  
  const interceptors = [ErrorHandlingInterceptor, ...additionalInterceptors]

  @Controller()
  @UseGuards(...guards)
  @UseInterceptors(...interceptors)
  class BaseCrudControllerClass {
    constructor(
      protected readonly service: CrudService<TEntity, TCreateDto, TUpdateDto, TQueryDto>
    ) {}

    /**
     * Get all entities for the current user
     * GET /entities
     */
    @Get()
    async findAll(
      @CurrentUser() user: ValidatedUser,
      @Query(queryValidationPipe) query: TQueryDto
    ): Promise<ApiResponse<TEntity[]>> {
      try {
        const entities = await this.service.findByOwner(user.id, query)
        
        return {
          success: true,
          data: entities,
          message: `${entityName} retrieved successfully`
        }
      } catch (error) {
        throw new BadRequestException(`Failed to retrieve ${entityName.toLowerCase()}s: ${error.message}`)
      }
    }

    /**
     * Get entity statistics (if enabled)
     * GET /entities/stats
     */
    @Get('stats')
    async getStats(
      @CurrentUser() user: ValidatedUser
    ): Promise<ApiResponse<any>> {
      if (!enableStats || !this.service.getStats) {
        throw new BadRequestException(`Stats not available for ${entityName.toLowerCase()}s`)
      }

      try {
        const stats = await this.service.getStats(user.id)
        
        return {
          success: true,
          data: stats,
          message: `${entityName} stats retrieved successfully`
        }
      } catch (error) {
        throw new BadRequestException(`Failed to retrieve ${entityName.toLowerCase()} stats: ${error.message}`)
      }
    }

    /**
     * Get single entity by ID
     * GET /entities/:id
     */
    @Get(':id')
    async findOne(
      @Param('id', ParseUUIDPipe) id: string,
      @CurrentUser() user: ValidatedUser
    ): Promise<ApiResponse<TEntity>> {
      try {
        const entity = await this.service.findById(user.id, id)
        
        if (!entity) {
          throw new BadRequestException(`${entityName} not found`)
        }

        return {
          success: true,
          data: entity,
          message: `${entityName} retrieved successfully`
        }
      } catch (error) {
        throw new BadRequestException(`Failed to retrieve ${entityName.toLowerCase()}: ${error.message}`)
      }
    }

    /**
     * Create new entity
     * POST /entities
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
      @Body(createValidationPipe) createDto: TCreateDto,
      @CurrentUser() user: ValidatedUser
    ): Promise<ApiResponse<TEntity>> {
      try {
        const entity = await this.service.create(user.id, createDto)
        
        return {
          success: true,
          data: entity,
          message: `${entityName} created successfully`
        }
      } catch (error) {
        throw new BadRequestException(`Failed to create ${entityName.toLowerCase()}: ${error.message}`)
      }
    }

    /**
     * Update existing entity
     * PUT /entities/:id
     */
    @Put(':id')
    async update(
      @Param('id', ParseUUIDPipe) id: string,
      @Body(updateValidationPipe) updateDto: TUpdateDto,
      @CurrentUser() user: ValidatedUser
    ): Promise<ApiResponse<TEntity>> {
      try {
        const entity = await this.service.update(user.id, id, updateDto)
        
        return {
          success: true,
          data: entity,
          message: `${entityName} updated successfully`
        }
      } catch (error) {
        throw new BadRequestException(`Failed to update ${entityName.toLowerCase()}: ${error.message}`)
      }
    }

    /**
     * Delete entity
     * DELETE /entities/:id
     */
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(
      @Param('id', ParseUUIDPipe) id: string,
      @CurrentUser() user: ValidatedUser
    ): Promise<void> {
      try {
        await this.service.delete(user.id, id)
      } catch (error) {
        throw new BadRequestException(`Failed to delete ${entityName.toLowerCase()}: ${error.message}`)
      }
    }
  }

  return BaseCrudControllerClass
}

/**
 * Enhanced Base CRUD Controller with additional common endpoints
 */
export function EnhancedBaseCrudController<TEntity, TCreateDto, TUpdateDto, TQueryDto = any>(
  options: BaseCrudControllerOptions & {
    // Enable bulk operations
    enableBulkOperations?: boolean
    // Enable soft delete
    enableSoftDelete?: boolean
    // Enable archiving
    enableArchive?: boolean
  }
) {
  const {
    enableBulkOperations = false,
    enableSoftDelete = false,
    enableArchive = false
  } = options

  // Get base controller
  const BaseController = BaseCrudController<TEntity, TCreateDto, TUpdateDto, TQueryDto>(options)

  @Controller()
  class EnhancedBaseCrudControllerClass extends BaseController {
    
    /**
     * Bulk create entities (if enabled)
     * POST /entities/bulk
     */
    @Post('bulk')
    @HttpCode(HttpStatus.CREATED)
    async bulkCreate(
      @Body() createDtos: TCreateDto[],
      @CurrentUser() user: ValidatedUser
    ): Promise<ApiResponse<TEntity[]>> {
      if (!enableBulkOperations) {
        throw new BadRequestException('Bulk operations not supported')
      }

      try {
        const entities = await Promise.all(
          createDtos.map(dto => this.service.create(user.id, dto))
        )
        
        return {
          success: true,
          data: entities,
          message: `${entities.length} ${options.entityName.toLowerCase()}s created successfully`
        }
      } catch (error) {
        throw new BadRequestException(`Failed to bulk create ${options.entityName.toLowerCase()}s: ${error.message}`)
      }
    }

    /**
     * Soft delete entity (if enabled)
     * PATCH /entities/:id/archive
     */
    @Put(':id/archive')
    async archive(
      @Param('id', ParseUUIDPipe) id: string,
      @CurrentUser() user: ValidatedUser
    ): Promise<ApiResponse<TEntity>> {
      if (!enableArchive) {
        throw new BadRequestException('Archive operation not supported')
      }

      try {
        // Assuming the service has an archive method
        const entity = await (this.service as any).archive(user.id, id)
        
        return {
          success: true,
          data: entity,
          message: `${options.entityName} archived successfully`
        }
      } catch (error) {
        throw new BadRequestException(`Failed to archive ${options.entityName.toLowerCase()}: ${error.message}`)
      }
    }

    /**
     * Restore archived entity (if enabled)
     * PATCH /entities/:id/restore
     */
    @Put(':id/restore')
    async restore(
      @Param('id', ParseUUIDPipe) id: string,
      @CurrentUser() user: ValidatedUser
    ): Promise<ApiResponse<TEntity>> {
      if (!enableArchive) {
        throw new BadRequestException('Restore operation not supported')
      }

      try {
        // Assuming the service has a restore method
        const entity = await (this.service as any).restore(user.id, id)
        
        return {
          success: true,
          data: entity,
          message: `${options.entityName} restored successfully`
        }
      } catch (error) {
        throw new BadRequestException(`Failed to restore ${options.entityName.toLowerCase()}: ${error.message}`)
      }
    }
  }

  return EnhancedBaseCrudControllerClass
}

/**
 * Helper function to create a simple CRUD controller
 */
export function createCrudController<TEntity, TCreateDto, TUpdateDto, TQueryDto = any>(
  entityName: string,
  service: CrudService<TEntity, TCreateDto, TUpdateDto, TQueryDto>,
  options?: Partial<BaseCrudControllerOptions>
) {
  const ControllerClass = BaseCrudController<TEntity, TCreateDto, TUpdateDto, TQueryDto>({
    entityName,
    ...options
  })

  return new ControllerClass(service)
}

/**
 * Type-safe CRUD controller decorator
 * 
 * Usage:
 * ```typescript
 * @CrudController('properties', { enableStats: true })
 * export class PropertiesController extends BaseCrudController<Property, CreatePropertyDto, UpdatePropertyDto> {
 *   constructor(service: PropertiesService) {
 *     super(service)
 *   }
 * }
 * ```
 */
export function CrudController(
  entityName: string,
  options?: Partial<BaseCrudControllerOptions>
) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    const controllerOptions: BaseCrudControllerOptions = {
      entityName,
      ...options
    }
    
    // Add metadata for reflection
    Reflect.defineMetadata('crud:options', controllerOptions, constructor)
    Reflect.defineMetadata('crud:entityName', entityName, constructor)
    
    return constructor
  }
}