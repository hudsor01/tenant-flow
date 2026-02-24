# Phase 46 Summary: Financial Reporting — Year-End + Tax Documents

**one_liner:** Added PDF export for year-end reports and tax documents, plus acquisition cost/date tracking on properties for accurate depreciation.

## What Was Built

### Database
- Added `acquisition_cost numeric(14,2)` and `acquisition_date date` columns to `properties` table
- Migration: `20260220150000_add_property_acquisition_columns.sql`

### Backend
- `YearEndReportService`: added `generateYearEndPdf()` and `generateTaxDocumentPdf()` methods using `PDFGeneratorService`
- `ReportsController`: added `GET /reports/year-end/pdf` and `GET /reports/tax-documents/pdf` endpoints returning `StreamableFile`
- `TaxDocumentsService`: updated `buildPropertyDepreciation()` to use actual acquisition cost when available
- `ReportsModule`: added `PDFModule` and `FinancialModule` to imports
- `financial-ledger.helpers.ts`: added `acquisition_cost` and `acquisition_date` to properties select query

### Shared
- `propertyFormSchema`: added `acquisition_cost` (optional number) and `acquisition_date` (optional date string)

### Frontend
- Property form: added "Acquisition Details" section with Purchase Price and Purchase Date fields
- `use-reports.ts`: added `useDownloadYearEndPdf()` and `useDownloadTaxDocumentPdf()` mutation hooks
- Year-end report page: added "Download PDF" button
- Tax documents page: added "Download PDF" button

## Tests
- All existing year-end report tests passing (18 tests)
- Added mocks for `PDFGeneratorService` and `TaxDocumentsService` in spec
- Frontend property tests updated with `acquisition_cost: null` and `acquisition_date: null`

## Commit
`4642972f7 feat(phase-46): financial reporting with PDF export and acquisition cost tracking`
