import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export type SupabaseAdmin = ReturnType<typeof createClient>

export type WebhookHandler = (
  supabase: SupabaseAdmin,
  stripe: Stripe,
  event: Stripe.Event,
) => Promise<void>
