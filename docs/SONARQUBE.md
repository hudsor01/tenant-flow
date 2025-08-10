# SonarQube Configuration Guide

This document explains how to use SonarQube for code quality analysis in the TenantFlow project.

## Overview

SonarQube is configured to analyze code quality, detect bugs, code smells, and security vulnerabilities across our TypeScript/React monorepo.

## Configuration Files

1. **`sonar-project.properties`** - Main SonarQube configuration
2. **`.eslintrc.sonar.js`** - ESLint configuration with SonarJS rules
3. **`.github/workflows/sonarqube.yml`** - CI/CD integration

## Local Development

### Running SonarQube Analysis

```bash
# Run ESLint with SonarJS rules
npm run sonar:lint

# Run full SonarQube analysis (requires SonarQube server)
npm run sonar:analyze

# Run both lint and typecheck with SonarQube rules
npm run sonar:check
```

### Installing SonarQube Scanner (Optional)

If you want to run full SonarQube analysis locally:

```bash
# macOS
brew install sonar-scanner

# or download from
# https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/
```

## SonarQube Rules

The project uses the `eslint-plugin-sonarjs` package to enforce SonarQube's recommended rules locally.

### Key Rules Configured

- **Cognitive Complexity**: Maximum 20 (relaxed for React components)
- **Duplicate Strings**: Threshold of 5 occurrences
- **Code Smells**: All recommended rules enabled
- **Bug Detection**: All critical bug patterns detected

### Customizations

Some rules are disabled or relaxed:
- Test files have relaxed complexity rules
- Configuration files allow string duplication
- Nested template literals are allowed
- If-else chains without final else are permitted

## CI/CD Integration

The GitHub Actions workflow automatically:
1. Runs tests with coverage
2. Executes ESLint with SonarJS rules
3. Performs SonarQube scan
4. Checks quality gates

### Required Secrets

Add these secrets to your GitHub repository:
- `SONAR_TOKEN` - Authentication token from SonarQube
- `SONAR_HOST_URL` - Your SonarQube server URL (or https://sonarcloud.io)

## Fixing SonarQube Issues

When SonarQube detects issues:

1. **In VS Code**: Issues appear as warnings/errors with `[typescript:SXXXX]` codes
2. **In CI**: Check the SonarQube report in your PR or SonarQube dashboard
3. **Common fixes**:
   - Replace `Object.prototype.hasOwnProperty.call()` with `Object.hasOwn()`
   - Remove redundant type assertions
   - Simplify conditional logic
   - Extract complex functions to reduce cognitive complexity

## Ignoring False Positives

If you need to ignore a specific SonarQube rule:

```typescript
// eslint-disable-next-line sonarjs/no-duplicate-string
const repeated = "This string appears multiple times";
```

Or for a whole file:
```typescript
/* eslint-disable sonarjs/cognitive-complexity */
```

## Best Practices

1. Run `npm run sonar:lint` before committing
2. Address critical and major issues immediately
3. Keep cognitive complexity below 15 for most functions
4. Avoid disabling rules unless absolutely necessary
5. Document why a rule is disabled when you do

## Troubleshooting

### ESLint not detecting SonarJS rules
```bash
npm install --save-dev eslint-plugin-sonarjs
```

### SonarQube scanner not found
Install the scanner or use the Docker image:
```bash
docker run --rm -e SONAR_HOST_URL="$SONAR_HOST_URL" -e SONAR_TOKEN="$SONAR_TOKEN" -v "$(pwd):/usr/src" sonarsource/sonar-scanner-cli
```

## Resources

- [SonarJS Rules](https://github.com/SonarSource/eslint-plugin-sonarjs/blob/master/docs/rules)
- [SonarQube Documentation](https://docs.sonarqube.org/)
- [TypeScript Analysis](https://docs.sonarqube.org/latest/analysis/languages/typescript/)