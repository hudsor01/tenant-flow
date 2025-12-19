# Lease PDF Templates

This document provides information about the state-specific lease PDF templates available in the system.

## Supported States

Currently, the system supports the following state templates:

| State Code | State Name | Template File | Status |
|-------------|-------------|---------------|--------|
| TX | Texas | `Texas_Residential_Lease_Agreement.pdf` | ✅ Available |

### Template File Naming Convention

Templates follow the naming pattern: `{StateName}_{TemplateType}_Lease_Agreement.pdf`

- **StateName**: Full state name (e.g., Texas, California, New_York)
- **TemplateType**: Uses TitleCase in filenames (e.g. `Residential`); currently only residential is supported
- **Location**: All templates are stored in `src/modules/pdf/templates/` (copied to `dist/` by `nest-cli.json`)

### Template Type Support

| Template Type | Status | Description |
|--------------|--------|-------------|
| residential | ✅ Supported | Standard residential lease agreements |
| commercial | ❌ Not Supported | Commercial lease agreements (future) |

### Adding New State Templates

To add a new state template:

1. **Create Template PDF**: Create a properly formatted lease agreement PDF for the target state
2. **Add State Mapping**: Update the `SUPPORTED_STATES` constant in `state-constants.ts`
3. **Update Documentation**: Add the new state to this README file
4. **Add Tests**: Include test cases for the new state template

### Template Requirements

All templates must:
- Be in PDF format
- Follow the field naming convention used by the PDF mapper service
- Include all standard lease agreement fields
- Be legally compliant for the target state

### Validation and Caching

The system includes:
- **State Code Validation**: Validates 2-letter US state codes with Zod schema
- **Case Insensitive**: Accepts uppercase, lowercase, and mixed case input
- **Template Caching**: Caches template metadata and content for performance
- **Fallback Behavior**: Falls back to Texas template for unsupported states
- **Error Handling**: Graceful degradation with informative error messages

### Usage Examples

```typescript
import { LeasePdfGeneratorService } from './lease-pdf-generator.service'

// Generate PDF for Texas (default)
const texasPdf = await pdfGenerator.generateFilledPdf(fields, leaseId)

// Generate PDF for California (unsupported - will fallback to Texas)
const californiaPdf = await pdfGenerator.generateFilledPdf(fields, leaseId, {
  state: 'CA',
  throwOnUnsupportedState: false // Will log warning and use Texas
})

// Generate PDF for New York (unsupported - will throw error)
try {
  const newYorkPdf = await pdfGenerator.generateFilledPdf(fields, leaseId, {
    state: 'NY',
    throwOnUnsupportedState: true // Will throw error
  })
} catch (error) {
  // Handle unsupported state error
}
```

## Architecture

The PDF generation system consists of several coordinated services:

- **LeasePdfGeneratorService**: Main service for PDF generation
- **StateValidationService**: Validates and normalizes state codes
- **TemplateCacheService**: Caches template metadata and content
- **LeasePdfMapperService**: Maps database data to PDF fields

This architecture ensures:
- **Performance**: Template caching reduces filesystem I/O
- **Reliability**: State validation prevents invalid template usage
- **Extensibility**: Easy to add new states and template types
- **Maintainability**: Clear separation of concerns

## Testing

Run the test suite to verify functionality:

```bash
pnpm -C apps/backend test -- pdf/lease-pdf-generator.service.spec.ts
```

The tests cover:
- State validation (all edge cases)
- Template caching (hit/miss scenarios)
- PDF generation (success/failure paths)
- Error handling (graceful degradation)
- Case sensitivity handling
