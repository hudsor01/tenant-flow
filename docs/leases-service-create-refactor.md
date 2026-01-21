# LeasesService.create() Refactoring Plan

**Current Status:** 208 lines (should be <50 lines per method)
**Target:** 6 focused methods, each <50 lines
**Risk Level:** HIGH (critical business logic)
**Recommended Approach:** Incremental refactor with snapshot tests

---

## Current Structure Analysis

**File:** `apps/backend/src/modules/leases/leases.service.ts:228-435`

**Line Count Breakdown:**
- Lines 228-285: Input validation (57 lines)
- Lines 286-357: Date and business rule validation (71 lines)
- Lines 358-395: RLS-protected unit fetch (37 lines)
- Lines 396-413: RPC tenant/invitation validation (17 lines)
- Lines 414-432: Lease record insertion (18 lines)
- Lines 433-435: Error handling (3 lines)

**Total:** 208 lines

---

## Refactoring Strategy

### Phase 1: Extract Validation Methods (SAFE)

Create private validation methods that can be unit tested independently:

```typescript
/**
 * Validate required fields and business rules
 * @throws BadRequestException if validation fails
 */
private validateLeaseInputs(dto: CreateLeaseDto): void {
  // Extract lines 228-270
  if (!dto.unit_id) throw new BadRequestException('unit_id is required')
  if (!dto.primary_tenant_id) throw new BadRequestException('primary_tenant_id is required')
  if (!dto.start_date || !dto.end_date) throw new BadRequestException('Dates required')
  // ... rest of validation logic
}

/**
 * Validate and parse lease dates
 * @returns Validated start and end dates
 * @throws BadRequestException if dates invalid
 */
private validateAndParseDates(dto: CreateLeaseDto): { startDate: Date; endDate: Date } {
  // Extract lines 271-285 + date parsing logic
  const parseDateOnly = (value: string): Date | null => {
    // Date parsing logic
  }

  const startDate = parseDateOnly(dto.start_date)
  const endDate = parseDateOnly(dto.end_date)

  if (!startDate || !endDate) {
    throw new BadRequestException('Invalid date format')
  }
  if (endDate <= startDate) {
    throw new BadRequestException('End date must be after start date')
  }

  return { startDate, endDate }
}

/**
 * Validate financial fields (rent, deposit, payment day)
 * @throws BadRequestException if invalid
 */
private validateFinancials(dto: CreateLeaseDto): void {
  // Extract lines 286-300
  if (!dto.rent_amount || dto.rent_amount <= 0) {
    throw new BadRequestException('Rent amount must be positive')
  }

  const paymentDay = dto.payment_day ?? 1
  if (paymentDay < 1 || paymentDay > 31) {
    throw new BadRequestException('Payment day must be between 1 and 31')
  }
}

/**
 * Validate lead paint disclosure requirements
 * @throws BadRequestException if required disclosure not provided
 */
private validateLeadPaintDisclosure(dto: CreateLeaseDto): void {
  // Extract lines 340-350
  if (
    dto.property_built_before_1978 === true &&
    dto.lead_paint_disclosure_acknowledged !== true
  ) {
    throw new BadRequestException(
      'Lead paint disclosure acknowledgment required for pre-1978 properties'
    )
  }
}
```

### Phase 2: Extract Data Fetching (MEDIUM RISK)

```typescript
/**
 * Fetch unit data with property join (RLS-protected)
 * @returns Unit data or throws if not found/access denied
 */
private async fetchUnitWithProperty(
  client: SupabaseClient,
  unitId: string
): Promise<{ id: string; owner_user_id: string; property_id: string; property: { name: string } }> {
  // Extract lines 358-390
  const { data: unit, error: unitError } = await client
    .from('units')
    .select('id, owner_user_id, property_id, property:properties(name)')
    .eq('id', unitId)
    .maybeSingle()

  if (unitError) {
    this.logger.warn('Failed to fetch unit', { error: unitError.message, unitId })
  }

  if (!unit) {
    throw new BadRequestException('Unit not found or access denied')
  }

  return unit
}

/**
 * Validate tenant invitation using RPC (SECURITY DEFINER)
 * @throws BadRequestException if tenant not invited or invitation not accepted
 */
private async validateTenantInvitation(
  client: SupabaseClient,
  unitId: string,
  tenantId: string
): Promise<void> {
  // Extract lines 396-413
  const { error: inviteError } = await (client as any).rpc('assert_can_create_lease', {
    p_unit_id: unitId,
    p_primary_tenant_id: tenantId
  })

  if (inviteError) {
    throw new BadRequestException(inviteError.message)
  }
}
```

### Phase 3: Extract Data Preparation (SAFE)

```typescript
/**
 * Build lease insert data from DTO and unit info
 * @returns Lease insert payload
 */
private buildLeaseInsertData(
  dto: CreateLeaseDto,
  unit: { owner_user_id: string }
): Database['public']['Tables']['leases']['Insert'] {
  // Extract lines 414-432 (partial)
  const leaseStatus = (dto.lease_status as LeaseStatus | undefined) ?? 'draft'
  const paymentDay = dto.payment_day ?? 1

  const insertData: Database['public']['Tables']['leases']['Insert'] = {
    primary_tenant_id: dto.primary_tenant_id,
    unit_id: dto.unit_id,
    owner_user_id: unit.owner_user_id,
    start_date: dto.start_date!,
    end_date: dto.end_date!,
    rent_amount: dto.rent_amount!,
    security_deposit: dto.security_deposit ?? 0,
    lease_status: leaseStatus,
    payment_day: paymentDay,
    rent_currency: dto.rent_currency || 'USD',
    grace_period_days: dto.grace_period_days ?? null,
    late_fee_amount: dto.late_fee_amount ?? null,
    late_fee_days: dto.late_fee_days ?? null,
    auto_pay_enabled: dto.auto_pay_enabled ?? false
  }

  // Add optional lease detail fields
  this.addLeaseDetailFields(insertData, dto)

  return insertData
}

/**
 * Add optional lease detail fields to insert data
 * Mutates insertData object
 */
private addLeaseDetailFields(
  insertData: Database['public']['Tables']['leases']['Insert'],
  dto: CreateLeaseDto
): void {
  // Extract lines 371-408 from current implementation
  const dtoWithDetails = dto as CreateLeaseDto & {
    max_occupants?: number | null
    pets_allowed?: boolean
    // ... other optional fields
  }

  if (dtoWithDetails.max_occupants !== undefined) {
    insertData.max_occupants = dtoWithDetails.max_occupants
  }
  if (dtoWithDetails.pets_allowed !== undefined) {
    insertData.pets_allowed = dtoWithDetails.pets_allowed
  }
  // ... rest of optional fields
}
```

### Phase 4: Refactor Main Method (FINAL)

```typescript
/**
 * Create a new lease record
 * Orchestrates validation, data fetching, and insertion
 *
 * @param token - User JWT token for RLS
 * @param dto - Lease creation data
 * @returns Created lease record
 * @throws BadRequestException if validation fails or data access denied
 */
async create(token: string, dto: CreateLeaseDto): Promise<Lease> {
  try {
    // 1. Validate inputs (extracted methods)
    this.validateLeaseInputs(dto)
    this.validateAndParseDates(dto)
    this.validateFinancials(dto)
    this.validateLeadPaintDisclosure(dto)

    this.logger.log('Creating lease via RLS-protected query', { dto })

    // 2. Get user-scoped client
    const client = this.supabase.getUserClient(token)

    // 3. Fetch unit with RLS validation
    const unit = await this.fetchUnitWithProperty(client, dto.unit_id)

    // 4. Validate tenant invitation via RPC
    await this.validateTenantInvitation(client, dto.unit_id, dto.primary_tenant_id)

    // 5. Build insert data
    const insertData = this.buildLeaseInsertData(dto, unit)

    // 6. Insert lease record
    const { data, error } = await client
      .from('leases')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      this.logger.error('Failed to create lease in Supabase', {
        error: error.message,
        dto
      })
      throw new BadRequestException(error.message)
    }

    return data as Lease
  } catch (error) {
    this.logger.error('Leases service failed to create lease', {
      error: error instanceof Error ? error.message : String(error),
      dto
    })
    throw new BadRequestException(
      error instanceof Error ? error.message : 'Failed to create lease'
    )
  }
}
```

---

## Testing Strategy

### 1. Snapshot Tests (Before Refactor)

Capture current behavior to ensure no regressions:

```typescript
describe('LeasesService.create() - Baseline', () => {
  it('should create lease with minimal required fields', async () => {
    const result = await service.create(ownerToken, minimalLeaseDto)
    expect(result).toMatchSnapshot()
  })

  it('should create lease with all optional fields', async () => {
    const result = await service.create(ownerToken, fullLeaseDto)
    expect(result).toMatchSnapshot()
  })

  it('should throw for invalid dates', async () => {
    await expect(
      service.create(ownerToken, invalidDatesDto)
    ).rejects.toThrow('End date must be after start date')
  })

  // ... 10+ more snapshot tests covering edge cases
})
```

### 2. Unit Tests (After Refactor)

Test each extracted method independently:

```typescript
describe('LeasesService - Validation Methods', () => {
  describe('validateLeaseInputs', () => {
    it('should throw if unit_id missing', () => {
      expect(() => service['validateLeaseInputs']({} as any))
        .toThrow('unit_id is required')
    })
  })

  describe('validateAndParseDates', () => {
    it('should parse valid ISO dates', () => {
      const result = service['validateAndParseDates']({
        start_date: '2025-01-01',
        end_date: '2025-12-31'
      } as any)
      expect(result.startDate).toBeInstanceOf(Date)
      expect(result.endDate).toBeInstanceOf(Date)
    })

    it('should throw for invalid date format', () => {
      expect(() => service['validateAndParseDates']({
        start_date: 'invalid',
        end_date: '2025-12-31'
      } as any)).toThrow('Invalid date format')
    })
  })

  // ... tests for each extracted method
})
```

### 3. Integration Tests (Verify No Regression)

Run existing integration tests to ensure behavior unchanged:

```bash
pnpm --filter @repo/backend test:integration \
  --testPathPattern=lease-creation.integration.spec.ts
```

---

## Implementation Checklist
// TODO:
**Preparation:**
- [ ] Create snapshot tests for current behavior
- [ ] Run full test suite to establish baseline
- [ ] Create feature branch: `refactor/leases-service-create`

**Phase 1: Validation Methods**
- [ ] Extract `validateLeaseInputs()`
- [ ] Extract `validateAndParseDates()`
- [ ] Extract `validateFinancials()`
- [ ] Extract `validateLeadPaintDisclosure()`
- [ ] Add unit tests for each method
- [ ] Run snapshot tests - MUST PASS

**Phase 2: Data Fetching**
- [ ] Extract `fetchUnitWithProperty()`
- [ ] Extract `validateTenantInvitation()`
- [ ] Add unit tests (with mocked Supabase client)
- [ ] Run snapshot tests - MUST PASS

**Phase 3: Data Preparation**
- [ ] Extract `buildLeaseInsertData()`
- [ ] Extract `addLeaseDetailFields()`
- [ ] Add unit tests
- [ ] Run snapshot tests - MUST PASS

**Phase 4: Main Method**
- [ ] Refactor `create()` to use extracted methods
- [ ] Run full test suite - MUST PASS
- [ ] Run integration tests - MUST PASS
- [ ] Code review
- [ ] Merge to main

**Validation:**
- [ ] Deploy to staging
- [ ] Smoke test lease creation in staging
- [ ] Monitor error rates for 24 hours
- [ ] Deploy to production

---

## Metrics

### Before Refactor
- **Lines of Code:** 208 lines (1 method)
- **Cyclomatic Complexity:** ~15
- **Test Coverage:** ~70% (from integration tests)
- **Maintainability Index:** Poor

### After Refactor (Target)
- **Lines of Code:** ~250 lines (7 methods, avg 36 lines each)
- **Cyclomatic Complexity:** ~3 per method
- **Test Coverage:** >90% (unit + integration)
- **Maintainability Index:** Good

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Regression in validation logic | HIGH | MEDIUM | Snapshot tests + integration tests |
| Breaking RLS security model | CRITICAL | LOW | Manual security audit + RLS tests |
| Performance degradation | MEDIUM | LOW | Benchmark before/after |
| Merge conflicts | LOW | MEDIUM | Small PRs, frequent syncs |

---

## Estimated Effort

| Phase | Hours | Dependencies |
|-------|-------|--------------|
| Phase 1: Validation | 2h | Snapshot tests ready |
| Phase 2: Data Fetching | 3h | Phase 1 complete |
| Phase 3: Data Prep | 2h | Phase 2 complete |
| Phase 4: Main Method | 1h | Phase 3 complete |
| **Total** | **8 hours** | Over 2 days |

---

## Reviewer Checklist

**Code Quality:**
- [ ] Each method has single responsibility
- [ ] Method names clearly describe intent
- [ ] No method exceeds 50 lines
- [ ] All validation centralized in dedicated methods
- [ ] Error messages user-friendly and specific

**Testing:**
- [ ] Snapshot tests cover all code paths
- [ ] Unit tests for each extracted method
- [ ] Integration tests still pass
- [ ] Edge cases covered (invalid dates, missing fields, RLS violations)

**Security:**
- [ ] RLS model unchanged
- [ ] JWT token handling consistent
- [ ] No service role client leakage
- [ ] Validation order prevents SQL injection

**Performance:**
- [ ] No additional database queries introduced
- [ ] Query patterns unchanged
- [ ] Validation short-circuits on early failure

---

## Follow-up Tasks

After refactor completion:
1. Update API documentation with clearer validation rules
2. Add OpenAPI schema examples for lease creation
3. Create developer guide: "How to extend lease creation"
4. Refactor `update()` method using same pattern
