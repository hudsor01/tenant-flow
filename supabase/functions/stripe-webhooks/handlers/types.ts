import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// The client createAdminClient() returns. ReturnType<typeof createClient> read
// the generic factory with its type parameters unresolved, so every table
// query on it was typed never.
export type SupabaseAdmin = SupabaseClient;

export type WebhookHandler = (
	supabase: SupabaseAdmin,
	stripe: Stripe,
	event: Stripe.Event,
) => Promise<void>;
