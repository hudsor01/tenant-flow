import type { StorybookConfig } from '@storybook/nextjs-vite'
import { dirname, join } from 'path'
import { mergeConfig } from 'vite'

const config: StorybookConfig = {
	stories: [
		// Current story files
		'../stories/**/*.stories.@(js|jsx|ts|tsx)'
		// Future: UI components when they have stories
		// '../../frontend/src/components/ui/**/*.stories.@(js|jsx|ts|tsx|mdx)',
	],
	addons: [
		'@storybook/addon-a11y',
		'@chromatic-com/storybook',
		'msw-storybook-addon',
		'@storybook/addon-docs'
	],
	framework: {
		name: '@storybook/nextjs-vite',
		options: {}
	},
	async viteFinal(config) {
		return mergeConfig(config, {
			resolve: {
				alias: {
					'@': join(dirname(__dirname), '../frontend/src'),
					'@/components': join(
						dirname(__dirname),
						'../frontend/src/components'
					),
					'@/lib': join(dirname(__dirname), '../frontend/src/lib'),
					'@/hooks': join(
						dirname(__dirname),
						'../frontend/src/hooks'
					),
					'@/types': join(
						dirname(__dirname),
						'../frontend/src/types'
					),
					'@/styles': join(
						dirname(__dirname),
						'../frontend/src/styles'
					),
					'@repo/shared': join(
						dirname(__dirname),
						'../../packages/shared/src'
					),
					'@repo/database': join(
						dirname(__dirname),
						'../../packages/database'
					),
					// Mock overrides for Storybook
					'@/hooks/use-accessibility': join(
						__dirname,
						'mocks/hooks.ts'
					),
					'@/hooks/use-auth': join(__dirname, 'mocks/hooks.ts')
				}
			},
			define: {
				'process.env.NEXT_PUBLIC_SUPABASE_URL':
					'"https://mock.supabase.co"',
				'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': '"mock-anon-key"',
				'process.env.NEXT_PUBLIC_API_URL':
					'"https://api.tenantflow.app"'
			}
		})
	},
	features: {
		experimentalRSC: true
	},
	staticDirs: [join(__dirname, '../public')],
	typescript: {
		check: false,
		reactDocgen: 'react-docgen-typescript'
	},
	core: {
		disableTelemetry: true
	}
}

export default config
