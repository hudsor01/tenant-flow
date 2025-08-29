// PostCSS config in CommonJS for Next.js compatibility
module.exports = {
  plugins: {
    '@unocss/postcss': {
      // Load UnoCSS config from this app directory
      configOrPath: './uno.config.ts',
    },
    autoprefixer: {},
  },
}

