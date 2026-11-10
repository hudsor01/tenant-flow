/**
 * The n8n-blog-ingest Edge Function's banlist (gate 8), as a pure function.
 *
 * Kept in step with the two other copies of the gate:
 *   - scripts/generate-blog-draft.ts (BANLIST, PERSONA_BANLIST, BANLIST_FIELDS)
 *   - the validate_blog_post trigger (v_banlist, v_persona_banlist,
 *     v_banlist_fields), whose live body is
 *     supabase/migrations/20261110123128_blog_banlist_persona_and_fields.sql
 * src/lib/seo/__tests__/banlist-parity.test.ts fails when the phrases, the
 * persona words, the fields or the persona pattern of the three drift, or when
 * the pattern stops meaning persona-consistency.spec.ts's /property owners?\b/i.
 *
 * THIS MODULE HAS NO IMPORT AND REFERENCES NO RUNTIME GLOBAL (no Deno
 * namespace), so supabase/functions/__tests__/blog-banlist.test.ts imports it
 * from Vitest and tests the gate the function runs. Do not add an import.
 */

/**
 * Phrases banned in a post, matched as a substring with case ignored (so
 * "unpaid rent" carries "paid rent"). The blog gate's own list, not a copy of
 * the marketing-copy-landlord-only test's: it bans "tenant portal" and "rent
 * tracking", which that test allows. banlist-parity.test.ts holds it to the
 * generator's and the trigger's copies (above).
 */
export const BLOG_BANLIST = [
	"rent collection",
	"online rent",
	"autopay",
	"auto-pay",
	"tenant portal",
	"automated rent",
	"collect rent",
	"rent processing",
	"pay rent online",
	"online payments",
	"online rent payment",
	"rent collection software",
	"tenants can pay",
	"pay rent through",
	"automated workflow",
	"rent tracking",
	"mobile app access",
	"record rent",
	"paid rent",
	"pay rent",
] as const;

/**
 * Persona words banned in a post, each as persona-consistency.spec.ts bans
 * "property owner" on every public page: /property owners?\b/i. A word matches
 * with case ignored, an optional plural "s", then a word end (the end of the
 * text or a character other than an ASCII letter, digit or underscore:
 * JavaScript's \b without the u flag), and with no word start required
 * ("single-property owner" and "multiproperty owners" match; "property
 * ownership" and "property owner_id" do not). A substring test would match
 * "ownership", so these are patterns, not phrases. Entries are lowercase
 * letters and spaces only, so each is a literal in its pattern.
 */
export const BLOG_PERSONA_BANLIST = ["property owner"] as const;

/**
 * The fields the banlist checks, in the order it checks them. /blog renders
 * the title and the excerpt of every post, so a phrase in either is as public
 * as one in the content.
 */
export const BLOG_BANLIST_FIELDS = ["title", "excerpt", "content"] as const;

export type BlogBanlistField = (typeof BLOG_BANLIST_FIELDS)[number];

/** The pattern a persona word is matched by (see BLOG_PERSONA_BANLIST). */
export function personaWordPattern(word: string): RegExp {
	return new RegExp(`${word}s?\\b`, "i");
}

export interface BlogBanlistHit {
	/** The banned phrase or persona word, as listed. */
	readonly phrase: string;
	readonly field: BlogBanlistField;
	readonly kind: "phrase" | "persona";
}

/**
 * The first banned phrase or persona word in a post, or null when it has none.
 * Each field in BLOG_BANLIST_FIELDS order; in each, the phrases in list order,
 * then the persona words, as the trigger checks them. A missing field is empty.
 */
export function findBlogBanlistHit(
	post: Readonly<Partial<Record<BlogBanlistField, string | null>>>,
): BlogBanlistHit | null {
	for (const field of BLOG_BANLIST_FIELDS) {
		const text = post[field] ?? "";
		const lower = text.toLowerCase();
		for (const phrase of BLOG_BANLIST) {
			if (lower.includes(phrase)) return { phrase, field, kind: "phrase" };
		}
		for (const word of BLOG_PERSONA_BANLIST) {
			if (personaWordPattern(word).test(text)) {
				return { phrase: word, field, kind: "persona" };
			}
		}
	}
	return null;
}
