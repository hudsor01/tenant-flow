# Finalized Implementation Prompts

This directory contains 12 ready-to-use prompts for implementing TenantFlow section by section. Each prompt combines the section-prompt.md template with section-specific instructions.

## How to Use

1. Copy the contents of a prompt file
2. Paste into your LLM coding assistant (Claude, GPT, etc.)
3. Provide any additional context files as requested
4. Follow the implementation checklist

## Implementation Order

Execute these prompts in order for best results:

| # | File | Description |
|---|------|-------------|
| 01 | `01-foundation-prompt.md` | Project setup, auth, database schema |
| 02 | `02-shell-prompt.md` | Navigation, layout, user menu |
| 03 | `03-dashboard-prompt.md` | Analytics and KPIs |
| 04 | `04-properties-and-units-prompt.md` | Property/unit CRUD |
| 05 | `05-tenants-prompt.md` | Tenant onboarding |
| 06 | `06-leases-prompt.md` | Lease lifecycle |
| 07 | `07-payments-prompt.md` | Stripe rent collection |
| 08 | `08-financials-prompt.md` | Revenue analytics, payouts |
| 09 | `09-maintenance-prompt.md` | Request tracking |
| 10 | `10-tenant-portal-prompt.md` | Tenant self-service |
| 11 | `11-settings-prompt.md` | Account configuration |
| 12 | `12-profiles-prompt.md` | User profiles |

## Additional Context Files

For each section, you may also want to provide:

- **Data Model**: `../../../data-model/data-model.md`
- **Design System**: `../../../design-system/colors.json` and `typography.json`
- **Section Components**: `../../../sections/[section-name]/components/`
- **Section Types**: `../../../sections/[section-name]/types.ts`
- **Sample Data**: `../../../sections/[section-name]/data.json`

## Tech Stack Reference

All prompts assume this stack:
- **Frontend**: Next.js 15, React 19, TailwindCSS 4
- **Backend**: NestJS with Supabase
- **Database**: PostgreSQL via Supabase
- **Payments**: Stripe Connect
- **Auth**: Supabase Auth with SSR (getAll/setAll cookie pattern)
