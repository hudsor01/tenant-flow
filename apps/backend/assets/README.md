# Backend Assets

This directory contains static assets required by the backend services.

## PDF Templates

### Texas Residential Lease Agreement

**Implementation**: React PDF Components (`apps/backend/src/modules/pdf/templates/texas-lease-template.tsx`)

**Source**: Standard Texas residential lease form (public template) - text extracted and implemented as React components

**Usage**: Generate professional lease PDFs programmatically using `@react-pdf/renderer`

**Advantages**:
- Full control over layout and styling
- No dependency on external PDF files
- Easy to modify text and clauses
- Professional, clean output
- Fully integrated with form data

**Legal Notice**: This is a template lease agreement. Users should consult with a qualified attorney to ensure compliance with current Texas property laws and their specific situation.

**Access Controls**:
- Authentication required (JwtAuthGuard)
- Role-based access (OWNER and MANAGER roles only)
- Property ownership validation (PropertyOwnershipGuard)

**Implementation Files**:
- `texas-lease-template.tsx` - React PDF template component
- `react-lease-pdf.service.ts` - PDF generation service
- `lease-generation.controller.ts` - API endpoints
- `dto/lease-generation.dto.ts` - Input validation

## Notes

- These assets are included in the production deployment
- Template files should NOT be modified directly - use the dev scripts in `apps/backend/scripts/` to prepare templates
- For local development, ensure this directory exists after cloning the repository
- **SECURITY**: Store template source files outside of version control if they contain proprietary content
