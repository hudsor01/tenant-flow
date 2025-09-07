import type { Preview } from '@storybook/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initialize, mswLoader } from 'msw-storybook-addon'
import { createElement } from 'react'
import '../../frontend/src/app/globals.css'
import './storybook-styles.css'

// Create a global QueryClient for Storybook
const globalQueryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000,
			retry: 1,
			refetchOnWindowFocus: false
		}
	}
})

// Initialize MSW for API mocking
// See https://github.com/mswjs/msw-storybook-addon#configuring-msw
try {
	initialize({
		onUnhandledRequest: 'bypass',
		serviceWorker: {
			url: '/mockServiceWorker.js'
		}
	})
} catch (e) {
	// eslint-disable-next-line no-console
	console.warn('[storybook] MSW initialize failed; continuing without SW', e)
}

// Mock Node.js globals and process for browser compatibility
if (typeof window !== 'undefined') {
	;(window as any).process = {
		env: {
			NODE_ENV: 'development',
			// Supabase environment variables for Storybook
			SUPABASE_URL: 'https://mock-project.supabase.co',
			SUPABASE_ANON_KEY: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.mock-anon-key',
			NEXT_PUBLIC_SUPABASE_URL: 'https://mock-project.supabase.co',
			NEXT_PUBLIC_SUPABASE_ANON_KEY:
				'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.mock-anon-key',
			// PostHog for analytics
			NEXT_PUBLIC_POSTHOG_KEY: 'mock-posthog-key',
			NEXT_PUBLIC_POSTHOG_HOST: 'https://app.posthog.com',
			// Backend API URL
			NEXT_PUBLIC_BACKEND_URL: 'http://localhost:4600'
		}
	}
	;(window as any).global = window
}

const preview: Preview = {
	loaders: [mswLoader],
	parameters: {
		// Enhanced Controls
		controls: {
			expanded: true,
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			},
			hideNoControlsWarning: true,
			sort: 'requiredFirst'
		},
		// Improved Backgrounds
		backgrounds: {
			default: 'light',
			values: [
				{ name: 'light', value: 'oklch(0.99 0.01 240)' },
				{ name: 'dark', value: 'oklch(0.129 0.042 264.695)' },
				{ name: 'brand', value: 'oklch(0.5 0.2 240)' },
				{ name: 'neutral', value: 'oklch(0.95 0 0)' }
			]
		},
		// Enhanced Actions
		actions: {
			argTypesRegex: '^on[A-Z].*',
			handles: ['mouseover', 'click', 'focus', 'blur']
		},
		// Improved Docs
		docs: {
			defaultName: 'Documentation',
			extractArgTypes: false,
			extractComponentDescription: false
		},
		// Better Viewports
		viewport: {
			viewports: {
				mobile: {
					name: 'Mobile',
					styles: { width: '375px', height: '667px' },
				},
				tablet: {
					name: 'Tablet',
					styles: { width: '768px', height: '1024px' },
				},
				desktop: {
					name: 'Desktop',
					styles: { width: '1200px', height: '800px' },
				},
				wide: {
					name: 'Wide Screen',
					styles: { width: '1440px', height: '900px' },
				}
			},
			defaultViewport: 'desktop'
		},
		layout: 'centered'
	},
	globalTypes: {
		theme: {
			description: 'Light/Dark/System theme',
			defaultValue: 'light',
			toolbar: {
				title: 'Theme',
				icon: 'paintbrush',
				items: [
					{ value: 'light', title: 'Light', icon: 'sun' },
					{ value: 'dark', title: 'Dark', icon: 'moon' },
					{ value: 'system', title: 'System', icon: 'mirror' }
				],
				dynamicTitle: true
			}
		},
		domain: {
			description: 'Design domain context',
			defaultValue: 'product',
			toolbar: {
				title: 'Domain',
				icon: 'component',
				items: [
					{ value: 'product', title: 'Product', icon: 'admin' },
					{ value: 'marketing', title: 'Marketing', icon: 'lightning' }
				],
				dynamicTitle: true
			}
		},
		radius: {
			description: 'Border radius token',
			defaultValue: '12',
			toolbar: {
				title: 'Radius',
				icon: 'border',
				items: [
					{ value: '8', title: 'sm' },
					{ value: '12', title: 'md' },
					{ value: '16', title: 'lg' },
					{ value: '20', title: 'xl' }
				]
			}
		},
		spacing: {
			description: 'Base spacing step (px)',
			defaultValue: '4',
			toolbar: {
				title: 'Spacing',
				icon: 'zoom',
				items: [
					{ value: '4', title: '4px' },
					{ value: '6', title: '6px' },
					{ value: '8', title: '8px' },
					{ value: '12', title: '12px' }
				]
			}
		}
	},
	decorators: [
		// Global QueryClient Provider
		Story => {
			return createElement(
				QueryClientProvider,
				{ client: globalQueryClient },
				createElement(Story as any)
			)
		},
		// Theme and Styling Decorator
		(Story, context) => {
			try {
				const theme =
					(context.globals.theme as 'light' | 'dark' | 'system') ?? 'light'
				const domain =
					(context.globals.domain as 'marketing' | 'product') ?? 'product'
				const radius = String(context.globals.radius || '12')
				const spacing = String(context.globals.spacing || '4')

				const root = document.documentElement
				// Apply domain to <html> so CSS tokens can override
				root.setAttribute('data-domain', domain)

				// System theme support
				const prefersDark =
					globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches ??
					false
				const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
				root.classList.toggle('dark', isDark)

				// Token controls (radius/spacing only) — avoid overriding color tokens
				root.style.setProperty('--radius', `${radius}px`)
				root.style.setProperty('--spacing', `${spacing}px`)
			} catch (e) {
				// eslint-disable-next-line no-console
				console.warn('[storybook] theme decorator failed softly', e)
			}

			return createElement(
				'div',
				{
					style: { minHeight: '100vh' }
				},
				createElement(Story as any)
			)
		}
	]
}

export default preview
