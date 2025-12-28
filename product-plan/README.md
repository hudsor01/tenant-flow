# TenantFlow - Export Package

Complete design and implementation package for TenantFlow property management application.

## Quick Start

### Option 1: One-Shot Implementation
Copy `prompts/one-shot-prompt.md` to your coding agent along with `instructions/one-shot-instructions.md`.

### Option 2: Incremental Implementation
For each milestone, copy `prompts/section-prompt.md` and replace `[SECTION]` with the section name, then provide the corresponding instruction file from `instructions/incremental/`.

## Package Contents

```
product-plan/
├── README.md                    # This file
├── product-overview.md          # Product vision and features
├── product-roadmap.md           # Implementation milestones
├── prompts/
│   ├── one-shot-prompt.md       # Full implementation prompt
│   └── section-prompt.md        # Section-by-section prompt
├── instructions/
│   ├── one-shot-instructions.md # All milestones combined
│   └── incremental/             # Per-milestone instructions
├── design-system/
│   ├── colors.json              # Color tokens
│   └── typography.json          # Font configuration
├── data-model/
│   └── data-model.md            # Entity definitions
├── shell/
│   ├── spec.md                  # Shell specification
│   └── components/              # Shell React components
└── sections/
    └── [section-id]/
        ├── spec.md              # Section specification
        ├── types.ts             # TypeScript interfaces
        ├── data.json            # Sample data
        ├── tests.md             # Test specifications
        └── components/          # React components
```

## Sections

| Section | Description |
|---------|-------------|
| dashboard | Owner dashboard with metrics and quick actions |
| properties-and-units | Property and unit management |
| tenants | Tenant management and invitations |
| leases | Lease creation and management |
| payments | Rent collection and payment tracking |
| financials | Financial reports and statements |
| maintenance | Maintenance request tracking |
| tenant-portal | Tenant-facing portal |
| settings | Application settings |
| profiles | User profile management |
| analytics | Analytics dashboards |
| reports | Report generation |

## Tech Stack (Recommended)

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4.1
- **UI Components**: shadcn/ui
- **Backend**: NestJS or Next.js API routes
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Payments**: Stripe

## Implementation Notes

1. **Start with Foundation**: Set up Next.js, Supabase, and authentication first
2. **Build Shell**: Implement the application shell before sections
3. **Follow Order**: Build sections in the order listed in product-roadmap.md
4. **Use Components**: The provided components are production-ready, props-based React components
5. **Test as You Go**: Each section includes tests.md with test specifications
