/**
 * Supabase JWT Strategy - 2025 Best Practices
 *
 * Follows official NestJS + Supabase authentication patterns
 * Uses Passport JWT strategy with Supabase JWT verification
 */

import { Injectable, Logger } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { createClient } from '@supabase/supabase-js'
import type { JwtPayload, authUser } from '@repo/shared/types/auth'

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  private readonly logger = new Logger(SupabaseStrategy.name)
  private readonly supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.SUPABASE_JWT_SECRET!,
      algorithms: ['HS256']
    })
  }

  async validate(payload: JwtPayload): Promise<authUser> {
    this.logger.debug('Validating JWT payload', {
      userId: payload.sub,
      email: payload.email
    })

    // Verify the token is from our Supabase instance
    const supabaseUrl = process.env.SUPABASE_URL
    const iss = (payload as { iss?: string }).iss
    if (supabaseUrl && iss !== `${supabaseUrl}/auth/v1`) {
      this.logger.warn('JWT issuer mismatch', { issuer: iss })
      throw new Error('Invalid token issuer')
    }

    // Create full Supabase User object from JWT payload
    const payloadWithMetadata = payload as { aud?: string; role?: string; email?: string; user_metadata?: Record<string, unknown> }
    const user: authUser = {
      id: payload.sub,
      aud: payloadWithMetadata.aud,
      role: payloadWithMetadata.role,
      email: payloadWithMetadata.email,
      email_confirmed_at: new Date().toISOString(),
      phone: undefined,
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: payloadWithMetadata.user_metadata || {},
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_anonymous: false
    }

    this.logger.debug('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      role: user.role
    })

    return user
  }
}
