# DRY Principle Guidelines

## Quick Reference

**Rule of 3**: Don't abstract until 3+ identical implementations exist
**Impact > Effort**: Prioritize high-impact, low-effort refactoring

## Pre-Commit Checklist

- [ ] Run `npm run lint:dry-check`
- [ ] Search for similar patterns: `grep -r "your_new_function" src/`
- [ ] Consider reusing existing utilities in `/lib/utils/`

## Common Utilities

### Date Formatting

```typescript
// ✅ DO: Use shared utility
import { formatLeaseDate } from '@/lib/utils/date-formatting'

// ❌ DON'T: Create inline date formatting
const formatDate = date => new Date(date).toLocaleDateString()
```

### Currency Formatting

```typescript
// ✅ DO: Use shared formatCurrency
import { formatCurrency } from '@repo/shared'

// ❌ DON'T: Implement locally
```

## When to Abstract

### ✅ Abstract When:

- 3+ identical implementations
- High maintenance burden
- Frequent bug fixes in duplicated code
- Clear single responsibility

### ❌ Don't Abstract When:

- Only 2 similar implementations
- Likely to diverge in requirements
- Simple, unlikely to change
- Context-specific variations needed

## Testing Requirements

All shared utilities must have:

- [ ] Unit tests with 90%+ coverage
- [ ] Integration tests with existing usage
- [ ] Backward compatibility validation
- [ ] Performance benchmarks
