declare module '@hookform/resolvers/zod' {
	import { Resolver } from 'react-hook-form'
	import { ZodTypeAny } from 'zod'

	// temporary shim - export any-typed resolver to avoid version mismatch errors
	export function zodResolver(
		schema: ZodTypeAny,
		opts?: any
	): Resolver<any, any>
}
