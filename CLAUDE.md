# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TenantFlow is a comprehensive property management system for single-family residential properties. It features a modern full-stack architecture with separate frontend and backend applications, enabling property owners to manage properties, track tenants, handle leases, and provides tenants with read-only access to their lease information.

## ⚠️ MAJOR ARCHITECTURE UPDATE (2025)

The project has undergone a significant architectural transformation from a Supabase-based architecture to a full-stack monorepo with separate frontend and backend applications:

### Previous Architecture (Deprecated)
- Direct Supabase client connections from React
- Supabase RLS for security
- Supabase Edge Functions for server-side logic
- Single React SPA with client-side routing

### New Architecture (Current)
- **Monorepo Structure**: Workspace-based with separate frontend and backend packages
- **Frontend**: React 19 + TypeScript + TanStack Router (file-based routing)
- **Backend**: NestJS API with Prisma ORM
- **Database**: Still PostgreSQL (via Supabase) but accessed through Prisma
- **API Communication**: RESTful API with JWT authentication
- **Deployment**: Vercel (frontend + serverless backend functions)

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
# Install all dependencies (frontend + backend)
npm install

# Start both frontend and backend in development
npm run dev

# Start only frontend (port 5173)
npm run dev:frontend

# Start only backend (port 3000)  
npm run dev:backend

# Build for production
npm run build

# Run all tests
npm run test:all
```

## Tech Stack

### Frontend (`/frontend`)
- **Framework**: React 19 + TypeScript + Vite
- **Routing**: TanStack Router (file-based routing)
- **UI**: shadcn/ui (40+ components) + Tailwind CSS v4
- **State**: Context API + TanStack Query cache
- **Data Fetching**: TanStack Query + Custom API clients
- **Forms**: React Hook Form + Zod validation
- **Analytics**: PostHog, Google Tag Manager, Facebook Pixel
- **Testing**: Playwright (E2E) + Vitest (Unit)

### Backend (`/backend`)
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL (via Supabase) with Prisma ORM
- **Authentication**: JWT + Passport.js (Google OAuth)
- **API**: RESTful with OpenAPI/Swagger documentation
- **File Storage**: Local filesystem (development) / Cloud storage (production)
- **Email**: Resend API
- **Payments**: Stripe API
- **Real-time**: WebSockets (Socket.io)

### Infrastructure
- **Deployment**: Vercel (Frontend + Serverless Functions)
- **Database Host**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage / Local
- **Email Service**: Resend
- **Payment Processing**: Stripe

## Architecture Overview

### Monorepo Structure
```
tenant-flow/
├── frontend/           # React SPA
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── lib/        # Utilities and API clients
│   │   ├── pages/      # Page components
│   │   ├── routes/     # TanStack Router routes
│   │   └── types/      # TypeScript types
│   └── dist/           # Production build
├── backend/            # NestJS API
│   ├── src/
│   │   ├── [modules]/  # Feature modules
│   │   ├── auth/       # Authentication
│   │   ├── stripe/     # Payment processing
│   │   └── types/      # TypeScript types
│   ├── prisma/         # Database schema & migrations
│   └── dist/           # Compiled JavaScript
├── api/                # Vercel serverless functions
│   └── v1/             # API version routing
├── scripts/            # Build and deployment scripts
└── public/             # Static assets
```

### Security Model: API-Based Authentication
- JWT-based authentication with refresh tokens
- Google OAuth integration
- API middleware for route protection
- Prisma-level data filtering based on authenticated user
- File upload restrictions and validation

### Data Flow
```
React Components
    ├── Custom Hooks (useQuery/useMutation)
    ├── API Client Services (@/lib/api/*)
    └── Context Providers (Auth, etc.)
         ↓ HTTP/WebSocket
NestJS Backend
    ├── Controllers (Route handlers)
    ├── Services (Business logic)
    ├── Guards (Auth/Permission checks)
    └── Prisma ORM
         ↓
PostgreSQL Database
    └── Supabase-hosted
         ↓
External Services
    ├── Resend (Email)
    ├── Stripe (Payments)
    └── Storage (Files)
```

## Development Commands

### Core Development
```bash
# Frontend development
npm run dev              # Start frontend dev server (port 5173)
npm run dev:full        # Frontend + type watching
npm run dev:clean       # Kill existing processes and restart

# Backend development
npm run backend:dev     # Start NestJS dev server (port 3000)
npm run backend:build   # Build NestJS for production
npm run backend:start   # Start NestJS production server

# Full-stack development
npm run dev             # Frontend only
npm run backend:dev    # Backend only (run in separate terminal)
```

### Build & Deployment
```bash
# Local builds
npm run build           # Build both frontend and backend
npm run build:frontend  # Build frontend only
npm run build:backend   # Build backend only

# Deployment
npm run deploy          # Deploy backend via script
npm run deploy:prod     # Deploy to Vercel production
npm run quick:deploy    # Quick deployment script
```

### Code Quality
```bash
# Type checking
npm run typecheck       # Check both frontend and backend
npm run typecheck:frontend
npm run typecheck:backend

# Linting
npm run lint            # Lint both frontend and backend
npm run lint:fix        # Fix linting issues
npm run lint:frontend
npm run lint:backend

# Formatting
npm run format          # Format all code
npm run format:check    # Check formatting
```

### Database & Types
```bash
# Database management
npm run db:types        # Generate TypeScript types from database
npm run db:watch        # Watch and auto-generate types
npm run db:migrate      # Apply Supabase migrations
npm run db:start        # Start local Supabase
npm run db:stop         # Stop local Supabase
npm run db:reset        # Reset local database

# Prisma (Backend)
cd backend
npm run generate        # Generate Prisma client
npm run prisma:studio   # Open Prisma Studio
```

### Testing
```bash
npm run test            # Run E2E tests
npm run test:headed     # Run E2E tests with browser
npm run test:ui         # Interactive test UI
npm run test:unit       # Run unit tests
npm run test:unit:watch # Watch mode for unit tests
npm run test:unit:ui    # Vitest UI
npm run test:all        # Run all tests
```

### SEO & Performance
```bash
npm run seo:generate    # Generate sitemap
npm run seo:verify      # Verify SEO files exist
npm run seo:verification # Generate verification files
npm run perf:analyze    # Analyze performance
npm run perf:memory     # Memory usage analysis
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

### Data Fetching (API Client + TanStack Query)
```typescript
// Frontend: Custom hook using API client
export function useProperties() {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      const response = await propertyClient.getProperties()
      return response.data
    },
    enabled: !!user?.id,
  })
}

// API Client (frontend/src/lib/api/property-client.ts)
export class PropertyClient extends BaseApiClient {
  async getProperties() {
    return this.get<Property[]>('/properties')
  }
  
  async getProperty(id: string) {
    return this.get<Property>(`/properties/${id}`)
  }
  
  async createProperty(data: CreatePropertyDto) {
    return this.post<Property>('/properties', data)
  }
}

// Backend: NestJS Controller
@Controller('properties')
@UseGuards(JwtAuthGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}
  
  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.propertiesService.findAllByOwner(user.id)
  }
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

### Frontend Type Organization
```
frontend/src/types/
  ├── api.ts                # API request/response types
  ├── auth.ts               # Auth types
  ├── entities.ts           # Domain entities
  ├── forms.ts              # Form validation schemas
  ├── relationships.ts      # Complex query types
  ├── route-params.ts       # Route parameter types
  └── supabase-generated.ts # Auto-generated from DB
```

### Backend Type Organization
```
backend/src/
  ├── [module]/dto/         # Data Transfer Objects per module
  ├── auth/auth.types.ts    # Auth-specific types
  └── types/                # Shared types
      ├── express.d.ts      # Express augmentations
      └── auth.ts           # Shared auth types
```

### API Versioning
- All API routes prefixed with `/api/v1`
- Vercel serverless functions in `/api/v1/`
- Backend controllers use versioning decorators when needed

## Current Status

### ✅ Production Ready
- Full-stack monorepo architecture
- NestJS backend with Prisma ORM
- JWT authentication with Google OAuth
- Property/tenant/lease management
- Email invitation system via Resend
- Stripe payment integration
- Real-time activity feed (WebSockets)
- SEO optimization with sitemap generation
- Facebook Pixel & Google Tag Manager integration
- Type-safe throughout with strict TypeScript config

### 🚧 In Progress
- File upload optimization
- Enhanced real-time features
- Performance monitoring

### ⚠️ Known Issues
- Hardcoded DB connection in `scripts/generate-types-psql.cjs`
- Some RLS policies may need migration to Prisma-level security

## Environment Variables

### Frontend (`frontend/.env.local`)
```env
# API Configuration
VITE_API_URL=http://localhost:3000/api/v1  # Backend API URL
VITE_FRONTEND_URL=http://localhost:5173    # Frontend URL

# Supabase (for storage/auth)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Analytics
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=
VITE_GTM_ID=                               # Google Tag Manager
VITE_FB_PIXEL_ID=                          # Facebook Pixel

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=
```

### Backend (`backend/.env`)
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# JWT
JWT_SECRET=
JWT_REFRESH_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

# External Services
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_[PLAN]_[PERIOD]=  # Price IDs

# Supabase (for storage)
SUPABASE_URL=
SUPABASE_SERVICE_KEY=    # Service key for backend

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

## Common Tasks

### Adding a New Feature

#### Frontend
1. Create route file in `frontend/src/routes/`
2. Create components in `frontend/src/components/{feature}/`
3. Create API client in `frontend/src/lib/api/{feature}-client.ts`
4. Extract data logic to `frontend/src/hooks/use{Feature}*.ts`
5. Define types in `frontend/src/types/{feature}.ts`
6. Update navigation in `frontend/src/lib/navigation-variants.ts`

#### Backend
1. Generate module: `cd backend && nest g module {feature}`
2. Generate controller: `nest g controller {feature}`
3. Generate service: `nest g service {feature}`
4. Create DTOs in `backend/src/{feature}/dto/`
5. Update Prisma schema if needed
6. Run `cd backend && npm run generate` to update Prisma client

### Debugging Auth Issues
1. Check browser Network tab for 401/403 errors
2. Verify JWT token in localStorage
3. Check backend logs for auth guard rejections
4. Verify user exists in database
5. Test with Postman/curl with Authorization header

### Working with Database
1. Update schema in `backend/prisma/schema.prisma`
2. Generate migration: `cd backend && npx prisma migrate dev`
3. Update Prisma client: `npm run generate`
4. Update DTOs and validation
5. Test with Prisma Studio: `npm run prisma:studio`

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
- Test API integration end-to-end

### Unit Tests (Vitest)
- Test hooks and utilities
- Mock API clients
- Test NestJS services with mocked dependencies
- Focus on business logic

### API Testing
- Use Postman or REST Client
- Test auth flow with JWT tokens
- Verify request validation
- Check error responses

## Build Optimization

The production build uses manual chunking:
- **react-vendor**: React core
- **ui-vendor**: Radix UI components  
- **form-vendor**: Form libraries
- **data-vendor**: TanStack Query + Supabase
- **utility-vendor**: Utils and helpers

## API Architecture

### Backend Modules (NestJS)

#### Core Modules
- **Auth**: JWT authentication, Google OAuth, guards
- **Users**: User management and profiles
- **Properties**: Property CRUD and relationships
- **Tenants**: Tenant management and invitations
- **Units**: Unit management within properties
- **Leases**: Lease agreements and management
- **Payments**: Payment tracking and analytics
- **Maintenance**: Maintenance request system
- **Notifications**: In-app notifications
- **Activity**: Activity feed and audit logs

#### Integration Modules
- **Stripe**: Payment processing and subscriptions
- **Storage**: File upload and management
- **Email**: Transactional emails via Resend

### API Endpoints
```
POST   /api/v1/auth/login
POST   /api/v1/auth/register
POST   /api/v1/auth/google
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

GET    /api/v1/properties
POST   /api/v1/properties
GET    /api/v1/properties/:id
PATCH  /api/v1/properties/:id
DELETE /api/v1/properties/:id

GET    /api/v1/tenants
POST   /api/v1/tenants
POST   /api/v1/tenants/invite
GET    /api/v1/tenants/:id
PATCH  /api/v1/tenants/:id

# ... and more for each module
```

### Vercel Serverless Functions
- `/api/v1/[...slug].js`: Catch-all route to NestJS backend
- `/api/v1/stripe/webhook.js`: Stripe webhook handler

## Migration Notes

### From Supabase Direct to API Architecture
The codebase has been migrated from direct Supabase client calls to a proper API architecture:

1. **Authentication**: Migrated from Supabase Auth to JWT-based auth with NestJS
2. **Data Access**: Replaced Supabase client queries with API endpoints
3. **Real-time**: Moved from Supabase subscriptions to Socket.io
4. **File Storage**: Still uses Supabase Storage but through backend API
5. **Security**: Shifted from RLS policies to API-level authorization

### Important File Relocations
- Components moved from `src/components/` to `frontend/src/components/`
- Hooks moved from `src/hooks/` to `frontend/src/hooks/`
- Types split between `frontend/src/types/` and `backend/src/types/`
- Supabase functions replaced with NestJS controllers in `backend/src/`

### Deployment Changes
- Now deploys as a monorepo to Vercel
- Backend runs as serverless functions via `/api/v1/[...slug].js`
- Frontend served as static files from `frontend/dist/`
- Environment variables split between frontend and backend

## Performance Optimizations

### Frontend
- Route-based code splitting with TanStack Router
- Prefetching on hover/focus intent
- Virtual scrolling for large lists
- Optimistic updates for better UX
- Background sync for offline support

### Backend
- Request caching with Redis (production)
- Database query optimization with Prisma
- File upload streaming
- WebSocket connection pooling
- Rate limiting on all endpoints

## Security Considerations

### API Security
- JWT tokens with short expiry (15 min)
- Refresh token rotation
- Rate limiting per IP and user
- Input validation with class-validator
- SQL injection prevention via Prisma
- XSS protection with helmet

### File Upload Security
- File type validation
- Size limits (10MB default)
- Virus scanning (production)
- Isolated storage paths per user

## Router Configuration (TanStack Router)

### File-Based Routing
The frontend uses TanStack Router with file-based routing:

```
frontend/src/routes/
├── __root.tsx              # Root layout
├── _authenticated.tsx      # Auth-required layout
├── _authenticated/
│   ├── dashboard.tsx       # /dashboard
│   ├── properties.tsx      # /properties
│   ├── properties.$propertyId.tsx  # /properties/:propertyId
│   ├── tenants.tsx         # /tenants
│   └── tenants.$tenantId.tsx      # /tenants/:tenantId
├── _tenant-portal.tsx      # Tenant portal layout
├── _tenant-portal/
│   └── tenant-dashboard.tsx # /tenant-dashboard
├── auth/
│   ├── login.tsx           # /auth/login
│   ├── signup.tsx          # /auth/signup
│   └── callback.tsx        # /auth/callback
└── index.tsx               # Landing page
```

### Route Protection
- `_authenticated` routes require JWT token
- `_tenant-portal` routes require tenant role
- Public routes don't require authentication

## Workspace Commands

The project uses npm workspaces with the following structure:
- Root package.json orchestrates both frontend and backend
- Frontend workspace: `./frontend`
- Backend workspace: `./backend`

Common workspace commands:
```bash
# Install dependencies for all workspaces
npm install

# Run command in specific workspace
npm run dev --workspace=frontend
npm run build --workspace=backend

# Run command in all workspaces
npm run workspace:build
npm run workspace:typecheck
```

## Migration from Supabase Architecture

### Key Changes
1. **Authentication**: Migrated from Supabase Auth to JWT-based auth with Passport.js
2. **Database Access**: Direct Supabase queries replaced with NestJS + Prisma ORM
3. **Real-time**: Supabase subscriptions replaced with Socket.io
4. **File Storage**: Transitioned to local/cloud storage with Multer
5. **API Layer**: Added NestJS backend with RESTful API

### API Client Migration Pattern
```typescript
// Old (Direct Supabase)
const { data } = await supabase.from('Property').select('*')

// New (API Client)
const { data } = await propertyClient.getProperties()
```

## TanStack Router Configuration

The frontend uses file-based routing:
```
frontend/src/routes/
├── __root.tsx          # Root layout with providers
├── _app.tsx           # Authenticated app layout
├── index.tsx          # Landing page
├── (app)/             # Protected routes
│   ├── dashboard.tsx
│   ├── properties/
│   └── tenants/
└── auth/              # Public auth routes
```

## API Standards

### Endpoints
- Base: `/api/v1`
- Auth: Bearer JWT tokens
- Docs: `/api/docs` (Swagger)

### Response Format
```json
{
  "data": {},
  "meta": {
    "page": 1,
    "total": 100
  }
}
```

### Error Format
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["Field required"]
}
```

## Performance & Security

### Frontend Optimizations
- Lazy loading with React.lazy
- Image optimization (WebP, AVIF)
- API response caching
- Bundle splitting by route

### Backend Security
- Rate limiting (100 req/min)
- JWT rotation (15min access, 7d refresh)
- Input sanitization
- File upload validation (10MB limit)

## Deployment Checklist

### Pre-deployment
1. Run `npm run build` successfully
2. All tests passing (`npm run test:all`)
3. Environment variables configured
4. Database migrations ready

### Vercel Setup
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

### Post-deployment
1. Verify API health check
2. Test authentication flow
3. Check Stripe webhooks
4. Monitor error logs

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.