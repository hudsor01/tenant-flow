# TenantFlow Cline Rules

This directory contains **active rules** that are automatically applied to all Cline conversations in this workspace.

## 📁 Active Rules (Auto-Applied)

1. **01-architecture.md** - Core architecture patterns and requirements
2. **02-coding-standards.md** - Code quality and development standards  
3. **03-security.md** - Security rules and multi-tenant requirements
4. **04-current-priorities.md** - Current development priorities and critical issues

## 🏦 Rules Bank (`../clinerules-bank/`)

Additional rules available but not currently active:

### Frameworks
- `react-19.md` - React 19 specific patterns and requirements
- `nestjs-11.md` - NestJS 11 backend development rules

### Contexts  
- `test-fixing.md` - Rules for systematic test fixing and debugging

### Project Types
- `saas-platform.md` - SaaS-specific development and security rules

### Workflows
- `test-fix-workflow.md` - Fix failing frontend tests
- `feature-development.md` - Develop new features following patterns
- `pr-review.md` - Review PRs with TenantFlow standards
- `supabase-migration.md` - Complete Prisma to Supabase migration

## 🔄 Activating Rules from Bank

To activate rules from the bank, copy them to this active directory:

```bash
# Activate React 19 specific rules
cp ../clinerules-bank/frameworks/react-19.md ./05-react-19.md

# Activate test fixing context
cp ../clinerules-bank/contexts/test-fixing.md ./06-test-fixing.md

# Activate workflow for current task
cp ../clinerules-bank/workflows/test-fix-workflow.md ./workflow-test-fix.md
```

## 🎯 Current Configuration

The active rules focus on:
- ✅ **Architecture**: Multi-tenant security and patterns
- ✅ **Code Quality**: TypeScript, testing, and validation standards  
- ✅ **Security**: RLS policies and data protection
- ✅ **Priorities**: Current critical issues (10 failing tests, Supabase migration)

## 💡 Usage Tips

- **Contextual Activation**: Only activate rules relevant to current work
- **Numbered Prefixes**: Use numbers to control rule precedence
- **Temporary Rules**: Add workflow rules temporarily, remove when complete
- **Team Coordination**: Use bank for sharing rules across team members

## 🚀 Quick Commands

```bash
# View active rules
ls -la .clinerules/

# Activate for test fixing context
cp ../clinerules-bank/contexts/test-fixing.md ./05-test-fixing.md
cp ../clinerules-bank/workflows/test-fix-workflow.md ./workflow-test-fix.md

# Activate for new feature development  
cp ../clinerules-bank/frameworks/react-19.md ./05-react-19.md
cp ../clinerules-bank/workflows/feature-development.md ./workflow-feature-dev.md

# Clean up after task completion
rm ./05-* ./workflow-*
```

---

*This modular approach keeps active rules focused while maintaining a comprehensive knowledge bank for different development contexts.*