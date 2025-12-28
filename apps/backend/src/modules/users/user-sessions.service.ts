import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import { UAParser } from 'ua-parser-js'

export interface UserSession {
	id: string
	user_id: string
	created_at: string
	updated_at: string
	user_agent: string | null
	ip: string | null
	browser: string | null
	os: string | null
	device: string | null
	is_current: boolean
}

@Injectable()
export class UserSessionsService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get all active sessions for a user
	 * Uses admin client to query auth.sessions table
	 */
	async getUserSessions(
		userId: string,
		currentSessionId?: string
	): Promise<UserSession[]> {
		try {
			// Query auth.sessions using raw SQL via rpc
			// The auth.sessions table is in the auth schema and not accessible via standard client
			// We use a SECURITY DEFINER function or raw query with service role
			type AuthSession = {
				id: string
				user_id: string
				created_at: string
				updated_at: string
				user_agent: string | null
				ip: string | null
			}

			// Try to query via RPC function (uses string overload to avoid type issues)
			const { data: rpcData, error: rpcError } =
				await this.supabase.rpcWithRetries(
					'get_user_sessions',
					{ p_user_id: userId },
					2 // Only 2 attempts for fast failure
				)

			if (!rpcError && rpcData) {
				const sessions = rpcData as AuthSession[]
				return sessions.map(session =>
					this.formatSession(session, currentSessionId)
				)
			}

			// Log if RPC is not available
			if (rpcError) {
				this.logger.debug(
					'get_user_sessions RPC not available, using fallback',
					{
						error: rpcError.message ?? String(rpcError)
					}
				)
			}

			// Fallback: return just the current session info
			return this.getCurrentSessionOnly(userId, currentSessionId)
		} catch (err) {
			this.logger.error('Failed to get user sessions', {
				error: err instanceof Error ? err.message : String(err),
				userId
			})

			// Return current session as fallback
			return this.getCurrentSessionOnly(userId, currentSessionId)
		}
	}

	/**
	 * Revoke a specific session
	 */
	async revokeSession(userId: string, sessionId: string): Promise<boolean> {
		try {
			// Use RPC function to revoke session from auth.sessions
			const { error } = await this.supabase.rpcWithRetries(
				'revoke_user_session',
				{
					p_user_id: userId,
					p_session_id: sessionId
				},
				2 // Only 2 attempts
			)

			if (error) {
				this.logger.error('Failed to revoke session', {
					error: error.message ?? String(error),
					sessionId,
					userId
				})
				throw new InternalServerErrorException('Failed to revoke session')
			}

			this.logger.log('Session revoked successfully', { sessionId, userId })
			return true
		} catch (err) {
			if (err instanceof InternalServerErrorException) {
				throw err
			}
			this.logger.error('Error revoking session', {
				error: err instanceof Error ? err.message : String(err),
				sessionId,
				userId
			})
			throw new InternalServerErrorException('Failed to revoke session')
		}
	}

	/**
	 * Fallback: return just current session info when sessions table isn't accessible
	 */
	private getCurrentSessionOnly(
		userId: string,
		currentSessionId?: string
	): UserSession[] {
		if (!currentSessionId) {
			return []
		}

		return [
			{
				id: currentSessionId,
				user_id: userId,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				user_agent: null,
				ip: null,
				browser: 'Current Browser',
				os: 'Unknown',
				device: 'desktop',
				is_current: true
			}
		]
	}

	/**
	 * Parse user agent string and format session data
	 */
	private formatSession(
		session: {
			id: string
			user_id: string
			created_at: string
			updated_at: string
			user_agent: string | null
			ip: string | null
		},
		currentSessionId?: string
	): UserSession {
		const parser = new UAParser(session.user_agent ?? undefined)
		const browser = parser.getBrowser()
		const os = parser.getOS()
		const device = parser.getDevice()

		// Format browser string
		const browserName = browser.name || 'Unknown Browser'
		const browserVersion = browser.version
			? ` ${browser.version.split('.')[0]}`
			: ''
		const browserString = `${browserName}${browserVersion}`

		// Format OS string
		const osName = os.name || 'Unknown OS'
		const osVersion = os.version || ''
		const osString = osVersion ? `${osName} ${osVersion}` : osName

		// Determine device type
		let deviceType = 'desktop'
		if (device.type === 'mobile') {
			deviceType = 'mobile'
		} else if (device.type === 'tablet') {
			deviceType = 'tablet'
		}

		return {
			id: session.id,
			user_id: session.user_id,
			created_at: session.created_at,
			updated_at: session.updated_at,
			user_agent: session.user_agent,
			ip: session.ip,
			browser: browserString,
			os: osString,
			device: deviceType,
			is_current: session.id === currentSessionId
		}
	}
}
