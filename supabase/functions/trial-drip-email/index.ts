// Trial drip email Edge Function.
// Called daily by pg_cron to send onboarding emails to trial users.
// Schedule: Day 1 (welcome), Day 3 (rent collection), Day 7 (success story), Day 12 (trial ending).
// Uses service_role to query users -- not exposed to frontend.

import * as Sentry from '@sentry/deno'
import { validateEnv } from '../_shared/env.ts'
import { errorResponse, captureWebhookError, logEvent } from '../_shared/errors.ts'
import { createAdminClient } from '../_shared/supabase-client.ts'
import { sendEmail } from '../_shared/resend.ts'
import {
  day1WelcomeEmail,
  day3RentCollectionEmail,
  day7SuccessStoryEmail,
  day12TrialEndingEmail,
  DRIP_SCHEDULE,
} from '../_shared/drip-email-templates.ts'

Deno.serve(async (req: Request) => {
  const env = validateEnv({
    required: [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'RESEND_API_KEY',
    ],
    optional: ['SENTRY_DSN'],
  })

  Sentry.init({
    dsn: env.SENTRY_DSN ?? undefined,
    tracesSampleRate: 0.1,
  })

  // Only allow POST (from pg_cron or manual invocation)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Auth guard: only callable with service_role key (pg_cron or admin)
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabase = createAdminClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
    )

    const results: Array<{ day: number; sent: number; errors: number }> = []

    for (const schedule of DRIP_SCHEDULE) {
      let sent = 0
      let errors = 0

      // Find trial users who signed up exactly N days ago
      // and haven't been sent this drip email yet
      const { data: users, error: queryError } = await supabase
        .from('users')
        .select('id, email, full_name, created_at')
        .eq('is_admin', false)
        .is('deletion_requested_at', null)
        .gte(
          'created_at',
          new Date(
            Date.now() - schedule.day * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split('T')[0] + 'T00:00:00Z',
        )
        .lt(
          'created_at',
          new Date(
            Date.now() - (schedule.day - 1) * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split('T')[0] + 'T00:00:00Z',
        )
        .limit(500)

      if (queryError) {
        captureWebhookError(queryError, { message: '[DRIP] Failed to query users', day: schedule.day })
        errors++
        results.push({ day: schedule.day, sent, errors })
        continue
      }

      if (!users || users.length === 0) {
        results.push({ day: schedule.day, sent: 0, errors: 0 })
        continue
      }

      for (const user of users) {
        const firstName =
          user.full_name?.split(' ')[0] || 'there'

        let template: { subject: string; html: string }

        switch (schedule.templateKey) {
          case 'day1':
            template = day1WelcomeEmail({ firstName })
            break
          case 'day3':
            template = day3RentCollectionEmail({ firstName })
            break
          case 'day7':
            template = day7SuccessStoryEmail({ firstName })
            break
          case 'day12': {
            const trialEnd = new Date(
              new Date(user.created_at).getTime() +
                14 * 24 * 60 * 60 * 1000,
            )
            template = day12TrialEndingEmail({
              firstName,
              trialEndsAt: trialEnd.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              }),
            })
            break
          }
          default:
            continue
        }

        const result = await sendEmail({
          to: [user.email],
          subject: template.subject,
          html: template.html,
          tags: [
            { name: 'category', value: 'trial-drip' },
            { name: 'drip_day', value: String(schedule.day) },
          ],
          idempotencyKey: `drip-${user.id}-day${schedule.day}`,
        })

        if (result.success) {
          sent++
        } else {
          errors++
          captureWebhookError(new Error(result.error), { message: '[DRIP] Failed to send drip email', day: schedule.day, user_id: user.id })
        }
      }

      results.push({ day: schedule.day, sent, errors })
    }

    logEvent('[DRIP] Completed', { results })

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return errorResponse(req, 500, err, {
      function: 'trial-drip-email',
    })
  }
})
