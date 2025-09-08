declare module '@tanstack/react-query-devtools' {
	import { ReactNode } from 'react'
	export const ReactQueryDevtools: (props: {
		initialIsOpen?: boolean
		children?: ReactNode
	}) => JSX.Element | null
}
