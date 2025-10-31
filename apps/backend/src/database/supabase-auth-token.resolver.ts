import type { Request } from 'express'

export type TokenSource = 'header' | 'cookie' | 'none'

export interface ResolvedSupabaseToken {
	token: string | null
	source: TokenSource
	authHeaderPresent: boolean
	availableCookies: string[]
	cookieKeys: string[]
	expectedCookieName: string
	rawCookie: string | null
}

const AUTH_HEADER_PREFIX = 'Bearer '

export class SupabaseAuthTokenResolver {
	constructor(private readonly projectRef: string) {}

	resolve(req: Request): ResolvedSupabaseToken {
		const authHeader = req.headers.authorization
		const token = this.extractTokenFromAuthHeader(authHeader)
		const availableCookies = Object.keys(req.cookies || {})
		const expectedCookieName = this.buildAuthCookieName()

		if (token) {
			return {
				token,
				source: 'header',
				authHeaderPresent: true,
				availableCookies,
				cookieKeys: [],
				expectedCookieName,
				rawCookie: null
			}
		}

		const cookie = this.collectSupabaseAuthCookie(req, expectedCookieName)
		const cookieToken = cookie.value
			? this.extractAccessTokenFromCookie(cookie.value)
			: undefined

		return {
			token: cookieToken ?? null,
			source: cookieToken ? 'cookie' : 'none',
			authHeaderPresent: Boolean(authHeader),
			availableCookies,
			cookieKeys: cookie.keys,
			expectedCookieName,
			rawCookie: cookie.value
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

	private buildAuthCookieName(): string {
		return `sb-${this.projectRef}-auth-token`
	}

	private collectSupabaseAuthCookie(
		req: Request,
		baseCookieName: string
	): { value: string | null; keys: string[] } {
		const cookies = req.cookies ?? {}
		const keys = Object.keys(cookies).filter(
			key => key === baseCookieName || key.startsWith(`${baseCookieName}.`)
		)

		if (keys.length === 0) {
			return { value: null, keys: [] }
		}

		const sortedKeys = keys.sort((a, b) => {
			if (a === baseCookieName) return -1
			if (b === baseCookieName) return 1

			const suffixA = a.substring(baseCookieName.length + 1)
			const suffixB = b.substring(baseCookieName.length + 1)

			const numA = Number.parseInt(suffixA, 10)
			const numB = Number.parseInt(suffixB, 10)
			const isNumA = Number.isFinite(numA)
			const isNumB = Number.isFinite(numB)

			if (isNumA && isNumB) return numA - numB
			if (isNumA) return -1
			if (isNumB) return 1

			return suffixA.localeCompare(suffixB)
		})

		const combinedValue = sortedKeys
			.map(key => {
				const value = cookies[key]
				if (Array.isArray(value)) {
					return value.join('')
				}
				return value ?? ''
			})
			.join('')

		return {
			value: combinedValue.length > 0 ? combinedValue : null,
			keys: sortedKeys
		}
	}

	private extractAccessTokenFromCookie(
		cookieValue: string
	): string | undefined {
		const candidates = new Set<string>()
		if (cookieValue) {
			candidates.add(cookieValue)
			try {
				const decoded = decodeURIComponent(cookieValue)
				candidates.add(decoded)
			} catch {
				// ignore decode errors
			}
		}

		for (const candidate of candidates) {
			try {
				const parsed = JSON.parse(candidate)

				if (typeof parsed === 'string') {
					try {
						const innerParsed = JSON.parse(parsed)
						const token = this.extractAccessTokenFromParsedCookie(innerParsed)
						if (token) return token
					} catch {
						// ignore nested JSON issues
					}
				}

				const token = this.extractAccessTokenFromParsedCookie(parsed)
				if (token) return token
			} catch {
				// ignore parse errors
			}
		}

		for (const candidate of candidates) {
			const match = candidate.match(/"access[_-]?token"\s*:\s*"([^"]+)"/)
			if (match?.[1]) {
				return match[1]
			}
		}

		return undefined
	}

	private extractAccessTokenFromParsedCookie(
		parsed: unknown
	): string | undefined {
		if (!parsed || typeof parsed !== 'object') return undefined

		const possibleSessions = [
			(parsed as { currentSession?: unknown }).currentSession,
			(parsed as { session?: unknown }).session,
			parsed,
			Array.isArray(parsed) ? parsed[0] : undefined
		]

		for (const session of possibleSessions) {
			if (!session || typeof session !== 'object') continue
			const directToken =
				(session as Record<string, unknown>).access_token ??
				(session as Record<string, unknown>).accessToken ??
				(session as Record<string, unknown>)['access-token']

			if (typeof directToken === 'string' && directToken.length > 0) {
				return directToken
			}
		}

		return undefined
	}
}
