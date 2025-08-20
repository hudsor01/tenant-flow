# TenantFlow PR Review Workflow

You have access to the `gh` terminal command. I already authenticated it for you. Please review the PR that I asked you to review. You're already in the `tenant-flow` repo.

<detailed_sequence_of_steps>

# TenantFlow PR Review Process - Detailed Sequence of Steps

## 1. Gather PR Information

1. Get the PR title, description, and comments:
   ```bash
   gh pr view <PR-number> --json title,body,comments,author
   ```

2. Get the full diff of the PR:
   ```bash
   gh pr diff <PR-number>
   ```

3. Get PR status and checks:
   ```bash
   gh pr checks <PR-number>
   ```

## 2. Understand TenantFlow Context

1. Identify which files were modified and their significance:
   ```bash
   gh pr view <PR-number> --json files
   ```

2. For backend changes, examine the original files:
   ```xml
   <read_file>
   <path>apps/backend/src/[modified-file]</path>
   </read_file>
   ```

3. For frontend changes, check React 19 compatibility:
   ```xml
   <search_files>
   <path>apps/frontend/src</path>
   <regex>'use client'|useEffect|useState</regex>
   <file_pattern>*.tsx</file_pattern>
   </search_files>
   ```

4. For shared changes, verify type safety:
   ```xml
   <read_file>
   <path>packages/shared/src/types/[relevant-type].ts</path>
   </read_file>
   ```

## 3. TenantFlow-Specific Analysis

1. **Security Review** - Check for RLS compliance:
   ```xml
   <search_files>
   <path>apps/backend/src</path>
   <regex>org_id|auth\.jwt|RLS</regex>
   <file_pattern>*.ts</file_pattern>
   </search_files>
   ```

2. **Architecture Review** - Verify patterns are followed:
   ```xml
   <search_files>
   <path>apps</path>
   <regex>BaseCrudService|extends.*Service</regex>
   <file_pattern>*.ts</file_pattern>
   </search_files>
   ```

3. **Multi-tenant Review** - Ensure org_id filtering:
   ```xml
   <search_files>
   <path>apps/backend/src</path>
   <regex>\.from\(|\.select\(|\.insert\(</regex>
   <file_pattern>*.repository.ts,*.service.ts</file_pattern>
   </search_files>
   ```

4. **Type Safety Review** - Check shared type usage:
   ```xml
   <search_files>
   <path>apps</path>
   <regex>from '@repo/shared'</regex>
   <file_pattern>*.ts,*.tsx</file_pattern>
   </search_files>
   ```

## 4. Quality Checks

1. **React 19 Compatibility** (for frontend changes):
   - Server components used by default
   - Client components minimal and marked with 'use client'
   - Proper act() wrapping in tests
   - No deprecated React patterns

2. **Security Compliance**:
   - All database operations use RLS policies
   - No hardcoded secrets or API keys
   - Input validation with Zod schemas
   - Proper error handling without data leaks

3. **Performance Considerations**:
   - Lazy loading for large components
   - Image optimization with Next.js Image
   - Minimal client-side JavaScript
   - Efficient database queries

4. **Testing Coverage**:
   - Unit tests for services
   - E2E tests for critical flows
   - No skipped tests without reason
   - Proper test patterns for React 19

## 5. Ask for User Confirmation

1. Present comprehensive assessment:
   ```xml
   <ask_followup_question>
   <question>Based on my review of PR #<PR-number> from @<author>, here's my assessment:

   **Changes Summary:**
   [Brief description of what was changed]

   **Security Review:**
   - ✅/❌ RLS policies properly implemented
   - ✅/❌ No hardcoded secrets
   - ✅/❌ Input validation present

   **Architecture Review:**
   - ✅/❌ Follows BaseCrudService pattern
   - ✅/❌ Server components first approach
   - ✅/❌ Uses shared types correctly

   **Quality Review:**
   - ✅/❌ Tests included and passing
   - ✅/❌ React 19 compatibility
   - ✅/❌ TypeScript strict compliance

   **Recommendation:** [APPROVE/REQUEST CHANGES]

   **Reasoning:** [Detailed explanation of recommendation]

   Would you like me to proceed with this recommendation?</question>
   <options>["Yes, approve the PR", "Yes, request changes", "No, I'd like to discuss further", "Let me review manually first"]</options>
   </ask_followup_question>
   ```

## 6. Handle TenantFlow-Specific Feedback

1. If requesting changes, focus on TenantFlow priorities:
   - Multi-tenant security issues
   - React 19 compatibility problems
   - Architecture pattern violations
   - Missing test coverage for critical flows

2. If approving, highlight good practices:
   - Proper RLS implementation
   - Clean architecture patterns
   - Good test coverage
   - Performance considerations

## 7. Ask if User Wants Comment Drafted

1. After decision, offer to draft comment:
   ```xml
   <ask_followup_question>
   <question>Would you like me to draft a comment for this PR that follows TenantFlow's review style?</question>
   <options>["Yes, please draft a comment", "No, I'll handle the comment myself"]</options>
   </ask_followup_question>
   ```

## 8. Make Decision with TenantFlow Context

1. **Approve the PR** if it meets standards:
   ```bash
   cat << EOF | gh pr review <PR-number> --approve --body-file -
   Thanks @<author> for this PR! 

   I like how you've implemented [specific good practices]. The [feature/fix] looks solid and follows TenantFlow's architecture patterns well.

   Specifically appreciated:
   - ✅ Proper RLS implementation with org_id filtering
   - ✅ Server-first component approach  
   - ✅ Use of shared types from @repo/shared
   - ✅ Comprehensive test coverage

   Great work maintaining the multi-tenant security model!
   EOF
   ```

2. **Request changes** if improvements needed:
   ```bash
   cat << EOF | gh pr review <PR-number> --request-changes --body-file -
   Thanks @<author> for this PR!

   The implementation looks promising, but I've spotted a few things that need attention for TenantFlow's standards:

   **Security & Multi-tenancy:**
   - [Specific security issues if any]

   **Architecture:**
   - [Architecture pattern issues if any]

   **Testing:**
   - [Testing issues if any]

   Once these are addressed, this will be ready to merge. Let me know if you need any clarification on TenantFlow's patterns!
   EOF
   ```

3. **Comment without approval/rejection** for minor feedback:
   ```bash
   cat << EOF | gh pr review <PR-number> --comment --body-file -
   Thanks @<author> for this PR!

   Overall this looks good. Just a couple of minor suggestions:

   [Minor feedback points]

   Nice work following TenantFlow's architecture patterns!
   EOF
   ```

</detailed_sequence_of_steps>

<tenantflow_review_checklist>

# TenantFlow PR Review Checklist

## 🔒 Security & Multi-tenancy
- [ ] All database queries filtered by org_id through RLS
- [ ] No hardcoded API keys or secrets
- [ ] Input validation with Zod schemas
- [ ] Proper error handling without data leaks
- [ ] JWT token validation in controllers

## 🏗️ Architecture Compliance
- [ ] Services extend BaseCrudService pattern
- [ ] Controllers use proper guards (JwtAuthGuard)
- [ ] Repositories use Supabase client correctly
- [ ] Frontend uses server components first
- [ ] Minimal 'use client' components

## 📦 Type Safety & Shared Code
- [ ] Uses types from @repo/shared
- [ ] No TypeScript 'any' types
- [ ] Shared utilities properly imported
- [ ] Type definitions updated if schema changed

## ⚛️ React 19 Compatibility
- [ ] Server components by default
- [ ] Client components properly marked
- [ ] Test files use act() wrapping
- [ ] No deprecated React patterns

## 🧪 Testing Standards
- [ ] Unit tests for new services
- [ ] E2E tests for critical user flows
- [ ] No skipped tests without reason
- [ ] Test coverage meets 80% minimum

## 🚀 Performance & Best Practices
- [ ] Lazy loading for large components
- [ ] Next.js Image component for images
- [ ] Efficient database queries
- [ ] Proper error boundaries

## 📚 Documentation & Maintenance
- [ ] Code follows existing patterns
- [ ] Comments only for complex logic
- [ ] No unnecessary documentation files
- [ ] Commit messages follow conventions

</tenantflow_review_checklist>

<common_tenantflow_issues>

# Common TenantFlow Issues to Watch For

## Security Issues
```typescript
// ❌ Bad: Direct query without RLS
const properties = await supabase.from('properties').select('*')

// ✅ Good: RLS automatically filters by org_id
const properties = await this.propertyRepository.findAll()
```

## Architecture Issues
```typescript
// ❌ Bad: Direct Supabase in controller
@Get()
async getProperties() {
  return await this.supabase.from('properties').select('*')
}

// ✅ Good: Service layer with patterns
@Get()
async getProperties() {
  return await this.propertyService.findAll()
}
```

## React 19 Issues
```typescript
// ❌ Bad: Client component when server works
'use client'
export function PropertyList({ properties }) {
  return <div>{properties.map(...)}</div>
}

// ✅ Good: Server component first
export function PropertyList({ properties }) {
  return <div>{properties.map(...)}</div>
}
```

## Type Safety Issues
```typescript
// ❌ Bad: Local type definition
interface Property {
  id: string
  name: string
}

// ✅ Good: Shared type usage
import { Property } from '@repo/shared'
```

</common_tenantflow_issues>

<review_commands>

# TenantFlow Review Commands

```bash
# Get PR information
gh pr view <PR-number> --json title,body,comments,author,files

# Check PR diff
gh pr diff <PR-number>

# Check CI status
gh pr checks <PR-number>

# Approve with comment
gh pr review <PR-number> --approve --body "approval message"

# Request changes
gh pr review <PR-number> --request-changes --body "change request"

# Add comment without approval
gh pr review <PR-number> --comment --body "comment message"

# Check if tests are passing locally
cd apps/frontend && npm run test:unit
cd apps/backend && npm run test:unit

# Validate full build
npm run claude:check
```

</review_commands>