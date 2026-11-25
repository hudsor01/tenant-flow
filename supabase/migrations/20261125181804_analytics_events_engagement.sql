-- Engagement and attribution events (2026-11-24 SEO audit 3b: P14, C10, RS8,
-- M10, CT9, BL11, Appendix B). The five funnel steps stay first, and
-- get_marketing_funnel still reports only them; these ten describe what
-- visitors do between them.
--
-- The list is copied in supabase/functions/_shared/track-event-payload.ts and
-- src/lib/analytics/track.ts (with the click events in cta-attributes.ts);
-- supabase/functions/__tests__/track-event-payload.test.ts holds them equal.

alter table public.analytics_events
	drop constraint analytics_events_name_check;

alter table public.analytics_events
	add constraint analytics_events_name_check check (
		name in (
			'cta_start_free',
			'signup_started',
			'signup_completed',
			'checkout_started',
			'checkout_completed',
			'cta_contact',
			'compare_card_click',
			'resource_open',
			'support_email_click',
			'faq_open',
			'resource_print',
			'contact_submitted',
			'contact_failed',
			'newsletter_subscribed',
			'application_link_created'
		)
	);
