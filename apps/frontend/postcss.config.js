/** @type {import('postcss').Config} */
export default {
  plugins: {
    'postcss-import': {},
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? {
      cssnano: {
        preset: ['default', {
          reduceIdents: false,
          discardComments: {
            removeAll: true,
          },
          normalizeWhitespace: true,
          discardDuplicates: true,
          mergeIdents: false,
          mergeLonghand: false,
          mergeRules: false,
          minifySelectors: false,
          normalizeCharset: true,
          normalizeUrl: true,
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