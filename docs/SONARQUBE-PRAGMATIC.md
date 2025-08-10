# Pragmatic SonarQube Setup for Clean Builds

This guide explains how to use SonarQube without being overwhelmed by thousands of issues on existing code.

## 🎯 Philosophy

1. **Focus on New Code** - Only enforce strict standards on new/modified code
2. **Gradual Improvement** - Fix critical issues first, improve over time
3. **Practical Thresholds** - Realistic limits that don't block development
4. **Meaningful Alerts** - Only flag real bugs, not style preferences

## 🚀 Quick Start

### For New Code Only
```bash
# Analyze only files changed in your branch
npm run sonar:new-code
```

### For Pragmatic Full Analysis
```bash
# Run with relaxed rules
npm run sonar:check:pragmatic
```

### For CI/CD
```bash
# Use pragmatic analysis in CI
npm run sonar:analyze:pragmatic
```

## 📊 What Gets Flagged

### ✅ Always Fixed (Real Bugs)
- Unreachable code
- Always-true/false conditions
- Incorrect array operations
- Missing return values
- Security vulnerabilities

### ⚠️ Warnings Only (Code Smells)
- High complexity (only extreme cases >30)
- Duplicate code (only excessive >10 occurrences)
- Long functions (warnings, not errors)

### 🔕 Ignored (Style Preferences)
- Ternary operators in JSX
- Small switches
- Boolean return preferences
- Template literal nesting

## 📈 Progressive Improvement Strategy

### Phase 1: Stop the Bleeding (Current)
- No new bugs in new code
- 60% test coverage for new code
- Fix only blocker issues in existing code

### Phase 2: Gradual Cleanup (3-6 months)
- When touching a file, improve its quality
- Add tests when fixing bugs
- Refactor complex functions during feature work

### Phase 3: Maintenance Mode (6+ months)
- Increase coverage threshold to 70%
- Reduce cognitive complexity threshold
- Enable more code smell rules

## 🛠️ Configuration Files

### For Different Scenarios

1. **Strict Analysis** (for greenfield code)
   ```bash
   eslint --config .eslintrc.sonar.cjs
   ```

2. **Pragmatic Analysis** (for existing code)
   ```bash
   eslint --config .eslintrc.sonar-pragmatic.cjs
   ```

3. **New Code Only** (for PRs)
   ```bash
   npm run sonar:new-code
   ```

## 🔧 Customizing Rules

### To Disable a Rule Globally
Edit `.eslintrc.sonar-pragmatic.cjs`:
```javascript
rules: {
  'sonarjs/rule-name': 'off',
}
```

### To Ignore in Specific Files
```javascript
overrides: [{
  files: ['**/legacy/**'],
  rules: {
    'sonarjs/*': 'off',
  }
}]
```

### To Suppress in Code
```typescript
// eslint-disable-next-line sonarjs/cognitive-complexity
function complexButNecessary() {
  // Complex logic here
}
```

## 📋 Quality Gates

### New Code Standards
- **Coverage**: ≥60% (realistic for real-world development)
- **Duplications**: <5% (some duplication is acceptable)
- **Bugs**: 0 (no compromise on bugs)
- **Vulnerabilities**: 0 (security first)

### Overall Project
- **Blocker Issues**: 0 (must fix immediately)
- **Critical Issues**: ≤10 (fix gradually)
- **Major Issues**: Track but don't block

## 🚦 CI/CD Integration

### GitHub Actions
```yaml
- name: SonarQube Scan (Pragmatic)
  run: npm run sonar:analyze:pragmatic
  continue-on-error: false  # Fail on new issues only
```

### Pre-commit Hook (Optional)
```bash
# .husky/pre-commit
npm run sonar:new-code || echo "Check SonarQube warnings"
```

## 💡 Best Practices

1. **Run Before PR**: `npm run sonar:new-code`
2. **Fix Blockers First**: Focus on real bugs
3. **Improve When Touching**: When modifying a file, improve its quality
4. **Document Suppressions**: Explain why a rule is disabled
5. **Review Warnings**: Don't ignore, but don't block either

## 🔍 Common Patterns to Allow

### React Components
- High complexity in large components (warned at 40+)
- Nested ternaries in JSX
- Repeated strings in props

### API/Routes
- Long handler functions
- Switch statements with many cases
- Repeated error messages

### Tests
- All rules relaxed
- Duplication allowed
- High complexity acceptable

## 📈 Tracking Progress

### Monthly Review
1. Check new code coverage trend
2. Review blocker/critical issue count
3. Celebrate improvements!

### Gradual Tightening
Every quarter, consider:
- Reducing complexity threshold by 5
- Increasing coverage by 5%
- Enabling one new rule

## 🆘 Troubleshooting

### Too Many Issues?
Use more pragmatic config:
```bash
npm run sonar:check:pragmatic
```

### False Positives?
Add to exclusions in `sonar-project-pragmatic.properties`

### Need Stricter Rules?
Use the standard config:
```bash
npm run sonar:check
```

Remember: The goal is sustainable code quality improvement, not perfection!