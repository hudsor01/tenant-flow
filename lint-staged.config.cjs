module.exports = {
  '*.{js,jsx,ts,tsx}': ['eslint --cache --fix', 'prettier --write'],
  '*.{json,md,mdx,css,scss,yml,yaml}': ['prettier --write']
}