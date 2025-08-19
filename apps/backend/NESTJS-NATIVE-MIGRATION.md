# NestJS Native Migration Guide

## Overview
This guide documents the migration from third-party libraries to NestJS native functionality.

## 1. Validation Migration: Zod → class-validator

### Before (Zod):
```typescript
import { z } from 'zod'

const PropertySchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string(),
  units: z.number().int().positive()
})
```

### After (class-validator):
```typescript
import { IsString, IsInt, Min, Max, Length, IsPositive } from 'class-validator'

export class CreatePropertyDto {
  @IsString()
  @Length(1, 100)
  name: string
  
  @IsString()
  address: string
  
  @IsInt()
  @IsPositive()
  units: number
}
```

## 2. Logger Migration: Winston → NestJS Logger

### Before (Winston):
```typescript
import * as winston from 'winston'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
})
```

### After (NestJS Logger):
```typescript
import { Logger } from '@nestjs/common'

export class MyService {
  private readonly logger = new Logger(MyService.name)
  
  doSomething() {
    this.logger.log('Info message')
    this.logger.error('Error message', stack)
    this.logger.warn('Warning message')
  }
}
```

## 3. Global Modules Reduction

### Before (12 @Global modules):
```typescript
@Global()
@Module({...})
export class SecurityModule {}  // ❌ Not needed as global

@Global()
@Module({...})
export class ErrorModule {}     // ❌ Not needed as global
```

### After (3 @Global modules only):
```typescript
// Only these should be @Global:
@Global()
@Module({...})
export class ConfigModule {}    // ✅ Config is needed everywhere

@Global()
@Module({...})
export class LoggerModule {}    // ✅ Logger is needed everywhere

@Global()
@Module({...})
export class DatabaseModule {}  // ✅ Database is needed everywhere
```

## 4. Validation Pipe Usage

### main.ts Update:
```typescript
// Before
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
  disableErrorMessages: isProduction
}))

// After - Using NestJS native
import { NativeValidationPipe } from './common/pipes/native-validation.pipe'
app.useGlobalPipes(new NativeValidationPipe())
```

## Migration Checklist

- [ ] Replace all Zod schemas with class-validator DTOs
- [ ] Replace Winston logger with NestJS Logger
- [ ] Remove @Global from non-essential modules
- [ ] Update main.ts to use NativeValidationPipe
- [ ] Remove Zod dependencies from package.json
- [ ] Remove Winston dependencies from package.json
- [ ] Update all imports in affected files
- [ ] Run tests to ensure functionality

## Benefits of Native Implementation

1. **Consistency**: Single validation approach across the application
2. **Performance**: Reduced bundle size, fewer dependencies
3. **Maintenance**: Easier to maintain with framework updates
4. **Documentation**: Better Swagger/OpenAPI integration
5. **Type Safety**: Better TypeScript integration with decorators

## Files to Update

### High Priority (Validation):
- All files in `src/**/dto/*.dto.ts`
- All files importing from 'zod'
- `src/common/validation/zod-*.ts` files

### Medium Priority (Logging):
- All files importing 'winston'
- `src/common/services/logger.service.ts`
- `src/config/logger.config.ts`

### Low Priority (Modules):
- Remove @Global from 9 unnecessary modules
- Keep only Config, Logger, and Database as @Global