import type { Request } from 'express'

export type TokenSource = 'header' | 'none'

export interface ResolvedSupabaseToken {
	token: string | null
	source: TokenSource
	authHeaderPresent: boolean
	availableCookies: string[]
	cookieKeys: string[]
	expectedCookieName: string
}

const AUTH_HEADER_PREFIX = 'Bearer '

export class SupabaseAuthTokenResolver {
	constructor(private readonly projectRef: string) {}

	resolve(req: Request): ResolvedSupabaseToken {
		const authHeader = req.headers.authorization
		const token = this.extractTokenFromAuthHeader(authHeader)
		const expectedCookieName = this.buildAuthCookieName()

		return {
			token: token ?? null,
			source: token ? 'header' : 'none',
			authHeaderPresent: Boolean(authHeader),
			availableCookies: [],
			cookieKeys: [],
			expectedCookieName
		}
	}

	private extractTokenFromAuthHeader(headerValue?: string): string | undefined {
		if (!headerValue || !headerValue.startsWith(AUTH_HEADER_PREFIX)) {
			return undefined
		}

		const token = headerValue.slice(AUTH_HEADER_PREFIX.length).trim()
		return token.length > 0 ? token : undefined
	}

	private buildAuthCookieName(): string {
		return `sb-${this.projectRef}-auth-token`
	}
}
