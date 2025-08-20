# TenantFlow Rules Bank

This directory contains a comprehensive collection of Cline rules organized by category. Rules in this bank are **inactive** until copied to the `.clinerules/` directory.

## 📂 Directory Structure

```
clinerules-bank/
├── frameworks/          # Framework-specific rules
│   ├── react-19.md     # React 19 patterns and requirements
│   └── nestjs-11.md    # NestJS 11 backend development
├── contexts/            # Context-specific rule sets
│   └── test-fixing.md  # Test debugging and fixing
├── project-types/       # Project type standards  
│   └── saas-platform.md # SaaS development requirements
└── workflows/           # Actionable workflow sequences
    ├── test-fix-workflow.md
    ├── feature-development.md
    ├── pr-review.md
    ├── supabase-migration.md
    └── README.md
```

## 🎯 Framework Rules

### React 19 (`frameworks/react-19.md`)
- Turbopack requirement and setup
- Server component first patterns
- React 19 testing patterns with act()
- Migration patterns from React 18

### NestJS 11 (`frameworks/nestjs-11.md`)  
- BaseCrudService extension patterns
- Fastify adapter configuration
- Dependency injection patterns
- Testing strategies for services

## 🔄 Context Rules

### Test Fixing (`contexts/test-fixing.md`)
- Systematic test debugging approach
- React 19 test migration patterns
- Common test fixes and mock updates
- Validation commands and procedures

## 🏗 Project Type Rules

### SaaS Platform (`project-types/saas-platform.md`)
- Multi-tenant architecture requirements
- SaaS-specific security considerations
- Scalability patterns for multi-tenant systems
- Compliance and legal requirements

## 🚀 Actionable Workflows

### Test Fix Workflow (`workflows/test-fix-workflow.md`)
**Usage**: `/test-fix-workflow.md`
- Systematically fix 10 failing frontend tests
- React 19 compatibility fixes
- Automated validation and commit

### Feature Development (`workflows/feature-development.md`)
**Usage**: `/feature-development.md`
- Build features following TenantFlow patterns
- Backend with BaseCrudService, frontend server-first
- Automated PR creation

### PR Review (`workflows/pr-review.md`)  
**Usage**: `/pr-review.md <PR-number>`
- Review PRs with TenantFlow standards
- Security, architecture, and quality checks
- Automated approval/rejection with feedback

### Supabase Migration (`workflows/supabase-migration.md`)
**Usage**: `/supabase-migration.md`
- Complete Prisma to Supabase migration
- RLS policy implementation
- Comprehensive validation

## 🎮 Quick Activation Commands

### For Test Fixing (Current Priority)
```bash
cd .clinerules/
cp ../clinerules-bank/contexts/test-fixing.md ./05-test-fixing.md
cp ../clinerules-bank/frameworks/react-19.md ./06-react-19.md
cp ../clinerules-bank/workflows/test-fix-workflow.md ./workflow-test-fix.md
```

### For Feature Development
```bash
cd .clinerules/
cp ../clinerules-bank/frameworks/react-19.md ./05-react-19.md
cp ../clinerules-bank/frameworks/nestjs-11.md ./06-nestjs-11.md
cp ../clinerules-bank/workflows/feature-development.md ./workflow-feature-dev.md
```

### For SaaS-Focused Development
```bash
cd .clinerules/
cp ../clinerules-bank/project-types/saas-platform.md ./05-saas-platform.md
cp ../clinerules-bank/frameworks/react-19.md ./06-react-19.md
cp ../clinerules-bank/frameworks/nestjs-11.md ./07-nestjs-11.md
```

### For PR Review Sessions
```bash
cd .clinerules/
cp ../clinerules-bank/workflows/pr-review.md ./workflow-pr-review.md
```

## 📋 Rule Activation Strategies

### Context-Based Activation
Activate rules based on your current development context:

- **Bug Fixing**: `test-fixing.md` + relevant framework rules
- **New Features**: Framework rules + `feature-development.md` workflow
- **Code Review**: `pr-review.md` workflow
- **Migration Work**: `supabase-migration.md` + framework rules

### Task-Based Activation
```bash
# Starting test fixes
cp ../clinerules-bank/contexts/test-fixing.md .clinerules/05-test-fixing.md

# Completing test fixes (cleanup)
rm .clinerules/05-test-fixing.md

# Starting new feature
cp ../clinerules-bank/workflows/feature-development.md .clinerules/workflow-feature.md
```

## 🔧 Maintenance

### Adding New Rules
1. Create focused rule file in appropriate category
2. Use descriptive naming convention
3. Follow existing rule structure and format
4. Test with real development scenarios

### Updating Existing Rules
1. Update rules based on team feedback
2. Keep rules current with framework versions
3. Maintain backward compatibility when possible
4. Document breaking changes

## 🎯 Best Practices

- **Keep Active Rules Minimal**: Only activate what's relevant to current work
- **Use Workflows for Complex Tasks**: Leverage workflow files for multi-step processes
- **Clean Up After Tasks**: Remove temporary rules when tasks complete
- **Share Rule Combinations**: Document effective rule combinations for team

---

*This bank system provides flexibility to adapt Cline's behavior to any development context while maintaining a clean, focused active rule set.*