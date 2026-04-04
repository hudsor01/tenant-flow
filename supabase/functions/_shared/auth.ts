// Shared auth validation for Supabase Edge Functions.
// Extracts Bearer token from Authorization header and validates via getUser().

import type { SupabaseClient, User } from '@supabase/supabase-js'

interface AuthResult {
  user: User
  token: string
}

interface AuthError {
  user: null
  token: null
  error: string
  status: 401
}

/**
 * Validate Bearer token from the Authorization header.
 * Returns the authenticated user or an error object.
 *
 * Usage:
 *   const auth = await validateBearerAuth(req, supabase)
 *   if ('error' in auth) {
 *     return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: getJsonHeaders(req) })
 *   }
 *   const { user } = auth
 */
export async function validateBearerAuth(
  req: Request,
  supabase: SupabaseClient,
): Promise<AuthResult | AuthError> {
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, token: null, error: 'Missing authorization header', status: 401 }
  }

  const token = authHeader.slice(7) // 'Bearer '.length === 7
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return { user: null, token: null, error: 'Not authenticated', status: 401 }
  }

  return { user, token }
}
