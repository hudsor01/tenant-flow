import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export type SupabaseAdmin = ReturnType<typeof createClient>;

export type WebhookHandler = (
	supabase: SupabaseAdmin,
	stripe: Stripe,
	event: Stripe.Event,
) => Promise<void>;
