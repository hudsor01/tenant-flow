import { Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

interface ThrottlerRequest {
	headers: Record<string, string | string[] | undefined>
	ip?: string
	socket?: { remoteAddress?: string }
}

@Injectable()
export class ThrottlerProxyGuard extends ThrottlerGuard {
	/**
	 * Custom tracker for Railway/proxy environments
	 * Uses X-Forwarded-For header to get real client IP
	 */
	protected override async getTracker(
		req: ThrottlerRequest
	): Promise<string> {
		// Check for forwarded IP from proxy (Railway, Cloudflare, etc.)
		const forwardedFor = req.headers['x-forwarded-for']
		const realIp = req.headers['x-real-ip']
		const cfConnectingIp = req.headers['cf-connecting-ip'] // Cloudflare

		// Priority order: CF-Connecting-IP > X-Real-IP > X-Forwarded-For > req.ip
		if (cfConnectingIp) {
			return Promise.resolve(
				Array.isArray(cfConnectingIp)
					? (cfConnectingIp[0] ?? 'unknown')
					: String(cfConnectingIp)
			)
		}

		if (realIp) {
			return Promise.resolve(
				Array.isArray(realIp)
					? (realIp[0] ?? 'unknown')
					: String(realIp)
			)
		}

		if (forwardedFor) {
			const ips = Array.isArray(forwardedFor)
				? forwardedFor[0]
				: forwardedFor
			if (typeof ips === 'string') {
				const parts = ips.split(',')
				return Promise.resolve(parts[0]?.trim() || 'unknown')
			}
			return Promise.resolve('unknown')
		}

		return Promise.resolve(req.ip ?? req.socket?.remoteAddress ?? 'unknown')
	}
}
