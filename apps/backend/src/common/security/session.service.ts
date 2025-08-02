import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { SecurityUtils } from './security.utils'
import { SessionData, TokenPair } from '@tenantflow/shared'
import * as jwt from 'jsonwebtoken'

/**
 * Enhanced session management service with rotation and invalidation
 * Works alongside Supabase auth to provide additional security controls
 */
@Injectable()
export class SessionService {
    private readonly logger = new Logger(SessionService.name)
    private readonly ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000 // 15 minutes
    private readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days
    private readonly SESSION_ROTATION_THRESHOLD = 5 * 60 * 1000 // 5 minutes
    private readonly MAX_SESSIONS_PER_USER = 5

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
        private securityUtils: SecurityUtils
    ) {}

    /**
     * Create a new session with token rotation
     */
    async createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<TokenPair> {
        try {
            const sessionId = this.securityUtils.generateSecureToken(32)
            const refreshTokenId = this.securityUtils.generateSecureToken(32)
            const now = Date.now()
            
            // Clean up old sessions for this user (keep only latest sessions)
            await this.cleanupOldSessions(userId)
            
            const sessionData: SessionData = {
                userId,
                sessionId,
                issuedAt: now,
                expiresAt: now + this.REFRESH_TOKEN_EXPIRY,
                lastActivity: now,
                userAgent,
                ipAddress,
                refreshTokenId
            }

            // Store session in database
            await this.prisma.userSession.create({
                data: {
                    id: sessionId,
                    userId,
                    refreshTokenId,
                    expiresAt: new Date(sessionData.expiresAt),
                    lastActivity: new Date(sessionData.lastActivity),
                    userAgent: userAgent || null,
                    ipAddress: ipAddress || null,
                    isActive: true
                }
            })

            // Generate tokens
            const { accessToken, refreshToken } = this.generateTokenPair(sessionData)
            
            // Log session creation
            this.securityUtils.createSecurityAuditLog({
                type: 'AUTH_SUCCESS',
                userId,
                ip: ipAddress,
                userAgent,
                details: {
                    sessionId,
                    action: 'session_created'
                }
            })

            return {
                accessToken,
                refreshToken,
                expiresAt: now + this.ACCESS_TOKEN_EXPIRY
            }
        } catch (error) {
            this.logger.error('Failed to create session', error)
            throw error
        }
    }

    /**
     * Rotate tokens when session is still valid but approaching expiry
     */
    async rotateTokens(refreshToken: string, userAgent?: string, ipAddress?: string): Promise<TokenPair | null> {
        try {
            const sessionData = await this.validateRefreshToken(refreshToken)
            if (!sessionData) {
                return null
            }

            const now = Date.now()
            
            // Check if rotation is needed
            if (now - sessionData.lastActivity < this.SESSION_ROTATION_THRESHOLD) {
                // Too early to rotate, return existing valid tokens
                const { accessToken } = this.generateTokenPair(sessionData)
                return {
                    accessToken,
                    refreshToken, // Keep existing refresh token
                    expiresAt: now + this.ACCESS_TOKEN_EXPIRY
                }
            }

            // Generate new refresh token ID for security
            const newRefreshTokenId = this.securityUtils.generateSecureToken(32)
            
            // Update session with new refresh token ID and activity
            await this.prisma.userSession.update({
                where: { id: sessionData.sessionId },
                data: {
                    refreshTokenId: newRefreshTokenId,
                    lastActivity: new Date(now),
                    userAgent: userAgent || undefined,
                    ipAddress: ipAddress || undefined
                }
            })

            // Update session data
            sessionData.refreshTokenId = newRefreshTokenId
            sessionData.lastActivity = now

            // Generate new token pair
            const { accessToken, refreshToken: newRefreshToken } = this.generateTokenPair(sessionData)
            
            // Log token rotation
            this.securityUtils.createSecurityAuditLog({
                type: 'TOKEN_REFRESH',
                userId: sessionData.userId,
                ip: ipAddress,
                userAgent,
                details: {
                    sessionId: sessionData.sessionId,
                    action: 'tokens_rotated'
                }
            })

            return {
                accessToken,
                refreshToken: newRefreshToken,
                expiresAt: now + this.ACCESS_TOKEN_EXPIRY
            }
        } catch (error) {
            this.logger.error('Failed to rotate tokens', error)
            return null
        }
    }

    /**
     * Invalidate a specific session
     */
    async invalidateSession(sessionId: string, userId?: string): Promise<boolean> {
        try {
            const result = await this.prisma.userSession.updateMany({
                where: {
                    id: sessionId,
                    ...(userId && { userId }),
                    isActive: true
                },
                data: {
                    isActive: false,
                    invalidatedAt: new Date()
                }
            })

            if (result.count > 0) {
                this.securityUtils.createSecurityAuditLog({
                    type: 'SESSION_INVALIDATED',
                    userId,
                    details: {
                        sessionId,
                        action: 'session_invalidated'
                    }
                })
            }

            return result.count > 0
        } catch (error) {
            this.logger.error('Failed to invalidate session', error)
            return false
        }
    }

    /**
     * Invalidate all sessions for a user (e.g., on password change)
     */
    async invalidateAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
        try {
            const result = await this.prisma.userSession.updateMany({
                where: {
                    userId,
                    isActive: true,
                    ...(exceptSessionId && { NOT: { id: exceptSessionId } })
                },
                data: {
                    isActive: false,
                    invalidatedAt: new Date()
                }
            })

            this.securityUtils.createSecurityAuditLog({
                type: 'SESSION_INVALIDATED',
                userId,
                details: {
                    action: 'all_sessions_invalidated',
                    count: result.count,
                    exceptSessionId
                }
            })

            return result.count
        } catch (error) {
            this.logger.error('Failed to invalidate all user sessions', error)
            return 0
        }
    }

    /**
     * Validate access token and return session data
     */
    async validateAccessToken(token: string): Promise<SessionData | null> {
        try {
            const jwtSecret = this.configService.get<string>('JWT_SECRET')
            if (!jwtSecret) {
                throw new Error('JWT_SECRET not configured')
            }

            interface JwtPayload {
                sub: string
                sessionId: string
                iat: number
                exp: number
            }
            const decoded = jwt.verify(token, jwtSecret) as JwtPayload
            
            // Check if session is still active
            const session = await this.prisma.userSession.findFirst({
                where: {
                    id: decoded.sessionId,
                    userId: decoded.sub,
                    isActive: true,
                    expiresAt: { gt: new Date() }
                }
            })

            if (!session) {
                return null
            }

            return {
                userId: decoded.sub,
                sessionId: decoded.sessionId,
                issuedAt: decoded.iat * 1000,
                expiresAt: decoded.exp * 1000,
                lastActivity: session.lastActivity.getTime(),
                userAgent: session.userAgent || undefined,
                ipAddress: session.ipAddress || undefined,
                refreshTokenId: session.refreshTokenId
            }
        } catch (error) {
            this.logger.debug('Invalid access token', error)
            return null
        }
    }

    /**
     * Validate refresh token and return session data
     */
    private async validateRefreshToken(token: string): Promise<SessionData | null> {
        try {
            const jwtSecret = this.configService.get<string>('JWT_SECRET')
            if (!jwtSecret) {
                throw new Error('JWT_SECRET not configured')
            }

            interface RefreshTokenPayload {
                sub: string
                sessionId: string
                refreshTokenId: string
                iat: number
                exp: number
            }
            const decoded = jwt.verify(token, jwtSecret) as RefreshTokenPayload
            
            // Check if session is still active and refresh token ID matches
            const session = await this.prisma.userSession.findFirst({
                where: {
                    id: decoded.sessionId,
                    userId: decoded.sub,
                    refreshTokenId: decoded.refreshTokenId,
                    isActive: true,
                    expiresAt: { gt: new Date() }
                }
            })

            if (!session) {
                return null
            }

            return {
                userId: decoded.sub,
                sessionId: decoded.sessionId,
                issuedAt: decoded.iat * 1000,
                expiresAt: session.expiresAt.getTime(),
                lastActivity: session.lastActivity.getTime(),
                userAgent: session.userAgent || undefined,
                ipAddress: session.ipAddress || undefined,
                refreshTokenId: session.refreshTokenId
            }
        } catch (error) {
            this.logger.debug('Invalid refresh token', error)
            return null
        }
    }

    /**
     * Generate access and refresh token pair
     */
    private generateTokenPair(sessionData: SessionData): { accessToken: string; refreshToken: string } {
        const jwtSecret = this.configService.get<string>('JWT_SECRET')
        if (!jwtSecret) {
            throw new Error('JWT_SECRET not configured')
        }

        const now = Math.floor(Date.now() / 1000)

        // Access token (short-lived)
        const accessToken = jwt.sign(
            {
                sub: sessionData.userId,
                sessionId: sessionData.sessionId,
                type: 'access',
                iat: now,
                exp: now + Math.floor(this.ACCESS_TOKEN_EXPIRY / 1000)
            },
            jwtSecret,
            { algorithm: 'HS256' }
        )

        // Refresh token (long-lived)
        const refreshToken = jwt.sign(
            {
                sub: sessionData.userId,
                sessionId: sessionData.sessionId,
                refreshTokenId: sessionData.refreshTokenId,
                type: 'refresh',
                iat: now,
                exp: Math.floor(sessionData.expiresAt / 1000)
            },
            jwtSecret,
            { algorithm: 'HS256' }
        )

        return { accessToken, refreshToken }
    }

    /**
     * Clean up old sessions for a user
     */
    private async cleanupOldSessions(userId: string): Promise<void> {
        try {
            // Get all active sessions for user, ordered by last activity
            const sessions = await this.prisma.userSession.findMany({
                where: {
                    userId,
                    isActive: true
                },
                orderBy: {
                    lastActivity: 'desc'
                }
            })

            // If we have too many sessions, deactivate the oldest ones
            if (sessions.length >= this.MAX_SESSIONS_PER_USER) {
                const sessionsToDeactivate = sessions.slice(this.MAX_SESSIONS_PER_USER - 1)
                const sessionIds = sessionsToDeactivate.map(s => s.id)

                await this.prisma.userSession.updateMany({
                    where: {
                        id: { in: sessionIds }
                    },
                    data: {
                        isActive: false,
                        invalidatedAt: new Date()
                    }
                })

                this.logger.log(`Cleaned up ${sessionIds.length} old sessions for user ${userId}`)
            }

            // Also clean up expired sessions
            await this.prisma.userSession.updateMany({
                where: {
                    userId,
                    expiresAt: { lt: new Date() },
                    isActive: true
                },
                data: {
                    isActive: false,
                    invalidatedAt: new Date()
                }
            })
        } catch (error) {
            this.logger.error('Failed to cleanup old sessions', error)
        }
    }

    /**
     * Get active sessions for a user
     */
    async getUserSessions(userId: string): Promise<{
        id: string
        lastActivity: Date
        userAgent?: string | null
        ipAddress?: string | null
        isActive: boolean
    }[]> {
        try {
            return await this.prisma.userSession.findMany({
                where: {
                    userId,
                    isActive: true,
                    expiresAt: { gt: new Date() }
                },
                select: {
                    id: true,
                    lastActivity: true,
                    userAgent: true,
                    ipAddress: true,
                    isActive: true
                },
                orderBy: {
                    lastActivity: 'desc'
                }
            })
        } catch (error) {
            this.logger.error('Failed to get user sessions', error)
            return []
        }
    }
}