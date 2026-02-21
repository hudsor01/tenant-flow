# Phase 46: Financial Reporting — Year-End + Tax Documents

**Goal:** Add PDF generation for year-end reports and tax documents; add acquisition_cost/acquisition_date to properties table and use it in depreciation calculations.

**Architecture:** Reuse existing `PdfGeneratorService` (Puppeteer + @react-pdf/renderer). Add two new PDF endpoints to `reports.controller.ts`. Add migration for acquisition cost columns. Update depreciation to use actual cost basis.

**Tech Stack:** NestJS, @react-pdf/renderer, Supabase PostgreSQL, Next.js

---

### Task 1: Database migration — add acquisition_cost and acquisition_date to properties

**Files:**
- Create: `supabase/migrations/20260220100000_add_property_acquisition_columns.sql`

**Step 1: Create migration file**

```sql
-- Migration: Add acquisition_cost and acquisition_date to properties table
-- Purpose: Enable accurate depreciation calculations using actual property cost basis
-- Affected tables: properties
-- Special considerations: Nullable columns with no backfill needed

-- Add acquisition cost (purchase price of the property)
alter table public.properties
  add column if not exists acquisition_cost numeric(14, 2);

-- Add acquisition date (when the property was purchased)
alter table public.properties
  add column if not exists acquisition_date date;

-- Comment the columns for documentation
comment on column public.properties.acquisition_cost is
  'Purchase price of the property. Used for depreciation calculations (cost basis / 27.5 years residential).';

comment on column public.properties.acquisition_date is
  'Date the property was acquired. Used to calculate accumulated depreciation. Falls back to created_at if null.';
```

**Step 2: Push migration**
```bash
cd /Users/richard/Developer/tenant-flow && pnpm db:push
```

**Step 3: Regenerate Supabase types**
```bash
pnpm db:types
```

**Step 4: Verify types regenerated**
```bash
grep -n "acquisition_cost\|acquisition_date" packages/shared/src/types/supabase.ts
```

**Step 5: Commit**
```bash
git add supabase/migrations/20260220100000_add_property_acquisition_columns.sql packages/shared/src/types/supabase.ts packages/shared/src/validation/generated-schemas.ts
git commit -m "feat(phase-46): add acquisition_cost and acquisition_date to properties table"
```

---

### Task 2: Update TaxDocumentsService to use actual cost basis

**Files:**
- Modify: `apps/backend/src/modules/financial/tax-documents.service.ts`

**Step 1: Read the current service**

Read `apps/backend/src/modules/financial/tax-documents.service.ts` fully before editing.

**Step 2: Update the properties query to include acquisition columns**

Find the Supabase query that fetches properties and add the new columns:
```typescript
// Before: select only columns available
// After: include acquisition_cost, acquisition_date
const { data: propertiesData } = await supabase
  .from('properties')
  .select('id, name, created_at, acquisition_cost, acquisition_date')
  .eq('owner_user_id', user_id)
  .neq('status', 'inactive')
```

**Step 3: Update the depreciation calculation**

Find the depreciation calculation section. The current code uses:
```typescript
propertyValue: propertyValue  // Derived from NOI / 0.06 (cap rate estimate)
```

Replace with actual cost basis:
```typescript
// Use actual acquisition cost if available, otherwise fall back to NOI estimate
const propertyValue = property.acquisition_cost
  ? Number(property.acquisition_cost)
  : netOperatingIncome / 0.06  // Cap rate estimate fallback

// Use actual acquisition date if available, fall back to property created_at
const acquisitionYear = property.acquisition_date
  ? new Date(property.acquisition_date).getFullYear()
  : new Date(property.created_at || new Date()).getFullYear()
```

**Step 4: Run the existing tests to verify no regressions**
```bash
cd apps/backend && npx jest "tax-documents" --forceExit 2>&1 | tail -30
```

If no test file exists, create a basic test for the depreciation calculation:

**Create test file:** `apps/backend/src/modules/financial/__tests__/tax-documents.service.spec.ts`
```typescript
import { TaxDocumentsService } from '../tax-documents.service'

describe('TaxDocumentsService - depreciation calculation', () => {
  it('uses acquisition_cost when available', () => {
    // Test that acquisition_cost is used as the property value
    // This is a unit test for the calculation logic
  })

  it('falls back to NOI estimate when acquisition_cost is null', () => {
    // Test that NOI / 0.06 is used when no acquisition cost
  })
})
```

**Step 5: Commit**
```bash
git add apps/backend/src/modules/financial/
git commit -m "feat(phase-46): use actual acquisition_cost for depreciation calculations"
```

---

### Task 3: Add PDF generation endpoints to reports controller

**Files:**
- Modify: `apps/backend/src/modules/reports/reports.controller.ts`
- Modify: `apps/backend/src/modules/reports/reports.module.ts`
- Modify: `apps/backend/src/modules/reports/year-end-report.service.ts`

**Step 1: Read the current reports controller and module**

Read both files fully before editing.

**Step 2: Add PDF generation methods to YearEndReportService**

In `year-end-report.service.ts`, add a method that generates HTML for Puppeteer:

```typescript
async generateYearEndPdf(userId: string, year: number): Promise<Buffer> {
  const summary = await this.getYearEndSummary(userId, year)

  const html = this.buildYearEndHtml(summary)
  return this.pdfGeneratorService.generatePDF(html, {
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
  })
}

async generateTaxDocumentPdf(token: string, userId: string, taxYear: number): Promise<Buffer> {
  const taxData = await this.taxDocumentsService.generateTaxDocuments(token, userId, taxYear)

  const html = this.buildTaxDocumentHtml(taxData)
  return this.pdfGeneratorService.generatePDF(html, {
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
  })
}

private buildYearEndHtml(summary: YearEndSummary): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 14px; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f5f5f5; text-align: left; padding: 8px; font-size: 11px; }
    td { padding: 6px 8px; border-bottom: 1px solid #eee; }
    .amount { text-align: right; font-family: monospace; }
    .total { font-weight: bold; border-top: 2px solid #333; }
    .header { margin-bottom: 24px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .summary-card { border: 1px solid #ddd; padding: 12px; border-radius: 4px; }
    .summary-card h3 { margin: 0 0 4px; font-size: 11px; color: #666; }
    .summary-card p { margin: 0; font-size: 18px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Year-End Financial Summary ${summary.year}</h1>
    <p style="color:#666">Prepared by TenantFlow</p>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <h3>Gross Rental Income</h3>
      <p>$${summary.grossRentalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
    </div>
    <div class="summary-card">
      <h3>Operating Expenses</h3>
      <p>$${summary.operatingExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
    </div>
    <div class="summary-card">
      <h3>Net Income</h3>
      <p>$${summary.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
    </div>
  </div>

  <h2>Income by Property</h2>
  <table>
    <thead>
      <tr>
        <th>Property</th>
        <th class="amount">Income</th>
        <th class="amount">Expenses</th>
        <th class="amount">Net Income</th>
      </tr>
    </thead>
    <tbody>
      ${summary.byProperty.map(p => `
        <tr>
          <td>${p.propertyName}</td>
          <td class="amount">$${p.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td class="amount">$${p.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td class="amount">$${p.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('')}
      <tr class="total">
        <td>Total</td>
        <td class="amount">$${summary.grossRentalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td class="amount">$${summary.operatingExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td class="amount">$${summary.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
  </table>

  <h2>Expenses by Category</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${summary.expenseByCategory.map(e => `
        <tr>
          <td>${e.category}</td>
          <td class="amount">$${e.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`
}

private buildTaxDocumentHtml(taxData: TaxDocumentsData): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 14px; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f5f5f5; text-align: left; padding: 8px; font-size: 11px; }
    td { padding: 6px 8px; border-bottom: 1px solid #eee; }
    .amount { text-align: right; font-family: monospace; }
    .total { font-weight: bold; border-top: 2px solid #333; }
    .header { margin-bottom: 24px; }
    .disclaimer { font-size: 10px; color: #888; margin-top: 32px; border-top: 1px solid #ddd; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Tax Documents — ${taxData.taxYear}</h1>
    <p style="color:#666">Period: ${taxData.period.label} | Prepared by TenantFlow</p>
    <p style="color:#888;font-size:10px">This document is provided for informational purposes. Consult a tax professional before filing.</p>
  </div>

  <h2>Schedule E Summary</h2>
  <table>
    <tbody>
      <tr><td>Gross Rental Income</td><td class="amount">$${taxData.schedule.scheduleE.grossRentalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
      <tr><td>Total Expenses</td><td class="amount">($${taxData.schedule.scheduleE.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })})</td></tr>
      <tr><td>Depreciation</td><td class="amount">($${taxData.schedule.scheduleE.depreciation.toLocaleString('en-US', { minimumFractionDigits: 2 })})</td></tr>
      <tr class="total"><td>Net Income (Loss)</td><td class="amount">$${taxData.schedule.scheduleE.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
    </tbody>
  </table>

  <h2>Expense Categories</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th class="amount">Amount</th>
        <th class="amount">% of Total</th>
        <th>Deductible</th>
      </tr>
    </thead>
    <tbody>
      ${taxData.expenseCategories.map(cat => `
        <tr>
          <td>${cat.category}</td>
          <td class="amount">$${cat.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td class="amount">${cat.percentage.toFixed(1)}%</td>
          <td>${cat.deductible ? 'Yes' : 'No'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Property Depreciation (Schedule E)</h2>
  <table>
    <thead>
      <tr>
        <th>Property</th>
        <th class="amount">Cost Basis</th>
        <th class="amount">Annual Depreciation</th>
        <th class="amount">Accumulated</th>
        <th class="amount">Remaining Basis</th>
      </tr>
    </thead>
    <tbody>
      ${taxData.propertyDepreciation.map(p => `
        <tr>
          <td>${p.propertyName}</td>
          <td class="amount">$${p.propertyValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td class="amount">$${p.annualDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td class="amount">$${p.accumulatedDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td class="amount">$${p.remainingBasis.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="disclaimer">
    Generated by TenantFlow. This is not tax advice. Consult a Certified Public Accountant (CPA) before filing your tax return.
    Depreciation calculated at residential rate (27.5 years straight-line).
  </div>
</body>
</html>`
}
```

**Step 3: Inject dependencies in YearEndReportService**

Ensure `PdfGeneratorService` and `TaxDocumentsService` are injected via constructor.

**Step 4: Add PDF endpoints to reports controller**

In `reports.controller.ts`, add (BEFORE any dynamic :id routes):

```typescript
@Get('year-end/pdf')
@UseGuards(JwtAuthGuard)
async downloadYearEndPdf(
  @Request() req: AuthenticatedRequest,
  @Query('year', ParseIntPipe) year: number
) {
  const pdf = await this.yearEndReportService.generateYearEndPdf(req.user.id, year)

  // Return as file download
  return new StreamableFile(pdf, {
    type: 'application/pdf',
    disposition: `attachment; filename="year-end-${year}.pdf"`
  })
}

@Get('tax-documents/pdf')
@UseGuards(JwtAuthGuard)
async downloadTaxDocumentPdf(
  @Request() req: AuthenticatedRequest,
  @Query('year', ParseIntPipe) year: number
) {
  const token = req.headers.authorization?.split(' ')[1] ?? ''
  const pdf = await this.yearEndReportService.generateTaxDocumentPdf(token, req.user.id, year)

  return new StreamableFile(pdf, {
    type: 'application/pdf',
    disposition: `attachment; filename="tax-documents-${year}.pdf"`
  })
}
```

Import `StreamableFile` from `@nestjs/common`.

**Step 5: Update reports.module.ts to add PdfModule and FinancialModule imports**

```typescript
imports: [PdfModule, FinancialModule, /* existing imports */]
```

**Step 6: Verify backend typecheck**
```bash
cd apps/backend && npx tsc --noEmit 2>&1 | tail -30
```

**Step 7: Commit**
```bash
git add apps/backend/src/modules/reports/
git commit -m "feat(phase-46): add PDF generation endpoints for year-end and tax documents"
```

---

### Task 4: Add property acquisition fields to property form

**Files:**
- Modify: `apps/frontend/src/components/properties/property-form.client.tsx`
- Modify: `packages/shared/src/validation/properties.ts` (add new fields to schema)

**Step 1: Read current property form and validation schema**

Read both files fully before editing.

**Step 2: Update shared validation schema**

In `packages/shared/src/validation/properties.ts`, find the `propertyCreateSchema` or main property schema and add:

```typescript
acquisition_cost: z.number().positive('Acquisition cost must be positive').optional().nullable(),
acquisition_date: z.string().optional().nullable(), // ISO date string
```

**Step 3: Add "Acquisition Details" section to property form**

In `property-form.client.tsx`, add a new collapsible section (after the basic address fields):

```tsx
{/* Acquisition Details (optional section) */}
<div className="space-y-4">
  <h3 className="text-sm font-medium text-muted-foreground">Acquisition Details (optional)</h3>
  <p className="text-xs text-muted-foreground">Used for accurate depreciation calculations in your tax documents.</p>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label htmlFor="acquisition_cost">Purchase Price</Label>
      <Input
        id="acquisition_cost"
        type="number"
        step="0.01"
        min="0"
        placeholder="e.g. 250000"
        {...register('acquisition_cost', { valueAsNumber: true })}
      />
      {errors.acquisition_cost && (
        <p className="text-xs text-destructive">{errors.acquisition_cost.message}</p>
      )}
    </div>

    <div className="space-y-2">
      <Label htmlFor="acquisition_date">Purchase Date</Label>
      <Input
        id="acquisition_date"
        type="date"
        {...register('acquisition_date')}
      />
      {errors.acquisition_date && (
        <p className="text-xs text-destructive">{errors.acquisition_date.message}</p>
      )}
    </div>
  </div>
</div>
```

**Step 4: Verify TypeScript**
```bash
pnpm typecheck 2>&1 | tail -30
```

**Step 5: Commit**
```bash
git add apps/frontend/src/components/properties/ packages/shared/src/validation/
git commit -m "feat(phase-46): add acquisition_cost and acquisition_date to property form"
```

---

### Task 5: Add "Download PDF" buttons to frontend financial pages

**Files:**
- Modify: `apps/frontend/src/app/(owner)/financials/tax-documents/page.tsx`
- Modify: `apps/frontend/src/app/(owner)/reports/year-end/page.tsx`
- Modify: `apps/frontend/src/hooks/api/use-reports.ts`

**Step 1: Read the existing pages and hooks**

Read all three files before editing.

**Step 2: Add PDF download hooks to use-reports.ts**

In `use-reports.ts`, add two download functions:

```typescript
export function useDownloadYearEndPdf() {
  const [isDownloading, setIsDownloading] = useState(false)

  const download = async (year: number) => {
    setIsDownloading(true)
    try {
      const response = await apiRequest<Blob>(`/api/v1/reports/year-end/pdf?year=${year}`, {
        method: 'GET',
        headers: { Accept: 'application/pdf' }
      }, { rawResponse: true })

      // Create download link
      const blob = new Blob([response], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `year-end-${year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Year-end report downloaded')
    } catch {
      toast.error('Failed to download PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  return { download, isDownloading }
}

export function useDownloadTaxDocumentPdf() {
  const [isDownloading, setIsDownloading] = useState(false)

  const download = async (year: number) => {
    setIsDownloading(true)
    try {
      const response = await apiRequest<Blob>(`/api/v1/reports/tax-documents/pdf?year=${year}`, {
        method: 'GET',
        headers: { Accept: 'application/pdf' }
      }, { rawResponse: true })

      const blob = new Blob([response], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tax-documents-${year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Tax documents downloaded')
    } catch {
      toast.error('Failed to download PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  return { download, isDownloading }
}
```

Note: Check how `apiRequest` handles binary responses in this codebase. May need to use `fetch` directly with the auth token.

**Step 3: Add Download PDF button to tax-documents page**

In `tax-documents/page.tsx`, add a "Download PDF" button next to the year selector in the header area:

```tsx
const { download: downloadPdf, isDownloading } = useDownloadTaxDocumentPdf()

// In the header/actions area:
<Button
  variant="outline"
  size="sm"
  onClick={() => downloadPdf(taxYear)}
  disabled={isDownloading || isLoading}
>
  {isDownloading ? (
    <Loader2 className="size-4 animate-spin" />
  ) : (
    <Download className="size-4" />
  )}
  Download PDF
</Button>
```

**Step 4: Add Download PDF button to year-end page**

Same pattern in `reports/year-end/page.tsx`.

**Step 5: Verify TypeScript**
```bash
pnpm typecheck 2>&1 | tail -30
```

**Step 6: Commit**
```bash
git add apps/frontend/src/
git commit -m "feat(phase-46): add PDF download buttons to tax documents and year-end report pages"
```

---

### Verification

After all tasks complete:

1. Backend typechecks: `cd apps/backend && npx tsc --noEmit`
2. Frontend typechecks: `pnpm typecheck`
3. Run backend tests: `cd apps/backend && npx jest "tax-documents\|year-end" --forceExit`
4. Lint: `pnpm lint`

### Success Criteria

- [ ] `supabase/migrations/20260220100000_add_property_acquisition_columns.sql` exists with nullable acquisition_cost/date columns
- [ ] `packages/shared/src/types/supabase.ts` includes acquisition_cost and acquisition_date in properties type
- [ ] `TaxDocumentsService` uses actual acquisition_cost when available, falls back to NOI estimate
- [ ] `GET /api/v1/reports/year-end/pdf?year=2025` returns PDF buffer
- [ ] `GET /api/v1/reports/tax-documents/pdf?year=2025` returns PDF buffer
- [ ] Property form has "Acquisition Details" section with purchase price and date fields
- [ ] Tax documents page has "Download PDF" button
- [ ] Year-end report page has "Download PDF" button
- [ ] All TypeScript type checks pass
- [ ] `pnpm lint` passes with no new violations
