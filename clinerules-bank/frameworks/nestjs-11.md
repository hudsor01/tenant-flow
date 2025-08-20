# NestJS 11 Specific Rules

## Service Architecture
- **BaseCrudService Extension**: All entity services extend BaseCrudService<T>
- **Repository Injection**: Inject repositories, not direct database clients
- **Fastify Adapter**: Use FastifyAdapter for better performance
- **Module Organization**: Each feature gets its own module

## Decorator Usage
- **Guards**: Use @UseGuards(JwtAuthGuard) on all protected endpoints
- **Validation**: Use @Body() with Zod-validated DTOs
- **Current User**: Use @CurrentUser() decorator for authenticated user
- **Roles**: Use @Roles() decorator for role-based access control

## Error Handling
- **Typed Exceptions**: Use specific NestJS exceptions (BadRequestException, etc.)
- **Global Filters**: Implement global exception filters for consistent responses
- **Logging**: Use structured logging with Winston or similar
- **Validation Pipes**: Global validation pipe for request validation

## Database Integration
- **Supabase Client**: Inject SupabaseService, never instantiate directly
- **Transaction Handling**: Use Supabase transactions for multi-operation consistency
- **Connection Pooling**: Let Supabase handle connection management
- **Type Safety**: Use generated types from Supabase schema

## Testing Patterns
```typescript
// Service Testing
describe('PropertyService', () => {
  let service: PropertyService
  let repository: PropertyRepository

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PropertyService,
        {
          provide: PropertyRepository,
          useValue: createMockRepository(),
        },
      ],
    }).compile()

    service = module.get<PropertyService>(PropertyService)
    repository = module.get<PropertyRepository>(PropertyRepository)
  })
})
```

## Module Structure
```typescript
@Module({
  imports: [SupabaseModule],
  controllers: [PropertyController],
  providers: [PropertyService, PropertyRepository],
  exports: [PropertyService],
})
export class PropertyModule {}
```

## Performance Considerations
- **Fastify**: Use Fastify adapter for better performance than Express
- **Caching**: Implement caching for frequently accessed data
- **Async Operations**: Use async/await consistently
- **Memory Management**: Proper cleanup in onModuleDestroy hooks