import { User } from '@prisma/client';

export interface AuthenticatedUser extends User {
  supabaseId: string;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

// Legacy interface for backwards compatibility
export interface LegacyAuthenticatedUser {
  userId: string;
  email: string;
  role?: string;
  appMetadata?: Record<string, unknown>;
  userMetadata?: Record<string, unknown>;
}
