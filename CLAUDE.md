# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TenantFlow is a comprehensive property management system for single-family residential properties. It enables property owners to manage properties, track tenants, handle leases, and provides tenants with read-only access to their lease information.

## General Rules

Fixes go directly to the main branch, nevertheless they need to be tested thoroughly.
New features are always developed in a branch and only merged to the main branch once they are fully done.
Software should work. We only put features into the main branch when they are complete. It’s better to not have a feature instead of having one that works poorly.
It is best to start working based on an issue - create one if there is none. You describe what you want to do, ask feedback on the direction you take it and take it from there.
When you are finished, use the merge request function on GitHub to create a pull request.
It is key to keep changes separate and small. The bigger and more hairy a PR grows, the harder it is to get it in. So split things up where you can in smaller changes - if you need a small improvement like a API addition for a big feature addition, get it in first rather than adding it to the big piece of work!

# Naming and casing

Use camelCase for
- functions
- methods
- properties
- variables

Use PascalCase for
- classes
- enums
- types
- interfaces

For readability only capitalize the first letter of abbreviations like callHttpApi() instead of callHTTPAPI().
Sub-components should be prefixed. E.g. splitting a component like FileListEntry into smaller components called FileListEntryName, FileListEntryIcon …
Components should not have single-word names, this could conflict with current or future native HTML tags as these are always single-word. E.g. if you have a settings view, do not call it Settings but SettingsView or UserSettings etc.

## Indentation
Use tabs instead of spaces for indenting - tab width is 4 spaces.
You can align e.g. comments using spaces if needed.

## Functions
No spaces between function name and parameters.
Braces on same line as the definition.
Use consistent new lines in parameters (either all on one line, or one parameter per line).
For top-level functions, prefer regular functions over arrow functions. In Javascript functions defined with the function keyword will be hoisted, thus can even be used in other functions above their definition. Also using the function keyword makes the definition more explicit for readability. For callbacks anonymous arrow functions are often better suited as they do not create their own this binding.
Always use parenthesis for arrow functions. This helps for readability and prevents issues if parameters are added.
When using implicit return values in arrow functions with multi-line body use parenthesis around the body.

## Operators
Always use === and !== instead of == and !=
Prefer explicit comparisons

## Control structures
Always use braces, also for one line ifs
Split long ifs into multiple lines
Always use break in switch statements and prevent a default block with warnings if it shouldn’t be accessed

# HTML
HTML should be HTML5 compliant
Avoid more than one tag per line
Always indent blocks
Try to avoid IDs instead prefer classes.

# CSS
Do not bind your CSS too much to your HTML structure.
Try to avoid using IDs and tags for query selectors, but use classes.
Try to make your CSS reusable by grouping common attributes into classes.
We recommend to use the BEM (Block-Element-Modifier) naming convention for CSS classes.
BEM helps with making CSS reusable and better maintainable, especially when using pre-processors like SASS.

The main navigation menu represents the main navigation of your app.
It needs to be:
  Organised
  Simple
  Responsive

You can not change the default padding of the navigation elements.
We encourage you to add icons on every top-level item of your navigation for accessibility.
Do not override the default structure and/or CSS. Everything has been carefully tuned.
Utils: menu, counter & buttons
Each entry is allowed to have a counter and/or a button for user interaction.
The app-navigation-entry-utils snippet need to be placed right next to the main link of your entry.
Maximum two items are allowed into the utils section. You can have:
Two buttons
One button and one button
You can’t have more than two buttons, if you need more, you need to add a menu.
The order of the button and the counter are not interchangeable. You need to put the counter before the menu.
If you need to add a few interactions for your entry, you can put everything in a popover menu. 
The same way we display the menu three-dot-icon button, you’re allowed to use up to 2 buttons in a single entry.
The icon class goes directly on the button element.
If no class is set, the three-dot-icon will be used by default

# Drag and drop
The class which should be applied to a first level element li that hosts or can host a second level is drag-and-drop. This will cause the hovered entry to slide down giving a visual hint that it can accept the dragged element. In case of jQuery UI’s droppable feature, the hoverClass option should be set to the drag-and-drop class.

## Collapsible Entry
Collapsible entry
By default, all sub-entries are shown. This behavior can be changed by creating a collapsible menu. This way, the menu will be hidden and an arrow will be added in in front of it (replacing the icon if any).
The opening of the menu is activated and animated by the class open on the main li.
You can not have a collapsible menu on a sub-item, this can only exist on a top-level element.
You can set the open class by default if you want.
Do not use the collapsible menu if your element does not have sub-items.
You still need to use JS to handle the click event.

## User Interface

Software should get out of the way. Do things automatically instead of offering configuration options.
Software should be easy to use. Show only the most important elements. Secondary elements only on hover or via Advanced function.
User data is sacred. Provide undo instead of asking for confirmation - which might be dismissed
The state of the application should be clear. If something loads, provide feedback.
Do not adapt broken concepts (for example design of desktop apps) just for the sake of consistency. We aim to provide a better interface, so let’s find out how to do that!
Regularly reset your installation to see how the first-run experience is like. And improve it.
Ideally do usability testing to know how people use the software.
For further UX principles, read Alex Faaborg from Mozilla.

## Coding Standards

Maximum line-length of 80 characters
Use tabs to indent
A tab is 4 spaces wide
Opening braces of blocks are on the same line as the definition
Quotes: ‘ for everything, “ for HTML attributes (<p class=”my_class”>)
End of Lines : Unix style (LF / ‘n’) only
No global variables or functions
Code should be tested, ideally with unit and integration tests.
When you git pull, always git pull --rebase to avoid generating extra commits like: merged main into main

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

# File Operations (bat + eza)
bat filename.tsx                            # View files with syntax highlighting (better than cat)  
bat -n filename.tsx                         # Show line numbers
eza -la --git                               # List files with Git status (modern ls)
eza -T                                      # Tree view of directory

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