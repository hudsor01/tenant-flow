# Backend Assets

This directory contains static assets required by the backend services.

## PDF Templates

### Texas_Residential_Lease_Agreement.pdf

- **Purpose**: Template for Texas residential lease agreement generation
- **Source**: Texas Association of Realtors (TAR) - Standard Residential Lease Form
- **License**: Public template form - TAR forms may be used by licensed real estate professionals
- **Usage**: Used by `TexasLeasePDFService` to generate completed lease agreements
- **Last Updated**: November 2024

## Notes

- These assets are included in the production deployment
- Template files should NOT be modified directly - use the dev scripts in `apps/backend/scripts/` to prepare templates
- For local development, ensure this directory exists after cloning the repository
