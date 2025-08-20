# TenantFlow Cline Workflows

These actionable workflows leverage Cline's built-in tools, command-line utilities, and TenantFlow-specific patterns to automate complex development tasks.

## 🚀 How to Use Workflows

Simply reference a workflow in chat:
```
/test-fix-workflow.md
```

Then provide any required parameters (like PR numbers, feature names, etc.) when prompted.

## 📋 Available Workflows

### 🔥 Critical Priority Workflows

#### 1. Test Fix Workflow
**File**: `test-fix-workflow.md`  
**Purpose**: Fix the 10 failing frontend test suites systematically  
**Usage**: `/test-fix-workflow.md`  
**Features**:
- Identifies failing tests with detailed analysis
- Uses React 19 compatibility patterns
- Fixes tests one by one with validation
- Runs `npm run claude:check` validation
- Creates comprehensive commit when complete

#### 2. Supabase Migration Workflow  
**File**: `supabase-migration.md`  
**Purpose**: Complete migration from Prisma to Supabase  
**Usage**: `/supabase-migration.md`  
**Features**:
- Analyzes remaining Prisma dependencies
- Migrates services to BaseCrudService pattern
- Implements RLS policies with org_id filtering
- Removes Prisma dependencies safely
- Validates migration with comprehensive tests

### 🛠 Development Workflows

#### 3. Feature Development Workflow
**File**: `feature-development.md`  
**Purpose**: Develop new features following TenantFlow patterns  
**Usage**: `/feature-development.md`  
**Features**:
- Follows TenantFlow architecture patterns
- Implements backend with BaseCrudService
- Creates server-first frontend components
- Updates shared types and validation
- Creates comprehensive PR when complete

#### 4. PR Review Workflow
**File**: `pr-review.md`  
**Purpose**: Review PRs with TenantFlow-specific standards  
**Usage**: `/pr-review.md <PR-number>`  
**Features**:
- Uses `gh` CLI to gather PR context
- Analyzes security, architecture, and quality
- Checks React 19 compatibility
- Validates RLS policies and multi-tenant security
- Provides detailed feedback with approval/rejection

## 🔧 Workflow Capabilities

### Built-in Cline Tools Used
- `ask_followup_question` - Interactive user guidance
- `read_file` - Context gathering from existing code
- `search_files` - Pattern analysis across codebase
- `new_task` - Breaking down complex operations

### Command-Line Tools Integrated
- `npm` - Package management and testing
- `git` - Version control operations
- `gh` - GitHub CLI for PR operations
- `curl` - API endpoint testing
- `supabase` - Database operations

### TenantFlow-Specific Features
- **Multi-tenant Security**: Validates RLS policies and org_id filtering
- **Architecture Compliance**: Ensures BaseCrudService patterns
- **React 19 Compatibility**: Checks server-component-first approach
- **Type Safety**: Validates @repo/shared usage

## 📈 Workflow Examples

### Fix Failing Tests
```
You: /test-fix-workflow.md
Cline: I'll fix the 10 failing frontend tests systematically...
[Analyzes failures, fixes React 19 issues, validates each fix]
Cline: All tests now pass! Would you like me to commit these fixes?
```

### Develop New Feature  
```
You: /feature-development.md
Cline: Let's develop a new feature! What would you like to build?
You: A tenant invitation system
Cline: [Creates backend service, frontend components, tests, PR]
```

### Review Pull Request
```
You: /pr-review.md 123
Cline: [Analyzes PR, checks TenantFlow standards, provides recommendation]
Cline: Based on my review, I recommend approving this PR because...
```

### Complete Supabase Migration
```
You: /supabase-migration.md  
Cline: [Analyzes Prisma usage, migrates to Supabase, validates RLS]
Cline: Migration complete! All services now use Supabase with RLS.
```

## 🎯 When to Use Each Workflow

### Use Test Fix Workflow When:
- Frontend tests are failing after updates
- React 19 compatibility issues arise
- Need systematic test debugging
- Pre-commit validation fails

### Use Feature Development When:
- Building new functionality
- Need to follow TenantFlow patterns
- Want automated PR creation
- Implementing multi-tenant features

### Use PR Review When:
- Reviewing team member contributions
- Need TenantFlow-specific validation
- Want automated security checks
- Ensuring architecture compliance

### Use Supabase Migration When:
- Removing Prisma dependencies
- Implementing RLS policies
- Modernizing database access patterns
- Improving multi-tenant security

## 🔒 Security & Best Practices

All workflows enforce TenantFlow's security standards:
- **RLS Compliance**: Every database operation filtered by org_id
- **Input Validation**: Zod schemas for all user inputs
- **Type Safety**: No `any` types, strict TypeScript
- **Architecture Patterns**: BaseCrudService and server-first components

## 🚦 Prerequisites

Before using workflows, ensure:
1. **Environment**: Node 22+, npm 10+
2. **Authentication**: GitHub CLI authenticated (`gh auth status`)
3. **Dependencies**: All packages installed (`npm install`)
4. **Database**: Supabase connection configured

## 🔄 Workflow Chaining

Workflows can be chained for complex operations:
```
1. /supabase-migration.md     # Complete Prisma migration
2. /test-fix-workflow.md      # Fix any broken tests
3. /feature-development.md    # Build new features
4. /pr-review.md <PR-number>  # Review and merge
```

## 📊 Success Metrics

Each workflow tracks success through:
- **Test Coverage**: Maintains 80%+ coverage
- **Type Safety**: Zero TypeScript errors
- **Security**: All RLS policies validated
- **Performance**: Build times optimized
- **Quality**: `npm run claude:check` passes

---

*These workflows embody TenantFlow's development philosophy: security-first, type-safe, multi-tenant architecture with modern React patterns.*