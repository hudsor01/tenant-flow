export interface AuthenticatedUser {
  userId: string;
  email: string;
  role?: string;
  appMetadata?: Record<string, unknown>;
  userMetadata?: Record<string, unknown>;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
