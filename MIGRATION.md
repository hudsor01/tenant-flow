# Node.js 24 Migration Guide

## Overview
TenantFlow has migrated to Node.js 24 LTS for enhanced security and performance.

## Node.js 24 LTS Details
- **Release Date**: May 6, 2025
- **LTS Status**: October 31, 2025 (v24.11.0 "Krypton")
- **Support Until**: April 2028
- **Key Benefits**: Updated V8 engine, npm 11.x, OpenSSL 3.x, enhanced security

## Migration Timeline

### ✅ Completed
- [x] Updated `package.json` engines to `>=24.0.0`
- [x] Updated `Dockerfile` to Node 24 Alpine
- [x] Updated all GitHub Actions workflows to Node 24
- [x] Created `.nvmrc` with Node 24
- [x] Verified all tests pass with Node 24

### 📋 Developer Action Required

#### For Local Development

**Option 1: Upgrade to Node 24 (Recommended)**
```bash
# Using nvm
nvm install 24
nvm use 24
nvm alias default 24

# Verify
node -v  # Should show v24.x.x

# Reinstall dependencies
rm -rf node_modules
pnpm install
```

**Option 2: Continue with Node 22 (Temporary)**
You can continue using Node 22 locally during the transition:
- ⚠️ You'll see engine warnings (harmless)
- ✅ All commands still work (`engine-strict=false` in `.npmrc`)
- 🎯 Plan to upgrade within 2 weeks

#### Engine Warnings Explained
If you see:
```
WARN  Unsupported engine: wanted: {"node":">=24.0.0"} (current: {"node":"v22.17.0"})
```

**This is expected and non-blocking.** The warning appears because:
1. Project requires Node 24+ (`package.json`)
2. Your local environment runs Node 22
3. pnpm warns but allows execution (`engine-strict=false`)

**To eliminate warnings**: Upgrade to Node 24 using Option 1 above.

## Production Environments

### Docker (Backend)
- ✅ Uses `node:24-alpine3.21`
- ✅ No changes needed
- ✅ Builds run on Node 24

### CI/CD (GitHub Actions)
- ✅ All workflows use Node 24
- ✅ Tests run on Node 24
- ✅ Deployments use Node 24

### Vercel (Frontend)
- ⚠️ Check Node version in project settings
- 🎯 Should auto-detect from `.nvmrc`
- ✅ Supports Node 24 LTS

## Troubleshooting

### "Tests fail with Node 22"
**Solution**: Upgrade to Node 24. Some features may require Node 24+ APIs.

### "Docker build fails"
**Check**: Ensure `node:24-alpine3.21` image is available (it is as of Oct 2025)

### "Vercel deployment fails"
**Check**: Vercel project settings → Node.js version → Should be 24.x

## Resources
- [Node.js 24 Release Notes](https://nodejs.org/en/blog/release/v24.0.0)
- [Node.js 24 LTS Announcement](https://nodesource.com/blog/nodejs-24-becomes-lts)
- [pnpm engine-strict Documentation](https://pnpm.io/package_json)

## Support
If you encounter issues with the Node 24 migration:
1. Check this guide first
2. Verify you're using Node 24: `node -v`
3. Try fresh install: `rm -rf node_modules && pnpm install`
4. Open an issue if problems persist
