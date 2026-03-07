import Stripe from 'stripe'
import type { SupabaseAdmin } from './types.ts'

/**
 * Handle account.updated event (Stripe Connect).
 * Updates onboarding status, charges/payouts enabled, requirements.
 * Notifies owner when charges_enabled flips to true.
 */
export async function handleAccountUpdated(
  supabase: SupabaseAdmin,
  _stripe: Stripe,
  event: Stripe.Event,
): Promise<void> {
  const account = event.data.object as Stripe.Account

  // Fetch previous state to detect charges_enabled flip and preserve onboarding_completed_at
  const { data: existing } = await supabase
    .from('stripe_connected_accounts')
    .select('charges_enabled, user_id, onboarding_completed_at')
    .eq('stripe_account_id', account.id)
    .single()

  // Determine onboarding status based on Stripe account state
  let onboardingStatus: 'not_started' | 'in_progress' | 'completed' = 'in_progress'
  if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
    onboardingStatus = 'completed'
  } else if (!account.details_submitted) {
    onboardingStatus = 'not_started'
  }

  const requirementsDue = [
    ...(account.requirements?.currently_due ?? []),
    ...(account.requirements?.past_due ?? []),
    ...(account.requirements?.eventually_due ?? []),
  ]

  // PAY-11: Only set onboarding_completed_at when (a) status is completed,
  // (b) charges_enabled is true, AND (c) it is not already set.
  // Once set, never overwrite — preserves the original onboarding date.
  const existingCompletedAt = existing?.onboarding_completed_at as string | null
  const shouldSetCompletedAt = onboardingStatus === 'completed'
    && account.charges_enabled
    && !existingCompletedAt

  const updatePayload: Record<string, unknown> = {
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    requirements_due: requirementsDue,
    onboarding_status: onboardingStatus,
    updated_at: new Date().toISOString(),
  }

  if (shouldSetCompletedAt) {
    updatePayload.onboarding_completed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('stripe_connected_accounts')
    .update(updatePayload)
    .eq('stripe_account_id', account.id)
  if (error) throw error

  // Notify owner only when charges_enabled flips to true
  if (!existing?.charges_enabled && account.charges_enabled && existing?.user_id) {
    await supabase.from('notifications').insert({
      user_id: existing.user_id,
      title: 'Stripe account verified',
      message: 'Your Stripe account has been fully verified — you can now receive rent payments.',
      notification_type: 'system',
    }).then(({ error: notifError }) => {
      if (notifError) console.error('Failed to create notification:', notifError.message)
    })
  }
}
