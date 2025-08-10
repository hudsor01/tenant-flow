# Base CRUD Controller Usage Examples

## Basic Usage

```typescript
// 1. Create a service that implements CrudService interface
@Injectable()
export class PropertiesService implements CrudService<Property, CreatePropertyDto, UpdatePropertyDto, PropertyQueryDto> {
  // Implement required methods
  async create(ownerId: string, createDto: CreatePropertyDto): Promise<Property> { /* ... */ }
  async findByOwner(ownerId: string, query?: PropertyQueryDto): Promise<Property[]> { /* ... */ }
  async findById(ownerId: string, id: string): Promise<Property | null> { /* ... */ }
  async update(ownerId: string, id: string, updateDto: UpdatePropertyDto): Promise<Property> { /* ... */ }
  async delete(ownerId: string, id: string): Promise<void> { /* ... */ }
  
  // Optional stats method
  async getStats(ownerId: string): Promise<PropertyStats> { /* ... */ }
}

// 2. Create controller using Base CRUD Controller
@Controller('properties')
export class PropertiesController extends BaseCrudController<
  Property,
  CreatePropertyDto, 
  UpdatePropertyDto,
  PropertyQueryDto
>({
  entityName: 'Property',
  enableStats: true
}) {
  constructor(private readonly propertiesService: PropertiesService) {
    super(propertiesService)
  }
  
  // Add custom endpoints as needed
  @Get('nearby')
  async findNearby(
    @Query() location: LocationDto,
    @CurrentUser() user: ValidatedUser
  ) {
    return this.propertiesService.findNearby(user.id, location)
  }
}
```

## Enhanced Usage with Additional Features

```typescript
@Controller('properties')
export class PropertiesController extends EnhancedBaseCrudController<
  Property,
  CreatePropertyDto,
  UpdatePropertyDto,
  PropertyQueryDto
>({
  entityName: 'Property',
  enableStats: true,
  enableBulkOperations: true,
  enableArchive: true,
  additionalGuards: [UsageLimitsGuard],
  additionalInterceptors: [ResponseTransformInterceptor]
}) {
  constructor(private readonly propertiesService: PropertiesService) {
    super(propertiesService)
  }
}
```

## Migration from Existing Controller

### Before (Current Properties Controller)
```typescript
@Controller('properties')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ErrorHandlingInterceptor)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  async getProperties(@CurrentUser() user: ValidatedUser, @Query() query: PropertyQueryDto) {
    return await this.propertiesService.getByOwner(user.id, query)
  }

  @Get('stats')
  async getPropertyStats(@CurrentUser() user: ValidatedUser) {
    return await this.propertiesService.getStats(user.id)
  }

  @Get(':id')
  async getProperty(@Param('id') id: string, @CurrentUser() user: ValidatedUser) {
    return await this.propertiesService.getById(user.id, id)
  }

  @Post()
  async createProperty(@Body() createDto: CreatePropertyDto, @CurrentUser() user: ValidatedUser) {
    return await this.propertiesService.create(user.id, createDto)
  }

  @Put(':id')
  async updateProperty(
    @Param('id') id: string,
    @Body() updateDto: UpdatePropertyDto,
    @CurrentUser() user: ValidatedUser
  ) {
    return await this.propertiesService.update(user.id, id, updateDto)
  }

  @Delete(':id')
  async deleteProperty(@Param('id') id: string, @CurrentUser() user: ValidatedUser) {
    return await this.propertiesService.delete(user.id, id)
  }
}
```

### After (Using Base CRUD Controller)
```typescript
@Controller('properties')
export class PropertiesController extends BaseCrudController<
  Property,
  CreatePropertyDto,
  UpdatePropertyDto,
  PropertyQueryDto
>({
  entityName: 'Property',
  enableStats: true
}) {
  constructor(private readonly propertiesService: PropertiesService) {
    super(propertiesService)
  }
  
  // Custom endpoints can still be added
  @Get('export')
  async exportProperties(@CurrentUser() user: ValidatedUser) {
    return this.propertiesService.exportToCSV(user.id)
  }
}
```

## Benefits

1. **Reduced Boilerplate**: ~80% less controller code
2. **Consistent API**: All CRUD endpoints follow the same patterns
3. **Type Safety**: Full TypeScript support with generics
4. **Extensibility**: Easy to add custom endpoints
5. **Standardized Responses**: Consistent ApiResponse format
6. **Built-in Validation**: Configurable validation pipes
7. **Security**: JWT auth and owner-based filtering built-in
8. **Error Handling**: Consistent error responses

## Generated API Endpoints

The base controller automatically creates these endpoints:

- `GET /entities` - List all entities for user
- `GET /entities/stats` - Get statistics (if enabled)
- `GET /entities/:id` - Get single entity
- `POST /entities` - Create new entity
- `PUT /entities/:id` - Update entity
- `DELETE /entities/:id` - Delete entity

Enhanced controller adds:
- `POST /entities/bulk` - Bulk create (if enabled)
- `PUT /entities/:id/archive` - Archive entity (if enabled)
- `PUT /entities/:id/restore` - Restore entity (if enabled)