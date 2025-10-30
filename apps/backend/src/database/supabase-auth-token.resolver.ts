import type { Request } from 'express'

export type TokenSource = 'header' | 'none'

export interface ResolvedSupabaseToken {
	token: string | null
	source: TokenSource
	authHeaderPresent: boolean
}

const AUTH_HEADER_PREFIX = 'Bearer '

export class SupabaseAuthTokenResolver {
	resolve(req: Request): ResolvedSupabaseToken {
		const authHeader = req.headers.authorization
		const token = this.extractTokenFromAuthHeader(authHeader)

		return {
			token: token ?? null,
			source: token ? 'header' : 'none',
			authHeaderPresent: Boolean(authHeader)
		}
	}

	private extractTokenFromAuthHeader(
		headerValue?: string
	): string | undefined {
		if (!headerValue || !headerValue.startsWith(AUTH_HEADER_PREFIX)) {
			return undefined
		}

		const token = headerValue.slice(AUTH_HEADER_PREFIX.length).trim()
		return token.length > 0 ? token : undefined
	}
}
