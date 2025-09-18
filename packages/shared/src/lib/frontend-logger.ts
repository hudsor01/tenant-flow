/**
 * Simple console logger - no dependencies
 */
export const logger = {
	debug: (...args: unknown[]) => {
		if (process.env.NODE_ENV === 'development') {
			// eslint-disable-next-line no-console
			console.debug('[DEBUG]', ...args)
		}
	},
	info: (...args: unknown[]) => console.info('[INFO]', ...args),
	warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
	error: (...args: unknown[]) => console.error('[ERROR]', ...args)
}

export default logger
