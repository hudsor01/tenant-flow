/**
 * Supabase JWT Strategy - HS256 with JWT Secret
 *
 * Verifies JWT tokens using HS256 algorithm with SUPABASE_JWT_SECRET
 * Follows official NestJS + Supabase authentication patterns
 *
 * Authentication Flow:
 * 1. Frontend sends Authorization: Bearer <token> header
 * 2. Strategy verifies JWT signature using SUPABASE_JWT_SECRET
 * 3. Validates payload (issuer, audience, expiration)
 * 4. Ensures user exists in users table (creates if needed for OAuth)
 * 5. Returns authUser object for use in request handlers
 */

import { Injectable, Logger } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import type { SupabaseJwtPayload, authUser } from '@repo/shared/types/auth'
import { UtilityService } from '../services/utility.service'

import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  private readonly logger = new Logger(SupabaseStrategy.name)
  private readonly utilityService: UtilityService

  constructor(utilityService: UtilityService) {
    // Validate environment before super() - no 'this' access allowed
    const supabaseUrl = process.env.SUPABASE_URL
    const jwtSecret = process.env.SUPABASE_JWT_SECRET
    const extractors = [ExtractJwt.fromAuthHeaderAsBearerToken()]

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is required')
    }

    if (!jwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET environment variable is required')
    }

    // Use HS256 with JWT secret (current Supabase configuration)
    super({
      jwtFromRequest: ExtractJwt.fromExtractors(extractors),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      algorithms: ['HS256']
    })

    // NOW safe to assign to 'this' after super()
    this.utilityService = utilityService

    // HEADERS-ONLY AUTHENTICATION: Frontend and backend are on separate deployments (Vercel + Railway)
    // All API calls MUST use Authorization: Bearer <token> header - NO cookie support
    this.logger.log('SupabaseStrategy initialized with HS256 JWT secret verification - HEADERS ONLY (Authorization: Bearer)')
  }

  async validate(payload: SupabaseJwtPayload): Promise<authUser> {
    const userId = payload.sub ?? 'unknown'
    this.logger.debug('Validating JWT payload', {
      userId,
      issuer: payload.iss,
      audience: payload.aud,
      expiration: payload.exp ? new Date(payload.exp * 1000) : null
    })

    // Basic validation - Passport.js has already verified the JWT signature using HS256
    if (!payload.sub) {
      this.logger.error('JWT missing subject (sub) claim')
      throw new Error('Invalid token: missing user ID')
    }

    // Validate issuer matches Supabase project
    const supabaseUrl = process.env.SUPABASE_URL
    if (
      supabaseUrl &&
      payload.iss &&
      payload.iss !== `${supabaseUrl}/auth/v1`
    ) {
      this.logger.warn('JWT issuer mismatch', {
        issuer: payload.iss,
        expected: `${supabaseUrl}/auth/v1`
      })
      throw new Error('Invalid token issuer')
    }

    // Validate required timestamps exist
    if (!payload.exp || !payload.iat) {
      this.logger.warn('Token missing required timestamps', {
        hasExp: !!payload.exp,
        hasIat: !!payload.iat
      })
      throw new Error('Token missing expiration or issued-at timestamp')
    }

    if (!payload.email) {
      this.logger.warn('JWT missing email claim', { userId: payload.sub })
      throw new Error('Invalid token: missing email')
    }

    // Validate audience is authenticated
    const expectedAud = 'authenticated'
    const actualAud = Array.isArray(payload.aud)
      ? payload.aud[0]
      : (payload.aud ?? 'authenticated')
    if (actualAud !== expectedAud) {
      this.logger.warn('JWT audience mismatch', {
        expected: expectedAud,
        actual: actualAud
      })
      throw new Error('Invalid token audience')
    }

    // Ensure user exists in users table (creates if doesn't exist - e.g., OAuth sign-ins)
    // This is critical for RLS policies that reference users.id
    const userToEnsure: Parameters<typeof this.utilityService.ensureUserExists>[0] = {
      id: payload.sub,
      email: payload.email
    }

    if (payload.user_metadata) {
      userToEnsure.user_metadata = payload.user_metadata as {
        full_name?: string
        name?: string
        avatar_url?: string
        picture?: string
        [key: string]: unknown
      }
    }

    if (payload.app_metadata) {
      userToEnsure.app_metadata = payload.app_metadata
    }

    // ✅ CRITICAL FIX: Get users.id (not auth.uid()) for RLS policies
    // RLS policies reference users.id, so req.user.id must be users.id (not supabaseId)
    const internalUserId = await this.utilityService.ensureUserExists(userToEnsure)

    // Create user object from JWT payload
    const user: authUser = {
      id: internalUserId, // Use users.id for RLS compatibility
      aud: actualAud,
      email: payload.email,
      role: payload.app_metadata?.role ?? 'authenticated',
      // Use timestamps from JWT payload instead of hardcoded current time
      email_confirmed_at: payload.email_confirmed_at ?? '',
      confirmed_at: payload.confirmed_at ?? '',
      last_sign_in_at: payload.last_sign_in_at ?? '',
      app_metadata: payload.app_metadata ?? {},
      user_metadata: payload.user_metadata ?? {},
      identities: [],
      created_at: payload.created_at ?? new Date().toISOString(),
      updated_at: payload.updated_at ?? new Date().toISOString(),
      is_anonymous: false
    }

    // Sanitize logs: log only userId and role, never email
    this.logger.debug('User authenticated successfully', {
      userId: user.id,
      role: user.role
    })

    return user
  }
}
