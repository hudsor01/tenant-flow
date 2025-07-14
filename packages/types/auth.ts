// File: packages/types/auth.ts
// Purpose: Shared authentication types for frontend and backend.

export interface SupabaseJwtPayload {
    sub: string; // Supabase user ID
    // Add other JWT claims as needed
}

export interface AuthResponse {
    user: {
        // Define user fields as needed
    };
    // Add other response fields as needed
}
