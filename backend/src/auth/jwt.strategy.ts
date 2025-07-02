import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.SUPABASE_JWT_SECRET || 'your-supabase-jwt-secret',
    });
  }

  validate(payload: {
    sub: string;
    email: string;
    role?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  }) {
    // Supabase JWT payload structure
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      appMetadata: payload.app_metadata,
      userMetadata: payload.user_metadata,
    };
  }
}
