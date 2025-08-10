# BaseCrudService Usage Guide

**Version**: 1.0.0  
**Last Updated**: 2025-08-02  
**Audience**: TenantFlow Backend Developers

## Overview

The `BaseCrudService` is an abstract class that eliminates code duplication across domain services by providing standardized CRUD operations with extension points for service-specific logic.

## Quick Start

### 1. Basic Service Implementation

```typescript
import { Injectable, Logger } from '@nestjs/common'
import { BaseCrudService } from '../common/services/base-crud.service'
import { PropertyRepository } from './properties.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { Property } from '@prisma/client'
import { CreatePropertyDto, UpdatePropertyDto, PropertyQueryDto } from './dto'

@Injectable()
export class PropertiesService extends BaseCrudService<
  Property,           // T - Entity type
  CreatePropertyDto,  // TCreate - Creation DTO
  UpdatePropertyDto,  // TUpdate - Update DTO
  PropertyQueryDto    // TQuery - Query parameters
> {
  constructor(
    repository: PropertyRepository,
    errorHandler: ErrorHandlerService
  ) {
    super(repository, errorHandler, new Logger(PropertiesService.name))
  }

  // Implement required abstract methods
  protected async validateCreate(data: CreatePropertyDto): Promise<void> {
    // Property-specific creation validation
    if (!data.name?.trim()) {
      throw new ValidationException('Property name is required', 'name')
    }
  }

  protected async validateUpdate(data: UpdatePropertyDto): Promise<void> {
    // Property-specific update validation
  }

  protected async verifyOwnership(id: string, ownerId: string): Promise<void> {
    const exists = await this.repository.exists({ id, ownerId })
    if (!exists) {
      throw new NotFoundException(`Property with ID ${id} not found`)
    }
  }

  protected async buildStatsQuery(ownerId: string): Promise<any> {
    return await this.repository.getStatsByOwner(ownerId)
  }
}
```

### 2. Controller Integration

Controllers remain unchanged - the BaseCrudService maintains the same public interface:

```typescript
@Controller('properties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  async findAll(@CurrentUser() user: User, @Query() query: PropertyQueryDto) {
    return this.propertiesService.getByOwner(user.organizationId, query)
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.propertiesService.getByIdOrThrow(id, user.organizationId)
  }

  @Post()
  async create(@Body() data: CreatePropertyDto, @CurrentUser() user: User) {
    return this.propertiesService.create(data, user.organizationId)
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdatePropertyDto,
    @CurrentUser() user: User
  ) {
    return this.propertiesService.update(id, data, user.organizationId)
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.propertiesService.delete(id, user.organizationId)
  }

  @Get('stats')
  async getStats(@CurrentUser() user: User) {
    return this.propertiesService.getStats(user.organizationId)
  }
}
```

## Advanced Patterns

### 1. Using Lifecycle Hooks

```typescript
export class LeasesService extends BaseCrudService<Lease, CreateLeaseDto, UpdateLeaseDto, LeaseQueryDto> {
  
  // Hook: Transform data before creation
  protected async beforeCreate(data: CreateLeaseDto, ownerId: string): Promise<CreateLeaseDto> {
    return {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate)
    }
  }

  // Hook: Additional logic after creation
  protected async afterCreate(result: Lease, data: CreateLeaseDto, ownerId: string): Promise<Lease> {
    // Send notification, update unit status, etc.
    await this.notificationService.sendLeaseCreatedNotification(result.id)
    return result
  }

  // Hook: Validation before update
  protected async beforeUpdate(id: string, data: UpdateLeaseDto, ownerId: string): Promise<UpdateLeaseDto> {
    // Check for lease conflicts
    if (data.startDate || data.endDate) {
      await this.validateLeaseDates(data, id)
    }
    return data
  }

  protected async validateCreate(data: CreateLeaseDto): Promise<void> {
    this.validateLeaseDates(data.startDate, data.endDate)
    await this.checkLeaseConflicts(data.unitId, data.startDate, data.endDate)
  }

  private validateLeaseDates(startDate: string, endDate: string): void {
    if (new Date(endDate) <= new Date(startDate)) {
      throw new InvalidLeaseDatesException(startDate, endDate)
    }
  }
}
```

### 2. Complex Business Logic Extension

```typescript
export class MaintenanceService extends BaseCrudService<MaintenanceRequest, CreateMaintenanceRequestDto, UpdateMaintenanceRequestDto, MaintenanceRequestQueryDto> {
  
  constructor(
    repository: MaintenanceRequestRepository,
    errorHandler: ErrorHandlerService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService
  ) {
    super(repository, errorHandler, new Logger(MaintenanceService.name))
  }

  // Override the update method for custom status handling
  async update(id: string, data: UpdateMaintenanceRequestDto, ownerId: string): Promise<MaintenanceRequest> {
    const existingRequest = await this.getByIdOrThrow(id, ownerId)
    
    // Handle status transitions
    if (data.status && data.status !== existingRequest.status) {
      await this.handleStatusTransition(existingRequest, data.status, ownerId)
    }
    
    // Call parent implementation
    return super.update(id, data, ownerId)
  }

  // Service-specific method
  async sendNotification(requestId: string, type: NotificationType, ownerId: string) {
    const request = await this.getByIdOrThrow(requestId, ownerId)
    
    if (request.priority === 'EMERGENCY') {
      await this.emailService.sendEmergencyNotification(request)
    } else {
      await this.notificationService.sendMaintenanceUpdate(request)
    }
  }

  protected async validateCreate(data: CreateMaintenanceRequestDto): Promise<void> {
    // Verify unit ownership
    await this.verifyUnitOwnership(data.unitId)
    
    // Validate priority levels
    if (data.priority === 'EMERGENCY' && !data.description?.includes('emergency')) {
      throw new ValidationException('Emergency requests require emergency description', 'description')
    }
  }

  private async handleStatusTransition(request: MaintenanceRequest, newStatus: string, ownerId: string): Promise<void> {
    if (newStatus === 'COMPLETED') {
      await this.markCompletedAt(request.id)
      await this.sendCompletionNotification(request.id, ownerId)
    }
  }
}
```

### 3. File Handling with Validation

```typescript
export class DocumentsService extends BaseCrudService<Document, CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto> {
  
  private readonly MAX_FILE_SIZE = 104857600 // 100MB
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    // ... other types
  ]

  protected async validateCreate(data: CreateDocumentDto): Promise<void> {
    // File size validation
    if (data.fileSizeBytes && data.fileSizeBytes > this.MAX_FILE_SIZE) {
      throw new DocumentFileSizeException(data.filename, data.fileSizeBytes, this.MAX_FILE_SIZE)
    }
    
    // File type validation
    if (data.mimeType && !this.ALLOWED_MIME_TYPES.includes(data.mimeType)) {
      throw new DocumentFileTypeException(data.filename, data.mimeType, this.ALLOWED_MIME_TYPES)
    }
    
    // URL validation
    if (data.url && !this.isValidUrl(data.url)) {
      throw new DocumentUrlException(data.url, 'Invalid URL format')
    }
  }

  protected async beforeCreate(data: CreateDocumentDto, ownerId: string): Promise<CreateDocumentDto> {
    // Verify ownership of related entities
    if (data.propertyId) {
      await this.verifyPropertyOwnership(data.propertyId, ownerId)
    }
    
    if (data.leaseId) {
      await this.verifyLeaseOwnership(data.leaseId, ownerId)
    }
    
    return {
      ...data,
      size: data.fileSizeBytes ? BigInt(data.fileSizeBytes) : undefined
    }
  }

  // Service-specific methods
  async getByProperty(propertyId: string, ownerId: string, query?: DocumentQueryDto) {
    await this.verifyPropertyOwnership(propertyId, ownerId)
    return this.repository.findByProperty(propertyId, ownerId, query)
  }

  async getByType(type: DocumentType, ownerId: string, query?: DocumentQueryDto) {
    return this.repository.findByType(type, ownerId, query)
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      return ['http:', 'https:'].includes(parsedUrl.protocol)
    } catch {
      return false
    }
  }
}
```

## Best Practices

### 1. Validation Strategy
- **Create Validation**: Always validate required fields and business rules
- **Update Validation**: Validate only changed fields, allow partial updates
- **Cross-Entity Validation**: Use repository methods to verify relationships

### 2. Error Handling
```typescript
protected async validateCreate(data: CreateDto): Promise<void> {
  // Use specific exception types
  if (!data.name?.trim()) {
    throw new ValidationException('Name is required', 'name')
  }
  
  // Check business rules
  if (await this.isDuplicate(data.name)) {
    throw new ConflictException('Name already exists')
  }
}
```

### 3. Lifecycle Hook Usage
- **beforeCreate/beforeUpdate**: Data transformation, validation
- **afterCreate/afterUpdate**: Notifications, side effects, logging
- Keep hooks focused and avoid complex business logic

### 4. Service-Specific Methods
```typescript
// Good: Clearly service-specific
async getByProperty(propertyId: string, ownerId: string) {
  // Implementation
}

// Good: Domain-specific aggregation
async getOccupancyReport(ownerId: string) {
  // Implementation
}

// Avoid: Generic CRUD operations (use inherited methods)
```

### 5. Testing Patterns
```typescript
describe('PropertiesService', () => {
  let service: PropertiesService
  let repository: MockType<PropertyRepository>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PropertiesService,
        { provide: PropertyRepository, useFactory: mockRepository },
        { provide: ErrorHandlerService, useFactory: mockErrorHandler }
      ]
    }).compile()

    service = module.get<PropertiesService>(PropertiesService)
    repository = module.get(PropertyRepository)
  })

  describe('inherited CRUD operations', () => {
    it('should get by owner', async () => {
      // Test inherited functionality
    })
  })

  describe('service-specific validation', () => {
    it('should validate property-specific rules', async () => {
      // Test validateCreate implementation
    })
  })
})
```

## Migration Guide

### Step 1: Identify Service-Specific Logic
1. Review existing service methods
2. Identify which methods are standard CRUD vs domain-specific
3. Extract validation logic and business rules

### Step 2: Implement Abstract Methods
1. `validateCreate`: Move creation validation logic
2. `validateUpdate`: Move update validation logic
3. `verifyOwnership`: Move ownership verification
4. `buildStatsQuery`: Move stats aggregation

### Step 3: Add Lifecycle Hooks (if needed)
1. `beforeCreate/beforeUpdate`: Data transformation
2. `afterCreate/afterUpdate`: Side effects

### Step 4: Preserve Service-Specific Methods
1. Keep domain-specific public methods
2. Move common utilities to private methods
3. Maintain existing API contracts

### Step 5: Update Tests
1. Test inherited functionality with base test utilities
2. Focus unit tests on service-specific logic
3. Update integration tests as needed

## Common Pitfalls

### 1. Over-abstraction
```typescript
// Avoid: Too generic
protected async validate(data: any): Promise<void>

// Prefer: Specific and typed
protected async validateCreate(data: CreatePropertyDto): Promise<void>
```

### 2. Breaking API Contracts
```typescript
// Wrong: Changing method signatures
async getProperties(query: any) // Changed from getByOwner

// Right: Maintaining compatibility
async getByOwner(ownerId: string, query?: PropertyQueryDto) // Same signature
```

### 3. Complex Inheritance Chains
```typescript
// Avoid: Multiple inheritance levels
class SpecializedPropertyService extends PropertyService extends BaseCrudService

// Prefer: Single inheritance with composition
class PropertyService extends BaseCrudService {
  constructor(
    repository: PropertyRepository,
    errorHandler: ErrorHandlerService,
    private readonly specializedLogic: SpecializedLogicService
  ) {}
}
```

## Reference Implementation

See the complete implementation examples in:
- `/apps/backend/src/properties/properties.service.ts` - Basic usage
- `/apps/backend/src/leases/leases.service.ts` - Lifecycle hooks
- `/apps/backend/src/maintenance/maintenance.service.ts` - Complex business logic
- `/apps/backend/src/documents/documents.service.ts` - File validation patterns

## Support

For questions or issues with the BaseCrudService pattern:
1. Check this guide and the reference implementations
2. Review the ADR-001 for architectural decisions
3. Consult the team in #backend-development Slack channel