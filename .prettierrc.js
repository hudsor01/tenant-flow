module.exports = {
  // Line length and wrapping
  printWidth: 100,
  tabWidth: 2,
  useTabs: true,
  
  // Semicolons and quotes
  semi: false,
  singleQuote: true,
  quoteProps: 'as-needed',
  
  // Trailing commas for better git diffs
  trailingComma: 'es5',
  
  // Brackets and spacing
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  
  // File endings
  endOfLine: 'lf',
  
  // Framework specific
  jsxSingleQuote: false,
  
  // Import sorting with plugin
  plugins: ['prettier-plugin-organize-imports'],
  
  // Overrides for specific files
  overrides: [
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
      },
    },
    {
      files: ['*.json', '*.yml', '*.yaml'],
      options: {
        tabWidth: 2,
        useTabs: false,
      },
    },
  ],
}