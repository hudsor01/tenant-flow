# Backend Assets

This directory contains static assets required by the backend services.

## PDF Templates

### Texas_Residential_Lease_Agreement.pdf

⚠️ **CRITICAL LEGAL NOTICE - READ BEFORE PRODUCTION USE**

- **Purpose**: Template for Texas residential lease agreement generation
- **Source**: Texas Association of Realtors (TAR) - Standard Residential Lease Form
- **Copyright**: © Texas Association of Realtors - All Rights Reserved
- **License**:
  - ✅ **AUTHORIZED USE**: Licensed real estate professionals with active TAR membership
  - ✅ **AUTHORIZED USE**: Property management companies with valid TAR form license
  - ❌ **PROHIBITED**: Unlicensed individuals, unauthorized commercial use, redistribution
- **Compliance Requirements**:
  1. **Verify Authorization**: Confirm your organization has written permission from TAR before production use
  2. **Maintain Records**: Keep proof of TAR form license/membership on file
  3. **Version Control**: Verify template matches current TAR-approved version (check TAR website quarterly)
  4. **Attribution**: Include proper TAR attribution on generated documents as required by license
- **Liability**: Unauthorized use of TAR forms may result in:
  - Copyright infringement claims
  - Professional license sanctions (for real estate professionals)
  - Contract enforceability issues
- **Usage**: Used by `TexasLeasePDFService` to generate completed lease agreements
- **Last Verified**: November 2024
- **Next Review Date**: February 2025

**PRODUCTION DEPLOYMENT CHECKLIST**:
- [ ] TAR form license verified and documented
- [ ] Legal team review completed
- [ ] Template version verified against current TAR standards
- [ ] Proper attribution included in generated PDFs
- [ ] Access controls configured (only authorized users can generate)

**ALTERNATIVE SOLUTIONS**:
If you do not have TAR authorization:
1. Obtain TAR membership/license at https://www.texasrealestate.com
2. Use jurisdiction-specific forms with proper licensing
3. Consult legal counsel for creating custom lease templates

## Notes

- These assets are included in the production deployment
- Template files should NOT be modified directly - use the dev scripts in `apps/backend/scripts/` to prepare templates
- For local development, ensure this directory exists after cloning the repository
- **SECURITY**: Store template source files outside of version control if they contain proprietary content
