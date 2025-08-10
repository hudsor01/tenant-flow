# Turbopack Migration Documentation

## Issue Resolved
**Error**: `undefined is not an object (evaluating 'originalFactory.call')`
**Root Cause**: Webpack incompatibility with React 19 + Next.js 15
**Solution**: Migrated from Webpack to Turbopack bundler

## Critical Configuration Changes

### 1. Package.json Dev Script
```json
// Before (using Webpack by default)
"dev": "next dev"

// After (explicitly using Turbopack)
"dev": "next dev --turbo"
```

### 2. Removed Incompatible Configurations

#### modularizeImports (Removed from next.config.ts)
```typescript
// REMOVED - Incompatible with Turbopack
modularizeImports: {
  'lucide-react': {
    transform: 'lucide-react/dist/esm/icons/{{ member }}'
  }
}
```

#### Webpack-specific React Refresh fixes (Removed)
All attempts to fix originalFactory errors through webpack configuration were removed as they're unnecessary with Turbopack.

### 3. Cleaned Up Artifacts
- Removed webpack cache directories: `.next/cache/webpack`
- Removed backend webpack cache: `.webpack-cache`
- Removed test HTML files used for debugging

## Why Turbopack?

1. **React 19 Compatibility**: Turbopack handles React 19's module system correctly
2. **Faster Development**: Rust-based bundler with better performance
3. **No Configuration Needed**: Works out-of-the-box with Next.js 15
4. **Future-proof**: Next.js is moving toward Turbopack as the default bundler

## What Still Uses Webpack?

Production builds (`npm run build`) still use Webpack with optimizations configured in `next.config.ts`. These optimizations include:
- Chunk splitting for optimal caching
- Bundle analysis (when ANALYZE=true)
- SVG optimization
- Module concatenation

## Verification Steps

1. Start dev server: `npm run dev`
2. Check browser console - no originalFactory errors
3. Verify hot reload works
4. Test component updates refresh properly

## Rollback Instructions (Not Recommended)

If you need to revert to Webpack (will cause React 19 errors):
1. Change package.json: `"dev": "next dev"` (remove --turbo)
2. Clear caches: `rm -rf .next`
3. Restart dev server

## Future Considerations

- Monitor Next.js releases for when Turbopack becomes the default
- Production builds may migrate to Turbopack in future Next.js versions
- Keep webpack configuration for production until officially deprecated

## Related Files Modified
- `/apps/frontend/package.json` - Added --turbo flag
- `/apps/frontend/next.config.ts` - Removed modularizeImports
- `/CLAUDE.md` - Added critical compatibility notes
- `/apps/frontend/README.md` - Added Turbopack requirement

## Date of Migration
January 2025 - Resolved during React 19 + Next.js 15 compatibility work