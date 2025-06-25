# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TenantFlow is a comprehensive property management system for single-family residential properties. It enables property owners to manage properties, track tenants, handle leases, and provides tenants with read-only access to their lease information.

## Quick Start

```bash
# Install dependencies and generate types
npm install

# Start development server (port 5173)
npm run dev

# Build for production
npm run build

# Run tests
npm run test:all
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **UI**: shadcn/ui (40+ components) + Tailwind CSS v4
- **State**: Zustand
- **Data**: TanStack Query + Supabase (PostgreSQL)
- **Forms**: React Hook Form + Zod validation
- **Email**: React Email + Resend (via Edge Functions)
- **Payments**: Stripe (via Edge Functions)
- **Testing**: Playwright (E2E) + Vitest (Unit)

## Architecture Overview

### Security Model: Owner-Based RLS
- Users can only access data they directly own
- Properties owned via `ownerId` field
- Tenants accessible through property ownership chain
- All queries automatically filtered by RLS policies
- No server-side API layer needed

### Data Flow
```
React Components
    ├── Custom Hooks (useQuery/useMutation)
    ├── Direct Supabase Client Calls
    └── Zustand Global State
         ↓
Supabase Backend
    ├── PostgreSQL with RLS
    ├── Auth (JWT)
    ├── Storage (Files)
    └── Edge Functions
         ↓
External Services
    ├── Resend (Email)
    └── Stripe (Payments)
```

## Development Commands

### Core Development
```bash
npm run dev              # Start dev server
npm run build           # Production build
npm run preview         # Preview production build
npm run typecheck       # TypeScript check
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
```

### Database & Types
```bash
npm run db:types        # Generate TypeScript types from database
npm run db:watch        # Watch and auto-generate types
npm run dev:full        # Dev server + type watcher
npm run db:migrate      # Apply migrations
```

### Testing
```bash
npm run test            # Run E2E tests
npm run test:unit       # Run unit tests
npm run test:all        # Run all tests
npm run test:ui         # Interactive test UI
```

### Deployment
```bash
npm run deploy:functions    # Deploy Edge Functions
npm run deploy:migration    # Push database migrations
npm run setup:stripe        # Configure Stripe
```

### Modern CLI Tools (Faster Alternatives)
```bash
# Search & Find (ripgrep + fd + fzf)
rg "pattern" --glob "*.ts" --glob "*.tsx"   # Search code using ripgrep (faster than grep)
rg "DialogContent" -A 2 -B 2                # Search with context lines
rg -l "useState" src/                       # List files containing pattern
fd "Modal.*tsx" src/                        # Find files by pattern (faster than find)
fd -e tsx -e ts                             # Find TypeScript files
fzf                                         # Interactive fuzzy finder
fzf --preview="bat {}"                      # Fuzzy find with syntax-highlighted preview

# File Operations (bat + eza + zoxide)
bat filename.tsx                            # View files with syntax highlighting (better than cat)
bat -n filename.tsx                         # Show line numbers
eza -la --git                               # List files with Git status (modern ls)
eza -T                                      # Tree view of directory
z tenantflow                                # Smart directory jumping with zoxide
z src                                       # Jump to frequently used directories

# Git Operations (delta + modern git tools)
git diff | delta                            # Enhanced Git diffs with syntax highlighting
git log --oneline | delta                   # Better git log output
git-ignore node                             # Generate .gitignore files
git-lfs track "*.pdf"                       # Track large files with Git LFS
git-secrets --scan                          # Scan for committed secrets

# GitHub CLI (gh)
gh repo view                                # View repository info
gh pr list                                  # List pull requests
gh pr create --title "Fix TypeScript errors" # Create PR
gh issue list                               # List issues
gh auth status                              # Check authentication status

# HTTP & API Testing (httpie)
http GET localhost:5173/api/health          # HTTPie for API testing (better than curl)
http POST localhost:3000/api/users name=John # POST requests with JSON
http --json POST localhost:3000/api/data @data.json # Send JSON file

# Command Correction (thefuck)
fuck                                        # Auto-correct last command
npm run biuld                               # (typo)
fuck                                        # Suggests: npm run build

# Text Processing & Analysis
tree-sitter parse filename.tsx              # Parse code with tree-sitter
fftw-wisdom                                 # FFT optimization (if using audio/signal processing)

# Neovim Integration
nvim filename.tsx                           # Modern Vim with LSP support
nvim +":Telescope find_files"               # Open with file finder

# Performance & Debugging
rg --stats "import.*react"                  # Search with performance stats
fd --exec bat {}                            # Execute command on found files
eza --long --header --git --time-style=long-iso # Detailed file listing
```

## Key Implementation Patterns

### Data Fetching (Custom Hooks + TanStack Query)
```typescript
export function useProperties() {
  const { user } = useAuthStore()
  
  return useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Property')
        .select(`
          *,
          units:Unit(*)
        `)
        .eq('ownerId', user.id)
      
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })
}
```

### Form Handling (React Hook Form + Zod)
```typescript
const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email(),
})

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: '', email: '' }
})
```

### Component Architecture

Following evidence-based patterns, components are decomposed into:
- **Main Component**: < 150 lines (orchestration only)
- **Data Hooks**: `useComponentData.ts` (queries, state)
- **Form Hooks**: `useComponentForm.ts` (validation, submission)
- **Action Hooks**: `useComponentActions.ts` (mutations, business logic)
- **Section Components**: Focused UI sections (< 150 lines each)

Example structure:
```
feature/
  ├── components/
  │   ├── FeatureModal.tsx (< 150 lines)
  │   └── sections/
  │       ├── BasicInfoSection.tsx
  │       └── AdvancedSection.tsx
  ├── hooks/
  │   ├── useFeatureData.ts
  │   ├── useFeatureForm.ts
  │   └── useFeatureActions.ts
  └── types/
      └── feature.ts
```

## File Organization

### No Barrel Files
- Import directly from source files
- Prevents circular dependencies
- Example: `import { Button } from '@/components/ui/button'`

### Type Organization
```
src/types/
  ├── auth.ts               # Auth types
  ├── database.ts           # Database models
  ├── relationships.ts      # Complex query types
  └── supabase-generated.ts # Auto-generated from DB
```

## Current Status

### ✅ Production Ready
- Database with owner-based RLS
- Google OAuth authentication
- Property/tenant/lease management
- Email invitation system
- Type-safe throughout
- Component architecture (77.5% size reduction achieved)

### 🚧 In Progress
- Property image uploads
- Maintenance requests

### ⚠️ Known Issues
- Hardcoded DB connection in `scripts/generate-types-psql.cjs`

## Environment Variables

```env
# Frontend (.env.local)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Edge Functions (Supabase Dashboard)
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_[PLAN]_[PERIOD]=  # Price IDs
```

## Common Tasks

### Adding a New Feature
1. Create components in `src/components/{feature}/`
2. Extract data logic to `src/hooks/use{Feature}Data.ts`
3. Define types in `src/types/{feature}.ts`
4. Add route in `src/App.tsx`
5. Update navigation in `src/lib/navigation-variants.ts`

### Debugging Auth Issues
1. Check browser console for Supabase errors
2. Verify User profile created in database
3. Check RLS policies in Supabase Dashboard
4. Use `/auth/test` for isolated testing

### Working with Database
1. Update schema in Supabase Dashboard
2. Run `npm run db:types` to regenerate types
3. Update RLS policies if needed
4. Test with Supabase client

## Architecture Guidelines

### Component Size Limits
- **Maximum**: 150 lines
- **Ideal**: 50-100 lines
- **If larger**: Decompose into sections

### Decomposition Triggers
- Multiple responsibilities
- Complex state (> 3-4 useState)
- Over 200 lines
- Hard to test
- Reusable logic

### Quality Checklist
- [ ] Components < 150 lines
- [ ] Data logic in custom hooks
- [ ] Types in `src/types/`
- [ ] Direct imports (no barrels)
- [ ] Zero TypeScript errors
- [ ] Proper error handling

## Testing Guidelines

### Type Safety
- Run `npm run typecheck` before commits
- Avoid `any` types
- Use types from `src/types/`

### E2E Tests (Playwright)
- Test critical user flows
- Run on multiple browsers
- Include mobile viewports

### Unit Tests (Vitest)
- Test hooks and utilities
- Mock Supabase client
- Focus on business logic

## Build Optimization

The production build uses manual chunking:
- **react-vendor**: React core
- **ui-vendor**: Radix UI components  
- **form-vendor**: Form libraries
- **data-vendor**: TanStack Query + Supabase
- **utility-vendor**: Utils and helpers

## Edge Functions

### Email Functions
- `send-invitation`: Tenant invitation emails

### Stripe Functions
- `create-subscription`: Create checkout session
- `stripe-webhook`: Handle webhook events
- `create-portal-session`: Customer portal
- `cancel-subscription`: Cancel subscription