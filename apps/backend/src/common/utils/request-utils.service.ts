import { Injectable } from '@nestjs/common'
import { FastifyRequest } from 'fastify'
import { CsrfUtilsService } from './csrf-utils.service'
import { NetworkUtilsService } from './network-utils.service'
import { SessionUtilsService } from './session-utils.service'

/**
 * Request Utilities Service
 *
 * Composite service that provides a unified interface for request-related utilities.
 * Uses composition pattern to delegate to focused services:
 * - CsrfUtilsService for CSRF protection
 * - NetworkUtilsService for network/IP utilities
 * - SessionUtilsService for session management
 */
@Injectable()
export class RequestUtilsService {
	constructor(
		private readonly csrfUtils: CsrfUtilsService,
		private readonly networkUtils: NetworkUtilsService,
		private readonly sessionUtils: SessionUtilsService
	) {}

	// CSRF-related methods
	extractCsrfToken(request: FastifyRequest): string | null {
		return this.csrfUtils.extractCsrfToken(request)
	}

	isValidCsrfTokenFormat(token: string): boolean {
		return this.csrfUtils.isValidCsrfTokenFormat(token)
	}

	isGlobalExemptRoute(url: string, exemptRoutes: string[]): boolean {
		return this.csrfUtils.isGlobalExemptRoute(url, exemptRoutes)
	}

	hasCsrfToken(request: FastifyRequest): boolean {
		return this.csrfUtils.hasCsrfToken(request)
	}

	extractTokenFromAllSources(request: FastifyRequest) {
		return this.csrfUtils.extractTokenFromAllSources(request)
	}

	// Network-related methods
	getClientIP(request: FastifyRequest): string {
		return this.networkUtils.getClientIP(request)
	}

	getAllClientIPs(request: FastifyRequest) {
		return this.networkUtils.getAllClientIPs(request)
	}

	getUserAgent(request: FastifyRequest): string {
		return this.networkUtils.getUserAgent(request)
	}

	isFromTrustedProxy(
		request: FastifyRequest,
		trustedProxies: string[] = []
	): boolean {
		return this.networkUtils.isFromTrustedProxy(request, trustedProxies)
	}

	getRequestOrigin(request: FastifyRequest) {
		return this.networkUtils.getRequestOrigin(request)
	}

	isLikelyBot(request: FastifyRequest): boolean {
		return this.networkUtils.isLikelyBot(request)
	}

	getConnectionInfo(request: FastifyRequest) {
		return this.networkUtils.getConnectionInfo(request)
	}

	// Session-related methods
	extractSessionId(request: FastifyRequest): string | null {
		return this.sessionUtils.extractSessionId(request)
	}

	extractUserIdFromJWT(token: string): string | null {
		return this.sessionUtils.extractUserIdFromJWT(token)
	}

	extractSessionCookie(request: FastifyRequest): string | null {
		return this.sessionUtils.extractSessionCookie(request)
	}

	createFallbackSessionId(ip: string, userAgent: string): string {
		return this.sessionUtils.createFallbackSessionId(ip, userAgent)
	}

	// Composite convenience methods that combine multiple services

	/**
	 * Get comprehensive request context combining all utilities
	 */
	getRequestContext(request: FastifyRequest) {
		const connection = this.networkUtils.getConnectionInfo(request)
		const sessionId = this.sessionUtils.extractSessionId(request)
		const csrfToken = this.csrfUtils.extractCsrfToken(request)
		const origin = this.networkUtils.getRequestOrigin(request)

		return {
			...connection,
			sessionId,
			csrfToken,
			origin,
			hasCsrfToken: csrfToken !== null,
			isValidCsrfFormat: csrfToken
				? this.csrfUtils.isValidCsrfTokenFormat(csrfToken)
				: false
		}
	}

	/**
	 * Get security-focused request analysis
	 */
	getSecurityContext(request: FastifyRequest, exemptRoutes: string[] = []) {
		const ip = this.networkUtils.getClientIP(request)
		const userAgent = this.networkUtils.getUserAgent(request)
		const isBot = this.networkUtils.isLikelyBot(request)
		const csrfTokens = this.csrfUtils.extractTokenFromAllSources(request)
		const isExemptRoute = this.csrfUtils.isGlobalExemptRoute(
			request.url,
			exemptRoutes
		)

		return {
			ip,
			userAgent,
			isBot,
			csrfTokens,
			isExemptRoute,
			hasValidCsrfToken: csrfTokens.selectedToken
				? this.csrfUtils.isValidCsrfTokenFormat(
						csrfTokens.selectedToken
					)
				: false
		}
	}
}
