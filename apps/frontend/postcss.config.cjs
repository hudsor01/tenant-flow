// PostCSS config optimized for Tailwind CSS v4 and Next.js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {
      // Enable Tailwind CSS v4 optimizations
      optimize: true,
    },
    autoprefixer: {
      // Optimize for modern browsers
      overrideBrowserslist: [
        'defaults',
        'not IE 11',
        'not IE_Mob 11',
      ],
    },
  },
}

