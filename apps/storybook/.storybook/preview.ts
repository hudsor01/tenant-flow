import type { Preview } from '@storybook/nextjs-vite'
import '../styles/globals.css'

// Mock environment variables for Storybook
const mockEnvVars = {
	NEXT_PUBLIC_SUPABASE_URL: 'https://mock.supabase.co',
	NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key',
	NEXT_PUBLIC_API_URL: 'https://api.tenantflow.app'
}

// Set up global mocks
Object.assign(process.env, mockEnvVars)

// Mock Next.js environment
if (typeof window !== 'undefined') {
	// @ts-ignore
	window.__NEXT_DATA__ = { props: { pageProps: {} } }
}

const preview: Preview = {
	parameters: {
		actions: {
			argTypesRegex: '^on[A-Z].*'
		},
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/
			}
		},
		docs: {
			source: {
				type: 'dynamic',
				excludeDecorators: true
			}
		},
		nextjs: {
			appDirectory: true,
			navigation: {
				pathname: '/',
				query: {},
				asPath: '/'
			},
			router: {
				basePath: '',
				pathname: '/',
				route: '/',
				query: {},
				asPath: '/',
				push: () => Promise.resolve(true),
				replace: () => Promise.resolve(true),
				reload: () => {},
				back: () => {},
				prefetch: () => Promise.resolve(),
				beforePopState: () => {},
				events: {
					on: () => {},
					off: () => {},
					emit: () => {}
				}
			}
		},
		// Configure viewport for responsive testing
		viewport: {
			viewports: {
				mobile: {
					name: 'Mobile',
					styles: {
						width: '375px',
						height: '667px'
					}
				},
				tablet: {
					name: 'Tablet',
					styles: {
						width: '768px',
						height: '1024px'
					}
				},
				desktop: {
					name: 'Desktop',
					styles: {
						width: '1440px',
						height: '900px'
					}
				}
			}
		}
	},
	decorators: [
		Story => {
			const StoryComponent = Story as any
			return StoryComponent()
		}
	],
	globalTypes: {
		theme: {
			name: 'Theme',
			description: 'Global theme for components',
			defaultValue: 'light',
			toolbar: {
				icon: 'paintbrush',
				items: [
					{ value: 'light', title: 'Light', icon: 'sun' },
					{ value: 'dark', title: 'Dark', icon: 'moon' }
				],
				showName: true
			}
		}
	}
}

export default preview
