# Chromatic Visual Testing Setup Guide

## Overview
Chromatic provides automated visual testing for Storybook components, catching visual regressions before they reach production.

## Setup Steps

### 1. Create Chromatic Account
1. Visit [chromatic.com](https://chromatic.com)
2. Sign in with your GitHub account
3. Click "Add Project" 
4. Select your repository: `tenant-flow`
5. Choose the Storybook location: `apps/storybook`

### 2. Get Project Token
After creating the project, Chromatic will provide a unique project token like:
```
chpt_1234567890abcdef1234567890abcdef12345678
```

### 3. Set Environment Variable

#### For Local Development:
```bash
# Add to your .env.local or shell profile
export CHROMATIC_PROJECT_TOKEN="your_token_here"
```

#### For CI/CD (GitHub Actions):
1. Go to repository Settings → Secrets and Variables → Actions
2. Add new repository secret:
   - Name: `CHROMATIC_PROJECT_TOKEN`
   - Value: `your_token_here`

### 4. Update Configuration
Replace `PROJECT_TOKEN_PLACEHOLDER` in `chromatic.config.json` with your actual token:

```json
{
  "projectToken": "your_actual_token_here",
  "buildScriptName": "build-storybook",
  "storybookBuildDir": "storybook-static"
}
```

## Usage Commands

### Run Visual Tests
```bash
# One-time visual test
npm run chromatic

# CI mode (non-blocking)
npm run chromatic:ci

# Build and test together
npm run visual-test
```

### First Run Setup
```bash
# Accept all initial screenshots as baselines
npm run chromatic -- --auto-accept-changes
```

## GitHub Actions Integration

Create `.github/workflows/chromatic.yml`:
```yaml
name: Visual Testing
on: [push, pull_request]

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          workingDir: apps/storybook
```

## Configuration Options

### Skip Visual Tests
Add `skip-test` tag to stories you don't want visually tested:
```typescript
export default {
  title: 'Components/Button',
  tags: ['skip-test'], // Skip visual regression
} satisfies Meta;
```

### Auto-accept on Main Branch
Updates to `main` branch automatically become new baselines:
```json
{
  "autoAcceptChanges": "main"
}
```

## Workflow Integration

### 1. Development Workflow
- Write component story
- Run `npm run chromatic` locally to establish baseline
- Make changes
- Chromatic catches visual differences
- Review changes in Chromatic UI
- Accept or reject changes

### 2. PR Workflow  
- PR opened → Chromatic runs automatically
- Visual changes detected → PR shows Chromatic check
- Review visual changes in Chromatic dashboard
- Approve changes → Merge PR
- New baselines established

## Troubleshooting

### Common Issues

#### Token Not Found
```
Error: Project token not found
```
**Solution**: Ensure `CHROMATIC_PROJECT_TOKEN` environment variable is set

#### Build Directory Not Found
```
Error: Storybook build directory not found
```
**Solution**: Run `npm run build-storybook` first

#### Large Bundle Warning
```
Warning: Bundle size exceeds recommended limit
```
**Solution**: Use `onlyChanged: true` in chromatic.config.json to test only changed stories

### Performance Optimization

#### Only Test Changed Stories
```json
{
  "onlyChanged": true,
  "traceChanged": "expanded"
}
```

#### Skip Node Modules
```json
{
  "untraced": [
    "node_modules/**",
    ".turbo/**", 
    "coverage/**"
  ]
}
```

## Cost Management

### Free Tier Limits
- 5,000 snapshots/month
- Unlimited team members
- Public repositories

### Optimization Tips
1. Use `onlyChanged: true` for large projects
2. Skip non-visual stories with tags
3. Set up branch-based auto-acceptance
4. Use `exitZeroOnChanges: true` for CI

## Dashboard Features

### Review Interface
- Side-by-side visual comparisons
- Highlight changed pixels
- Browser/viewport differences
- Approval workflow

### Integration Features
- GitHub PR checks
- Slack notifications
- Email alerts
- Custom webhooks

## Best Practices

### Story Organization
- Group related components
- Use consistent naming
- Add meaningful descriptions
- Include edge cases and states

### Visual Testing Strategy
- Test all interactive states
- Include responsive breakpoints  
- Cover error conditions
- Test theming variations

### Team Workflow
- Assign visual reviewers
- Document visual changes
- Use descriptive commit messages
- Regular baseline updates

## Support

For issues or questions:
- [Chromatic Documentation](https://www.chromatic.com/docs)
- [GitHub Issues](https://github.com/chromaui/chromatic-cli/issues)
- Internal team Slack: #frontend-tooling