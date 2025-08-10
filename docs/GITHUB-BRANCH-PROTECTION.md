# GitHub Branch Protection Configuration

This guide explains how to set up branch protection rules that enforce quality without blocking development.

## 🎯 Philosophy

- **Required checks**: Only essential validations that must pass
- **Optional checks**: Quality feedback that won't block merging
- **Smart targeting**: Only check what changed, not the entire codebase

## 🔒 Branch Protection Settings

### For `main` Branch

1. Go to Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Configure these settings:

#### ✅ Required Status Checks
Only require these checks to pass before merging:
- `lint-changed` - Lints only changed files
- `typecheck` - Type safety validation
- `build` - Build validation
- `pr-status` - Summary check

#### 📊 Optional Status Checks (Don't Block)
These provide feedback but shouldn't block:
- `sonarqube` - Code quality analysis
- `security` - Security vulnerability scan
- Any other quality checks

#### Protection Rules
```yaml
✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  
✅ Require conversation resolution before merging

✅ Dismiss stale pull request approvals when new commits are pushed

✅ Require linear history (optional but recommended)

❌ Include administrators (disable to allow hotfixes)
```

### For `develop` Branch (if used)
Same as main but potentially more relaxed:
- May skip "Require branches to be up to date"
- May allow force pushes for maintainers

## 🚀 How It Works

### 1. Smart Change Detection
The workflow first detects what changed:
```yaml
changed-files:
  - frontend: apps/frontend/**
  - backend: apps/backend/**
  - shared: packages/shared/**
```

### 2. Targeted Checks
Only runs checks on changed parts:
- Frontend changes → frontend typecheck + build
- Backend changes → backend typecheck + build
- No changes → skip that check entirely

### 3. Progressive Quality
- **Changed files**: Strict linting (no warnings)
- **Existing files**: Not checked unless modified
- **New code**: Must meet quality standards

## 🛠️ Local Development

### Pre-commit Hook (Optional)
Create `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Quick checks before commit
echo "Running pre-commit checks..."

# Only lint staged files
npx lint-staged

# Run typecheck (fast)
npm run typecheck || {
  echo "Type errors found. Fix them or use --no-verify to skip."
  exit 1
}
```

### Lint-staged Configuration
Add to `package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ]
  }
}
```

## 📋 PR Checklist

Before opening a PR:
1. Run `npm run claude:check` - Auto-fixes most issues
2. Run `npm run sonar:new-code` - Check quality locally
3. Commit with confidence!

## 🔄 Workflow Summary

### What Blocks PRs
Only these essential checks:
1. **Lint errors** in changed files
2. **Type errors** in affected packages
3. **Build failures** in affected packages

### What Doesn't Block PRs
These provide feedback only:
1. Code complexity warnings
2. Test coverage (unless you add coverage requirements)
3. Security warnings (unless critical)
4. Bundle size increases
5. Performance metrics

## 💡 Tips for Success

### Fast Feedback
- Checks run in parallel
- Only affected code is checked
- Results in 2-3 minutes typically

### Quality Improvement
- Fix SonarQube warnings when convenient
- Improve code when touching files
- Track metrics over time

### Emergency Overrides
If needed, admins can:
1. Temporarily disable protection
2. Force merge with admin override
3. Create hotfix branches

## 🚨 Troubleshooting

### "Required check never completes"
- Check if the job name matches exactly
- Ensure workflow file is in default branch
- Verify GitHub Actions is enabled

### "Too many checks required"
- Remove old check requirements
- Only require the 4 essential checks
- Make others optional

### "Checks take too long"
- Enable concurrency cancellation
- Use cache effectively
- Consider self-hosted runners

## 🎯 Next Steps

1. Apply these protection rules in GitHub
2. Communicate changes to team
3. Monitor PR velocity
4. Adjust based on feedback

Remember: The goal is sustainable quality, not perfection!