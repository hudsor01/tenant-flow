module.exports = {
	plugins: {
		'@tailwindcss/postcss': {
			optimize: true
		},
		autoprefixer: {
			// Optimize for modern browsers
			overrideBrowserslist: ['defaults', 'not IE 11', 'not IE_Mob 11']
		}
	}
}
