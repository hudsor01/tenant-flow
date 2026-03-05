// Auth Email Send — Supabase Auth Hook handler
//
// SETUP: Register this Edge Function as a Supabase Auth Hook:
//   Dashboard -> Authentication -> Hooks -> Send Email -> Enable
//   Set the hook to call this Edge Function URL.
//   Set SUPABASE_AUTH_HOOK_SECRET in Edge Function secrets.
//
// When configured, Supabase Auth sends a POST here instead of using
// its built-in email templates. We render branded HTML via Resend.

import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/resend.ts'
import {
  signupConfirmationEmail,
  passwordResetEmail,
  invitationEmail,
  magicLinkEmail,
  emailChangeEmail,
} from '../_shared/auth-email-templates.ts'

interface AuthEmailHookPayload {
  user: { email: string; user_metadata: Record<string, unknown> }
  email_data: {
    token: string
    token_hash: string
    redirect_to: string
    email_action_type: 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change'
  }
}

type EmailActionType = AuthEmailHookPayload['email_data']['email_action_type']

/** Map email_action_type to the OTP type parameter used in the callback URL. */
const OTP_TYPE_MAP: Record<EmailActionType, string> = {
  signup: 'signup',
  recovery: 'recovery',
  invite: 'invite',
  magiclink: 'magiclink',
  email_change: 'email_change',
}

Deno.serve(async (req: Request) => {
  const optionsResponse = handleCorsOptions(req)
  if (optionsResponse) return optionsResponse

  const corsHeaders = getCorsHeaders(req)
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: jsonHeaders },
    )
  }

  // Verify the request comes from Supabase via the hook secret
  const hookSecret = Deno.env.get('SUPABASE_AUTH_HOOK_SECRET')
  if (hookSecret) {
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (token !== hookSecret) {
      console.error('[AUTH_EMAIL] Unauthorized: invalid hook secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: jsonHeaders },
      )
    }
  }

  try {
    const payload = (await req.json()) as AuthEmailHookPayload
    const { user, email_data } = payload

    if (!user?.email || !email_data?.email_action_type) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload: missing user.email or email_data.email_action_type' }),
        { status: 400, headers: jsonHeaders },
      )
    }

    const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3050'
    const otpType = OTP_TYPE_MAP[email_data.email_action_type]
    const callbackUrl = `${appUrl}/auth/callback?token_hash=${encodeURIComponent(email_data.token_hash)}&type=${encodeURIComponent(otpType)}`

    let template: { subject: string; html: string }

    switch (email_data.email_action_type) {
      case 'signup':
        template = signupConfirmationEmail({
          confirmUrl: callbackUrl,
          email: user.email,
        })
        break

      case 'recovery':
        template = passwordResetEmail({
          resetUrl: callbackUrl,
          email: user.email,
        })
        break

      case 'invite':
        template = invitationEmail({
          inviteUrl: callbackUrl,
          email: user.email,
          inviterName: typeof user.user_metadata?.inviter_name === 'string'
            ? user.user_metadata.inviter_name
            : undefined,
        })
        break

      case 'magiclink':
        template = magicLinkEmail({
          magicLinkUrl: callbackUrl,
          email: user.email,
        })
        break

      case 'email_change':
        template = emailChangeEmail({
          confirmUrl: callbackUrl,
          email: user.email,
          newEmail: typeof user.user_metadata?.new_email === 'string'
            ? user.user_metadata.new_email
            : user.email,
        })
        break

      default: {
        const unknownType = email_data.email_action_type as string
        console.error(`[AUTH_EMAIL] Unknown email_action_type: ${unknownType}`)
        return new Response(
          JSON.stringify({ error: `Unsupported email action type: ${unknownType}` }),
          { status: 400, headers: jsonHeaders },
        )
      }
    }

    const result = await sendEmail({
      to: [user.email],
      subject: template.subject,
      html: template.html,
      tags: [
        { name: 'category', value: 'auth' },
        { name: 'type', value: email_data.email_action_type },
      ],
    })

    if (!result.success) {
      console.error(`[AUTH_EMAIL] Failed to send ${email_data.email_action_type} email to ${user.email}: ${result.error}`)
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { status: 500, headers: jsonHeaders },
      )
    }

    console.log(`[AUTH_EMAIL] Sent ${email_data.email_action_type} email to ${user.email} (id: ${result.id})`)
    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: jsonHeaders },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[AUTH_EMAIL] Unexpected error: ${message}`)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: jsonHeaders },
    )
  }
})
