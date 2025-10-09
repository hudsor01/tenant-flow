import type { IncomingMessage, ServerResponse } from 'node:http'
import { createServer } from 'node:http'

/**
 * Simple HTTP test server helper for integration tests.
 */
export function createTestServer(
	handler: (req: IncomingMessage, res: ServerResponse) => void
) {
	const server = createServer(handler)

	return {
		listen(port: number) {
			return new Promise<void>((resolve, reject) => {
				server.once('error', reject)
				server.listen(port, resolve)
			})
		},
		close() {
			return new Promise<void>((resolve, reject) => {
				server.close((err) => {
					if (err) {
						reject(err)
					} else {
						resolve()
					}
				})
			})
		}
	}
}
