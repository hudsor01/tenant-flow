import React from 'react'
import type { Preview } from '@storybook/react'
import { withThemeByClassName } from '@storybook/addon-themes'
import { initialize, mswLoader } from 'msw-storybook-addon'
import { handlers } from '../stories/utils/msw-handlers'
import '../../frontend/src/app/globals.css'

// Global Supabase mock for Storybook
const mockSupabaseClient = {
	from: () => ({
		select: () => Promise.resolve({ data: [], error: null }),
		insert: () => Promise.resolve({ data: [], error: null }),
		update: () => Promise.resolve({ data: [], error: null }),
		delete: () => Promise.resolve({ data: [], error: null })
	}),
	rpc: () => Promise.resolve({ data: null, error: null }),
	auth: {
		getUser: () => Promise.resolve({ data: { user: null }, error: null }),
		signInWithPassword: () => Promise.resolve({ data: null, error: null }),
		signOut: () => Promise.resolve({ error: null })
	}
}

// Mock environment variables for Supabase
if (typeof process !== 'undefined' && process.env) {
	process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-project.supabase.co'
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key-for-storybook'
}

// Mock the Supabase module
if (typeof window !== 'undefined') {
	;(window as any).__SUPABASE_CLIENT__ = mockSupabaseClient
}

// Initialize MSW
initialize()

// Global MSW handlers
export const mswHandlers = handlers

const preview: Preview = {
	parameters: {
		viewport: {
			viewports: {
				mobile: {
					name: 'Mobile',
					styles: {
						width: '375px',
						height: '812px'
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
		},
		layout: 'centered',
		backgrounds: {
			default: 'light',
			values: [
				{ name: 'light', value: '#ffffff' },
				{ name: 'dark', value: '#0a0a0a' },
				{ name: 'gray', value: '#f3f4f6' }
			]
		},
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		}
		// Removed deprecated argTypesRegex - use fn() from @storybook/test instead
	},
	decorators: [
		withThemeByClassName({
			themes: {
				light: 'light',
				dark: 'dark'
			},
			defaultTheme: 'light'
		}),
		Story => (
			<div className="min-h-screen antialiased">
				<Story />
			</div>
		)
	],
	loaders: [mswLoader],
	tags: ['autodocs']
}

export default preview
