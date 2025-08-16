/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'posthog-js/react' {
	export function usePostHog(): {
		capture: (eventName: string, properties?: Record<string, any>) => void
		identify: (distinctId: string, properties?: Record<string, any>) => void
		reset: () => void
		[key: string]: any
	}
	export function PostHogProvider(props: {
		apiKey: string
		children: React.ReactNode
		options?: Record<string, any>
	}): JSX.Element
}

declare module '@radix-ui/themes' {
	export const Box: any
	export const Flex: any
	export const Container: any
	export const Grid: any
	export const Section: any
	export const Text: any
	export const Heading: any
}