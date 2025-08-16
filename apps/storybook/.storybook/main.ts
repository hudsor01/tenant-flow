import type { StorybookConfig } from '@storybook/nextjs'
import path from 'path'

const config: StorybookConfig = {
	stories: [
		// Phase 1: UI components only
		'../../frontend/src/components/ui/**/*.stories.@(js|jsx|ts|tsx|mdx)',
		// Phase 2: Add more as we clean up
		'../stories/**/*.stories.@(js|jsx|ts|tsx|mdx)',
		'../stories/**/*.mdx'
	],
	addons: [
		'@storybook/addon-essentials',
		'@storybook/addon-themes',
		'@storybook/addon-a11y',
		'@storybook/addon-viewport',
		'@storybook/addon-measure',
		'@storybook/addon-outline',
		'@storybook/addon-interactions',
		'@chromatic-com/storybook',
		'msw-storybook-addon'
	],
	framework: {
		name: '@storybook/nextjs',
		options: {
			nextConfigPath: path.resolve(
				__dirname,
				'../../frontend/next.config.ts'
			)
		}
	},
	features: {
		experimentalRSC: true
	},
	staticDirs: [
		path.resolve(__dirname, '../../frontend/public'),
		path.resolve(__dirname, '../public')
	],
	typescript: {
		check: false,
		reactDocgen: 'react-docgen-typescript'
	},
	core: {
		disableTelemetry: true
	},
	webpackFinal: async config => {
		// Add support for absolute imports from frontend
		config.resolve = config.resolve || {}
		config.resolve.alias = {
			...config.resolve.alias,
			'@': path.resolve(__dirname, '../../frontend/src'),
			'@/components': path.resolve(
				__dirname,
				'../../frontend/src/components'
			),
			'@/lib': path.resolve(__dirname, '../../frontend/src/lib'),
			'@/hooks': path.resolve(__dirname, '../../frontend/src/hooks'),
			'@/types': path.resolve(__dirname, '../../frontend/src/types'),
			'@/styles': path.resolve(__dirname, '../../frontend/src/styles'),
			'@repo/shared': path.resolve(
				__dirname,
				'../../../packages/shared/src'
			),
			'@repo/database': path.resolve(
				__dirname,
				'../../../packages/database'
			)
		}
		return config
	}
}

export default config
