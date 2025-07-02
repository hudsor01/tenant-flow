// This file has been deprecated in favor of the hybrid Supabase auth strategy
// Located at: src/auth/jwt.strategy.ts
// 
// The hybrid auth approach uses Supabase for authentication and token validation
// while maintaining local user data in Prisma for business logic.
//
// This file is kept for reference but should not be used in the current implementation.

export const DEPRECATED_JWT_STRATEGY_NOTE = `
This JWT strategy has been replaced with a hybrid Supabase authentication approach.
Please use src/auth/jwt.strategy.ts for the current implementation.
`;