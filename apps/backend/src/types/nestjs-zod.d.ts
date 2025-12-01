declare module 'nestjs-zod' {
	// Lightweight shim to avoid complex portable type names during DTO generation
	export const createZodDto: (...args: any[]) => any
	export class ZodValidationPipe {
		constructor(options?: any)
	}
}
