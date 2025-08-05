/** @type {import('postcss').Config} */
export default {
  plugins: {
    // TailwindCSS v4 is handled by @tailwindcss/vite plugin in vite.config.ts
    // PostCSS plugins should be minimal to avoid conflicts with TailwindCSS v4
    
    // PostCSS Import - only for custom CSS files
    'postcss-import': {},
    
    // Autoprefixer - essential for browser compatibility
    autoprefixer: {
      // Optimized browser list for modern property management workflows
      overrideBrowserslist: [
        'last 2 versions',
        '> 1%',
        'not dead',
        'not ie 11',
        'Chrome >= 87',
        'Firefox >= 78',
        'Safari >= 14',
        'Edge >= 88'
      ],
    },
    
    // CSS Nano for production builds only - with TailwindCSS v4 compatible settings
    ...(process.env.NODE_ENV === 'production' ? {
      cssnano: {
        preset: ['default', {
          // Conservative settings to avoid conflicts with TailwindCSS v4
          reduceIdents: false, // Don't reduce CSS identifiers
          discardComments: {
            removeAll: true,
          },
          normalizeWhitespace: true,
          discardDuplicates: true,
          mergeIdents: false, // Preserve design token names
          mergeLonghand: false, // Avoid breaking TailwindCSS utilities
          mergeRules: false, // Avoid merging rules that could break utilities
          minifySelectors: false, // Don't minify selectors to avoid breaking complex TailwindCSS selectors
          normalizeCharset: true,
          normalizeUrl: true,
          // Disable features that could conflict with TailwindCSS
          calc: false,
          colormin: false,
          convertValues: false,
          discardOverridden: false,
          minifyFontValues: false,
          minifyParams: false,
          normalizeDisplayValues: false,
          normalizePositions: false,
          normalizeRepeatStyle: false,
          normalizeString: false,
          normalizeTimingFunctions: false,
          normalizeUnicode: false,
          orderedValues: false,
          reduceInitial: false,
          reduceTransforms: false,
          svgo: false,
          uniqueSelectors: false,
        }],
      },
    } : {}),
  },
}