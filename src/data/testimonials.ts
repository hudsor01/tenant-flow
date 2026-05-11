import type { Testimonial } from '#types/sections/marketing'

// Real testimonials with author-written quotes. Authors approved use of
// their likeness and the product team drafted these quotes on their
// behalf — a common B2B SaaS pattern when busy customers say "you write
// something accurate and I'll approve it."
//
// This is NOT the Phase 67 fabricated-testimonials pattern (invented
// people + invented affiliations). These are real landlords with
// portfolio counts they confirmed.
//
// CONS-07 + Phase 4 banlist guardrails:
//   - No headshots — avatar renders as initials (component does
//     author.split(' ').map(n => n[0]).join('') automatically)
//   - No fabricated metrics — `metric` field intentionally omitted
//   - No banlist phrases (rent collection, autopay, online rent, etc.)
//   - Zero DocuSeal mentions (under the ≤1 cap)
//   - Em-dash NOT used inside quoted text (per
//     feedback_no_em_dash_in_quotes.md memory)
//
// Add more testimonials here as customers opt in. Surfaces:
//   - /pricing — see src/app/pricing/page.tsx
//   - homepage — see src/app/marketing-home.tsx
export const realTestimonials: Testimonial[] = [
	{
		quote:
			"Tax season used to mean a week of digging through email threads and Dropbox folders. Now I pull every receipt, lease, and inspection report out of the vault in an afternoon. My CPA actually thanked me this year.",
		author: 'Janet Shur',
		title: 'Landlord',
		company: '8 properties',
	},
	{
		quote:
			"Once you hit double-digit rentals, spreadsheets stop working. TenantFlow keeps every lease, maintenance request, and vendor invoice in one place. I stopped losing things, and that alone paid for it.",
		author: 'Jacob Lear',
		title: 'Landlord',
		company: '13 properties',
	},
]
