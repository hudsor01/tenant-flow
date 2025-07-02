// Hybrid Supabase Auth Types
// Using Prisma-generated types where possible

// Import and re-export UserRole from Prisma generated types
import { UserRole } from '@prisma/client';
export { UserRole };

// Supabase JWT payload structure
export interface SupabaseJwtPayload {
  sub: string; // Supabase user ID
  email: string;
  email_confirmed_at?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
  };
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  iat?: number;
  exp?: number;
  aud?: string;
  iss?: string;
}

// Legacy interface for backwards compatibility
// TODO: Remove once all references are updated
export interface JwtPayload {
  sub: string;
  email: string;
  role?: UserRole;
  iat?: number;
  exp?: number;
}

// Auth response for API endpoints
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    role: UserRole;
  };
  message: string;
}