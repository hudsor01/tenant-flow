# TenantFlow Test Data Management System

A comprehensive test data seeding and cleanup system designed for TenantFlow's extensive testing infrastructure. This system supports unit tests, integration tests, E2E tests, and Stripe testing with realistic, consistent data generation.

## 🚀 Quick Start

```bash
# Seed medium-sized test data for development
npm run test:seed

# Clean all test data
npm run test:cleanup

# Seed specific data types
npm run test:seed:users
npm run test:seed:stripe

# Different data volumes
npm run test:seed:small    # Fast, minimal data
npm run test:seed:medium   # Balanced for development
npm run test:seed:large    # Comprehensive testing
```

## 📁 System Architecture

```
scripts/test-data/
├── factories/                 # Data generation factories
│   ├── user.factory.ts       # User accounts & subscriptions
│   ├── property.factory.ts   # Properties & units
│   ├── tenant.factory.ts     # Tenant profiles & documents
│   ├── lease.factory.ts      # Leases & agreements
│   ├── maintenance.factory.ts # Maintenance requests
│   ├── stripe.factory.ts     # Stripe customers & payments
│   └── index.ts              # Factory manager
├── environments/             # Environment configurations
│   └── config.ts            # Environment-specific settings
├── utils/                   # Utility modules
│   ├── logger.ts           # Enhanced logging system
│   └── performance-monitor.ts # Performance tracking
├── seed-all.ts             # Master seeding script
├── seed-users.ts           # User-specific seeding
├── seed-stripe.ts          # Stripe-specific seeding
├── cleanup-all.ts          # Comprehensive cleanup
└── README.md               # This documentation
```

## 🏗️ Data Factories

### UserFactory
Creates realistic user accounts with different roles and subscription tiers:

```typescript
// Create landlords with subscriptions
const landlord = await factory.user.createLandlord({
  hasSubscription: true,
  subscriptionPlan: 'GROWTH',
  subscriptionStatus: 'ACTIVE'
})

// Create tenants with documents
const tenant = await factory.tenant.createTenant({
  createUserAccount: true,
  hasDocuments: true,
  emergencyContactInfo: true
})
```

### PropertyFactory
Generates properties with units, images, and realistic configurations:

```typescript
// Create property with units
const property = await factory.property.createProperty({
  ownerId: landlord.id,
  withUnits: 4,
  hasImages: true,
  propertyType: 'APARTMENT'
})
```

### LeaseFactory
Creates lease agreements with documents and payment history:

```typescript
// Create active lease with documents
const lease = await factory.lease.createLease({
  unitId: unit.id,
  tenantId: tenant.id,
  status: 'ACTIVE',
  withDocuments: true,
  withReminders: true
})
```

### MaintenanceFactory
Generates maintenance requests with realistic priority distribution:

```typescript
// Create maintenance request with files
const request = await factory.maintenance.createMaintenanceRequest({
  unitId: unit.id,
  priority: 'HIGH',
  withFiles: true,
  withExpenses: true
})
```

### StripeFactory
Creates Stripe test data with realistic payment scenarios:

```typescript
// Create subscription with invoices
const subscription = await factory.stripe.createStripeSubscription({
  userId: user.id,
  planType: 'STARTER',
  withInvoices: true,
  withWebhookEvents: true
})
```

## 🌍 Environment Configuration

The system supports multiple environments with different data volumes and behaviors:

### Development
- **Volume**: Medium (balanced for local development)
- **Features**: All enabled, verbose logging
- **Safety**: Confirmation required for cleanup

### Testing
- **Volume**: Small (fast test execution)
- **Features**: Essential only, minimal logging
- **Safety**: No confirmation required

### CI/CD
- **Volume**: Small (optimized for pipelines)
- **Features**: Limited, performance monitoring
- **Safety**: Automatic cleanup

### Performance
- **Volume**: Extra Large (load testing)
- **Features**: All enabled, detailed monitoring
- **Safety**: Backup creation, confirmation required

### E2E
- **Volume**: Medium (realistic scenarios)
- **Features**: Full feature set enabled
- **Safety**: Automatic cleanup after tests

## 🎯 Data Volumes

| Volume | Users | Properties | Units | Leases | Maintenance |
|--------|-------|------------|-------|--------|-------------|
| Small  | 15    | 6          | 12    | 8      | 4           |
| Medium | 35    | 15         | 60    | 48     | 30          |
| Large  | 100   | 100        | 600   | 480    | 360         |
| XL     | 400   | 400        | 2400  | 1920   | 1440        |

## 📜 Available Scripts

### Master Scripts
```bash
# Comprehensive seeding with all data types
npm run test:seed:all

# Environment-specific seeding
npm run test:seed:ci        # CI/CD optimized
npm run test:seed:e2e       # E2E test scenarios
npm run test:seed:performance # High-volume data

# Volume-specific seeding
npm run test:seed:small     # Minimal dataset
npm run test:seed:medium    # Balanced dataset
npm run test:seed:large     # Comprehensive dataset
```

### Selective Scripts
```bash
# Seed specific data types
npm run test:seed:users     # User accounts only
npm run test:seed:stripe    # Stripe data only

# Clean specific data types
npm run test:cleanup:users      # User-related data
npm run test:cleanup:properties # Property-related data
npm run test:cleanup:stripe     # Stripe-related data
```

### Utility Scripts
```bash
# Dry run (see what would be created)
npm run test:data:dry-run

# Complete cleanup with confirmation
npm run test:cleanup:all
```

## 🔧 Advanced Usage

### Custom Seeding
```typescript
import { TestDataFactoryManager } from './factories'

const factory = new TestDataFactoryManager()

// Create complete scenario
const scenario = await factory.createCompleteScenario({
  landlordCount: 5,
  propertiesPerLandlord: 3,
  unitsPerProperty: 4,
  activeLeasePercentage: 0.8
})

// Create landlord portfolio
const portfolio = await factory.createLandlordPortfolio({
  portfolioSize: 'large',
  subscriptionPlan: 'ENTERPRISE',
  includeMaintenanceHistory: true
})
```

### Environment-Specific Configuration
```typescript
import { config, getCurrentConfig } from './environments/config'

// Get current environment config
const envConfig = getCurrentConfig()

// Use specific environment
const testConfig = config.testing
```

### Performance Monitoring
```typescript
import { PerformanceMonitor } from './utils/performance-monitor'

const monitor = new PerformanceMonitor()

monitor.start('data_creation')
// ... perform operations
const metrics = monitor.end('data_creation')

console.log(monitor.formatSummary(monitor.generateSummary()))
```

## 🔍 Testing Scenarios

### Unit Testing
```bash
# Minimal data for fast unit tests
npm run test:seed -- --environment testing --volume small
```

### Integration Testing
```bash
# Realistic data with all relationships
npm run test:seed -- --environment testing --volume medium
```

### E2E Testing
```bash
# Complete user journeys
npm run test:seed:e2e
```

### Performance Testing
```bash
# High-volume data for load testing
npm run test:seed:performance
```

### Stripe Testing
```bash
# Payment scenarios and test cards
npm run test:seed:stripe

# Display available test cards
npx tsx scripts/test-data/seed-stripe.ts --test-cards
```

## 🛡️ Safety Features

### Environment Protection
- Prevents production database seeding
- Validates database URLs for test patterns
- Requires explicit confirmation for potentially dangerous operations

### Data Integrity
- Maintains foreign key relationships
- Respects dependency order during cleanup
- Provides rollback capabilities

### Performance Monitoring
- Tracks memory usage and execution time
- Identifies performance bottlenecks
- Provides optimization recommendations

## 🎨 Customization

### Adding New Factories
1. Create factory class in `factories/`
2. Implement data generation methods
3. Add to `TestDataFactoryManager`
4. Update cleanup order if needed

### Environment Configuration
1. Add new environment to `environments/config.ts`
2. Define volume, features, and limits
3. Update scripts as needed

### Custom Test Scenarios
```typescript
// Create specialized scenarios
await factory.maintenance.createEmergencyScenario(unitId)
await factory.stripe.createPaymentFailureScenario(userId)
await factory.lease.createExpiringLeases(5)
```

## 📊 Monitoring and Logging

### Performance Metrics
- Operation timing and throughput
- Memory usage tracking
- Database query performance
- Bottleneck identification

### Detailed Logging
- Structured logging with levels
- Progress tracking for long operations
- Error reporting and warnings
- Environment-specific verbosity

### Summary Reports
```
📋 Seeding Summary
─────────────────────────────────
Tables Processed: 15
Records Created: 1,247
Duration: 12,543ms
Memory Peak: 156.7 MB
Operations/Second: 99.3
```

## 🚨 Troubleshooting

### Common Issues

**Database Connection Errors**
- Verify `DATABASE_URL` is set correctly
- Check database is running and accessible
- Ensure test database exists

**Memory Issues**
- Use smaller data volumes for limited memory
- Enable performance monitoring to identify leaks
- Consider batch processing for large datasets

**Dependency Errors**
- Install faker.js: `npm install @faker-js/faker`
- Ensure Prisma client is generated
- Check TypeScript compilation

**Permission Errors**
- Verify database user has necessary permissions
- Check file system permissions for logs
- Ensure environment variables are accessible

### Debug Mode
```bash
# Enable verbose logging
npm run test:seed -- --verbose

# Dry run to see what would be created
npm run test:data:dry-run

# Monitor performance
npm run test:seed -- --environment development --verbose
```

## 🔗 Integration

### CI/CD Pipeline
```yaml
# Example GitHub Actions integration
- name: Setup Test Data
  run: npm run test:seed:ci

- name: Run Tests
  run: npm run test:all

- name: Cleanup Test Data
  run: npm run test:cleanup:ci
  if: always()
```

### Docker Integration
```dockerfile
# Add to Dockerfile for containerized testing
RUN npm run test:seed:ci
```

### Database Migrations
The system works alongside Prisma migrations and respects the current schema structure.

## 📈 Performance Recommendations

### For Fast Development
- Use `small` volume for rapid iteration
- Enable selective seeding for specific features
- Use dry-run mode to validate configurations

### For Comprehensive Testing
- Use `medium` or `large` volumes
- Enable all features and scenarios
- Monitor performance metrics for optimization

### For Production-Like Testing
- Use `xl` volume with performance environment
- Enable comprehensive monitoring
- Create data that matches production patterns

---

This test data management system provides a robust foundation for TenantFlow's testing infrastructure, ensuring consistent, realistic data across all testing scenarios while maintaining performance and safety.