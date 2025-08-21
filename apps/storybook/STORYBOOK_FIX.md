# Storybook Webpack Conflict Resolution

## Issue

Storybook 9.1.2 has a webpack configuration conflict with Next.js 15.4.6 resulting in:

```
Cannot read properties of undefined (reading 'tap')
```

## Root Cause

- Next.js 15.4.6 uses its own bundled webpack 5 with heavily modified internal APIs
- Storybook 9 (and 8) expects standard webpack 5 plugin APIs
- The HtmlWebpackPlugin used by Storybook tries to access webpack's `tap` method which doesn't exist in Next.js's custom webpack bundle
- This is a fundamental incompatibility between Next.js 15's webpack implementation and Storybook

## Status

- ✅ Upgraded to Storybook 9.1.2
- ❌ Webpack conflict persists even in v9
- This is a known issue affecting many projects using Next.js 15 + Storybook

## Solutions

### Option 1: Use Next.js Vite Framework (Official Recommendation)

Switch to `@storybook/nextjs-vite` as officially recommended by Storybook docs:

```bash
npm uninstall @storybook/nextjs
npm install --save-dev @storybook/nextjs-vite
```

Then update `.storybook/main.ts`:

```typescript
framework: {
  name: '@storybook/nextjs-vite',
  options: {}
}
```

### Option 2: Wait for Next.js 15 Compatibility Fix

Monitor these issues:

- https://github.com/storybookjs/storybook/issues/28648
- https://github.com/vercel/next.js/issues/64409
- Official docs only specify "Next.js ≥ 14.1" support currently

### Option 3: Downgrade to Next.js 14

Temporarily downgrade to Next.js 14.1+ until official Next.js 15 support is documented

## Current Workaround

Storybook has been temporarily disabled. The project has been upgraded to Storybook v9, but the webpack conflict prevents it from running.

To test when a fix is available:

```bash
cd apps/storybook && npm run dev
```

## Component Development Alternatives

While Storybook is disabled:

1. **Next.js Dev Pages**: Create pages in `/app/design-system` for component development
2. **Unit Testing**: Use React Testing Library for component testing
3. **Visual Testing**: Use Playwright for visual regression testing
4. **Documentation**: Use TypeDoc or similar for component documentation
