# Phase 45 Research — Marketing Content Truthfulness
_Fix-approach research + will-fix validation for CONTENT-01..24. Source: .planning/audits/2026-07-11-full-audit.md_

## CONTENT-01 — Pricing table "Team members" row for nonexistent feature
- **Finding:** src/components/pricing/pricing-comparison-table.tsx:45 (high) — Feature matrix on /pricing advertises "Team members: 1 / 3 / Unlimited" but no team/seat/invite capability exists anywhere in the product.
- **Root cause:** The static `comparisonData` array was authored from an aspirational plan sheet, not from shipped capabilities. The data model is strictly single-owner (`owner_user_id = auth.uid()` on every table; no membership/seat/invitation table in `src/types/supabase.ts` or any migration), so the row can never be true.
- **Fix:** Delete the `{ name: "Team members", starter: "1", growth: "3", max: "Unlimited" }` row (line 45) from the "Property Management" category. This is one leg of the **class-wide team-claims sweep** (with CONTENT-02, -06, -07, -10, -12 and the unlisted siblings in `pricing-content.tsx:105/:172` and `(owner)/maintenance/[id]/edit/page.tsx:67`) — plan it as ONE task. Add regression-guard banlist entries (see Cross-cutting notes) so the class cannot re-enter.
- **Why it fixes it:** The verifier evidence is that the row renders a paid-tier differentiator for a capability with zero product surface; removing the row makes the matrix state only shipped features. The remaining 4 rows in the category (Properties/Units/Tenant records/Lease management) are all verified-true.
- **Risks / interactions:** None functional — pure static-array edit in a client component. Phase 44 (PUBUX) executes immediately before and may touch /pricing surfaces; re-verify line numbers at plan time. Phase 46 (MKTUI) restyles marketing UI afterward and rebases on this copy.
- **Files touched:** src/components/pricing/pricing-comparison-table.tsx
- **Decision:** Remove the claim (chosen — zero blast radius, truth restored immediately) vs. ship a real team/seat feature (rejected: multi-user requires a membership table, invite flow, RLS redesign of every `owner_user_id` policy — a full milestone, not a truthfulness fix). If teams ever ship, re-add the row from real config.

## CONTENT-02 — Growth "Team (3 users)" feature + fictitious `limits.users`
- **Finding:** src/config/pricing.ts:163 (high) — Growth plan sells "Team (3 users)" (and every plan carries `limits.users` 1/3/unlimited) with no multi-user capability anywhere; renders on /pricing bento cards and in-app /billing/plans.
- **Root cause:** `PRICING_PLANS` models a seats concept (`limits.users`, `limits.apiCalls`) that the product never built; the feature string was derived from that fictional config field.
- **Fix:** In `src/config/pricing.ts`: (1) remove `"Team (3 users)"` from `GROWTH.features` (line 163); (2) remove the `users` and `apiCalls` keys from `PricingConfig["limits"]`, from all four `PRICING_PLANS` limit objects, from `UsageMetrics`, and delete the two corresponding branches in `checkPlanLimits()`. Grep-verified: the only external `limits` consumer is `billing-settings.tsx:331` which reads `limits.units` — unaffected. `checkPlanLimits`/`getRecommendedUpgrade`/`UsageMetrics` have zero consumers outside `pricing.ts` itself.
- **Why it fixes it:** Verifier evidence shows the string renders via `getAllPricingPlans()` on both /pricing (`bento-pricing-section.tsx` maps `plan.features` straight into cards) and /billing/plans (`toBillingPlan` maps features 1:1). Removing the string removes the claim from both surfaces at the single source of truth; removing the config fields removes the root-cause data model for the fiction.
- **Risks / interactions:** `src/config/__tests__/pricing.test.ts` only asserts `calculateAnnualSavings` — no test asserts on users/apiCalls (verified). No pricing __tests__ assert team strings (verified). TypeScript strict mode will surface any missed consumer at `bun run typecheck`.
- **Files touched:** src/config/pricing.ts
- **Decision:** Remove `users` + `apiCalls` from the limits model entirely (chosen — dead fields encoding nonexistent capabilities; zero external consumers) vs. keep the fields with `users: 1` on all plans (rejected: leaves a fictional `apiCalls` quota and a seats concept in the type for future copy to re-derive from). If the planner prefers minimal diff, the alternative is safe but defers the cleanup to Phase 51 (HYG).

## CONTENT-03 — Max plan "API access" claim
- **Finding:** src/config/pricing.ts:197 (high) — Max features list "API access" and the description (line 174) says "unlimited scale and API access"; no API-key issuance/developer surface exists.
- **Root cause:** Same aspirational-config class as CONTENT-02: the Max tier copy was written for a roadmap product. `src/app/api` contains only the /og renderer; `(owner)/settings` contains only billing.
- **Fix:** In `src/config/pricing.ts`: (1) delete `"API access"` from `TENANTFLOW_MAX.features` (line 197); (2) change the description (line 174) to `"For landlords with 21+ rentals — unlimited properties, units, and e-signs"`. This is one leg of the **class-wide API-claims sweep** with CONTENT-20 (faqs.ts:58/:78) — one task.
- **Why it fixes it:** Verifier evidence traces the render path (plan.features.map in pricing-card-standard/featured on /pricing; `getAllPricingPlans()` on /billing/plans); removing the string at the config source clears every render. The replacement description states only verified limits (`properties: -1`, `units: -1`, unlimited e-signs per tier-gate).
- **Risks / interactions:** None; static string. Coordinate with CONTENT-02's edits in the same file (single task or sequential tasks in one plan).
- **Files touched:** src/config/pricing.ts
- **Decision:** Remove the claim (chosen) vs. ship API access (rejected: API-key issuance, scoping, docs, and rate limiting are a milestone-scale feature; nothing in v9.0 scope builds it).

## CONTENT-04 — Buildium card promises "a better tenant experience"
- **Finding:** src/app/compare/[competitor]/compare-data.ts:25 (medium) — Buildium `description` promises "a better tenant experience" from a landlord-only product with zero tenant-facing surface; renders on /compare index cards.
- **Root cause:** Stale pre-pivot copy. The product pivoted to landlord-only (CLAUDE.md: "tenants are records, not users"; homepage markets "Skip the tenant portal") but this competitor blurb was never re-audited.
- **Fix:** Rewrite `buildium.description` to: `"See why landlords are switching from Buildium to TenantFlow for lower costs, modern features, and transparent pricing."` ("Transparent Pricing" is affirmed `yes` for TenantFlow in the same object's feature table, so the replacement is self-consistent.)
- **Why it fixes it:** The verifier's contradiction is that the copy promises a tenant experience the product cannot deliver and that the site's own brand wedge markets the opposite; the new copy claims only landlord-side attributes verified by the page's own feature rows.
- **Risks / interactions:** Renders at `compare/page.tsx:67` (line-clamped card) — no layout risk. `compare-neutral-framing.test.tsx` pins only the 4 `tenantflow:"na"` rows — untouched.
- **Files touched:** src/app/compare/[competitor]/compare-data.ts

## CONTENT-05 — Buildium metaDescription "same features at half the price"
- **Finding:** src/app/compare/[competitor]/compare-data.ts:27 (medium) — Meta/OG/Twitter description for /compare/buildium claims "the same features at half the price", contradicted by the page's own feature table (Background Checks no, ACH na, HOA na) and price ratios (~1/3, ~1/4).
- **Root cause:** Unhedged marketing shorthand in the meta string while the visible `heroSubtitle` already uses the honest hedge ("same core features"). The meta copy was never held to the page's own data.
- **Fix:** Rewrite `buildium.metaDescription` to: `"Looking for a Buildium alternative? TenantFlow starts at $19/mo vs Buildium's $58/mo, covering the core landlord features. Compare pricing and features."` (~150 chars, within meta limits; "core landlord features" matches the heroSubtitle hedge; the price pairing quotes the actual entry tiers instead of a false ratio).
- **Why it fixes it:** Both defects the verifier proved — the "same features" falsity and the "half the price" arithmetic — are removed; every remaining number ($19, $58) matches `TENANTFLOW_PRICING` and `competitorPricing` in the same file.
- **Risks / interactions:** This string feeds `page.tsx:50/54/70` (meta + OG + Twitter) — an SEO surface. Phase 48 (SEO) runs later and rebases on this; note the change in the phase handoff so 48 doesn't "restore" punchier copy.
- **Files touched:** src/app/compare/[competitor]/compare-data.ts

## CONTENT-06 — RentRedi table claims "Team Collaboration: yes — 3 users on Growth"
- **Finding:** src/app/compare/[competitor]/compare-data.ts:332 (medium) — Feature row affirms TenantFlow ships team collaboration (3 users on Growth) vs RentRedi's unlimited; no membership capability exists.
- **Root cause:** Same team-claims class as CONTENT-01/02 — the row was authored from the fictional `limits.users: 3` config value.
- **Fix:** Part of the class-wide team-claims sweep. Change the row (lines 331-337) to `tenantflow: "no"`, `tenantflowNote: "Single-owner accounts"`, keeping `competitor: "yes"` / `competitorNote: "Unlimited team members"` (a claim about RentRedi, which is legitimate).
- **Why it fixes it:** The cell now matches the verified single-owner data model (every table scoped by `owner_user_id`; a second user could never see an owner's data per the verifier's RLS evidence) and honestly concedes the competitor's strength.
- **Risks / interactions:** `compare-neutral-framing.test.tsx` pins exactly 4 `"na"` rows in compare-data — using `"no"` (not `"na"`) preserves the count. Renders a red X via `FeatureIcon`; that is the correct honest rendering.
- **Files touched:** src/app/compare/[competitor]/compare-data.ts

## CONTENT-07 — Help page instructs "Invite team members"
- **Finding:** src/app/help/page.tsx:169 (medium) — "Manage your team and billing" resource card tells users to "Invite team members…", an operation with no product surface.
- **Root cause:** Team-claims class: help copy written against the same fictional seats feature.
- **Fix:** Part of the class-wide team-claims sweep. Change the card (lines 167-169): title → `"Manage billing and your account"`, description → `"Switch plans, update payment methods, and export account data"`. The other three claims in the description (plans/payment/export) are real (billing settings + GDPR export exist).
- **Why it fixes it:** The verifier proved a user following this topic cannot perform the invite action ((owner)/settings contains only billing; the only "invite" hits are the OTP allowlist and the lease wizard's tenant-record inviteMode). The rewritten card describes only operations the product supports.
- **Risks / interactions:** help/page.tsx is in `MARKETING_FILES` for the banlist test — the new copy contains no banned phrases. Same file also changes for CONTENT-23; combine into one edit pass.
- **Files touched:** src/app/help/page.tsx

## CONTENT-08 — Pricing FAQ claims ACH transfers are accepted
- **Finding:** src/app/pricing/pricing-content.tsx:42 (medium) — FAQ answer says "We accept all major credit cards, debit cards, and ACH transfers" but `stripe-checkout/index.ts:120` pins `payment_method_types: ["card"]`; the claim also lands in /pricing FAQPage JSON-LD.
- **Root cause:** FAQ copy asserts a payment method the sole checkout path never offers (verified: no `us_bank_account` or `automatic_payment_methods` anywhere in the repo).
- **Fix:** Change the answer (lines 41-42) to: `"We accept all major credit and debit cards. Payments are processed securely through Stripe."` No Edge Function change.
- **Why it fixes it:** The copy now matches the hardcoded `["card"]` capability exactly; because `pricingFaqs` is the export that feeds `createFaqJsonLd` in `pricing/page.tsx:37`, the JSON-LD rich-result claim is corrected by the same edit.
- **Risks / interactions:** /pricing uses ISR (`revalidate = 3600`) — JSON-LD refreshes within an hour of deploy. Phase 36 (BILL) already executed and did not enable ACH; if a future phase enables `us_bank_account` in checkout, this answer must be updated in the same PR.
- **Files touched:** src/app/pricing/pricing-content.tsx
- **Decision:** Fix the copy (chosen — root cause is the claim exceeding shipped capability; card-only is a deliberate checkout configuration) vs. enable `us_bank_account`/`automatic_payment_methods` in `supabase/functions/stripe-checkout` (rejected here: a billing-behavior change with Stripe settlement/dispute implications belongs to a billing phase decision, not a content-truthfulness fix; also requires an owner-run edge-fn deploy due to CLI-401).

## CONTENT-09 — Pricing CTA "14-day trial, all features … e-sign leases" false for Starter trials
- **Finding:** src/app/pricing/pricing-content.tsx:190 (medium) — CTA bullet below all three plan cards promises e-signing in the trial, but `checkTierEntitlement` + `GROWTH_AND_MAX_PLANS` 402-gate e-sign for trialing Starter users ("trialing" passes the status check but Starter's plan fails the entitlement check, tier-gate.ts:84).
- **Root cause:** Trial-scope class (with CONTENT-15 and CONTENT-18): copy treats "trial" as feature-unlimited when the trial is a 14-day trial of the selected plan (`trial_period_days: 14` on the chosen price in stripe-checkout).
- **Fix:** Change the bullet (lines 189-192): title → `"14-day free trial"`, desc → `"Add properties, upload documents, and generate leases — e-sign included on Growth and Max. Keep everything when you subscribe."` This mirrors the site's existing honest siblings (`premium-cta.tsx:44-45` "lease e-sign on Growth and Max"; Starter feature string "Lease templates (e-sign on Growth and Max)").
- **Why it fixes it:** The verifier's failure path (Starter-trial visitor 402-blocked from e-sign despite the promise) is eliminated because the copy now scopes e-sign to the exact plans the tier gate entitles.
- **Risks / interactions:** Same file as CONTENT-08 and the CONTENT-10 sibling — one edit pass. No test asserts this string.
- **Files touched:** src/app/pricing/pricing-content.tsx

## CONTENT-10 — Resources page advertises "team billing" setup guides
- **Finding:** src/app/resources/page.tsx:32 (medium) — Help Center card promises "Setup guides for the document vault, leases, maintenance, and team billing"; no team billing exists.
- **Root cause:** Team-claims class echo, plus two same-class siblings in pricing-content.tsx (line 105 "how access works for your team", line 172 "add teammates and integrations").
- **Fix:** Part of the class-wide team-claims sweep: (1) resources/page.tsx:32 → `"Setup guides for the document vault, leases, maintenance, and billing."`; (2) pricing-content.tsx:105 → `"Details on trials, billing, and switching plans. Tenants are records, not users — they never log in."`; (3) pricing-content.tsx:172 → `"Start with the records and document vault built for self-managing owners, then move up for more e-sign volume and storage as your portfolio grows."` (drops both "teammates" and "integrations" — the latter also leans on the nonexistent Max API per the site's own FAQ).
- **Why it fixes it:** Each rewritten sentence references only shipped capabilities (billing settings, e-sign volume tiers, storage tiers); the verifier's cross-reference chain (resources → help "Invite team members") is broken at both ends together with CONTENT-07.
- **Risks / interactions:** None functional. Keep copy free of banlist phrases.
- **Files touched:** src/app/resources/page.tsx, src/app/pricing/pricing-content.tsx

## CONTENT-11 — Blog newsletter signup promises undelivered guide + "Check your inbox"
- **Finding:** src/components/blog/newsletter-signup.tsx:61 (medium) — Heading "Get the landlord operations guide" + toast "Subscribed! Check your inbox." (line 30), but `newsletter-subscribe` only creates a Resend contact — no email is ever sent, no guide asset exists.
- **Root cause:** Newsletter class (with CONTENT-13): the copy promises a lead magnet and a confirmation email that the Edge Function (verified: only `/segments` + `/contacts` POSTs, zero `/emails` calls) never delivers.
- **Fix:** One class-wide copy fix across both surfaces. In newsletter-signup.tsx: heading (line 61) → `"Landlord tips in your inbox"`; toast (line 30) → `"You're on the list."` The supporting paragraph ("Monthly tips on leases, maintenance, and tax season…") is honest about intent and stays.
- **Why it fixes it:** The two false promises the verifier proved (a guide that doesn't exist; an inbox email that never arrives) are both removed; the surface now promises only list membership, which the function actually performs.
- **Risks / interactions:** None functional. If a real lead magnet ships later, restore the guide copy in the same PR that adds the Resend send.
- **Files touched:** src/components/blog/newsletter-signup.tsx
- **Decision:** Honest copy (chosen — zero backend work, immediately truthful) vs. ship the lead magnet (author a real PDF guide + add a Resend `/emails` welcome send to `newsletter-subscribe`) (rejected for this phase: content authoring + an edge-fn change requiring owner-run deploy (CLI-401); capture as a backlog idea if the lead magnet is wanted).

## CONTENT-12 — Features page claims higher tiers unlock "team-member seats"
- **Finding:** src/components/landing/results-proof-section.tsx:48 (medium) — "Higher tiers unlock more e-sign volume, more storage, and team-member seats" on the public /features page; seats don't exist.
- **Root cause:** Team-claims class echo — the e-sign and storage clauses track real config; the seats clause tracks the fictional `limits.users`.
- **Fix:** Part of the class-wide team-claims sweep: change lines 47-48 to `"Every plan starts with the document vault. Higher tiers unlock more e-sign volume and more storage."`
- **Why it fixes it:** The two remaining clauses are verified-true (e-sign 0/25/unlimited and storage 10/50/unlimited per pricing config + tier gate); the false clause is removed.
- **Risks / interactions:** Renders via `features-client.tsx:64` — same file changes for CONTENT-16; note ordering within the phase plan.
- **Files touched:** src/components/landing/results-proof-section.tsx

## CONTENT-13 — Lead-capture modal promises guide + "Check your inbox"
- **Finding:** src/components/marketing/lead-capture-modal.tsx:133 (medium) — Title "Get the landlord operations guide" (133), CTA "Send me the guide" (160), toast "Subscribed! Check your inbox." (104); no guide, no email ever sent.
- **Root cause:** Newsletter class (see CONTENT-11) — same Edge Function, same false promises, plus a CTA that promises a send action.
- **Fix:** Same class-wide task as CONTENT-11: title (line 133) → `"Landlord tips in your inbox"`; DialogDescription stays (honest); CTA (line 160) → `"Subscribe"` (pending state "Subscribing…" stays); toast (line 104) → `"You're on the list."`
- **Why it fixes it:** All three verified false promises (guide title, send-CTA, inbox toast) are replaced with claims matching the function's actual behavior (contact + segment creation only).
- **Risks / interactions:** Modal is env-gated (`NEXT_PUBLIC_LEAD_CAPTURE_MODAL=on`) and mounted on /pricing — no functional change. Keep both surfaces' copy identical strings so a future grep finds the pair.
- **Files touched:** src/components/marketing/lead-capture-modal.tsx
- **Decision:** Same as CONTENT-11 (honest copy chosen; shipping a real guide + welcome email rejected for this phase).

## CONTENT-14 — Comparison table "Custom lease clauses" Max column
- **Finding:** src/components/pricing/pricing-comparison-table.tsx:96 (medium) — Feature matrix marks "Custom lease clauses" ✗/✗/✓ as a Max differentiator, but no tier can author a custom clause (`lease-template-builder.client.tsx:127` hardcodes `const customClauses: CustomClause[] = []` with no setter/input UI).
- **Root cause:** Custom-clauses class (with CONTENT-19): marketing was written for a clause-authoring feature whose UI never shipped for leases (`ClausesEditor` is wired only to rental-application/tenant-notice/property-inspection templates).
- **Fix:** Class-wide with CONTENT-19: delete the "Custom lease clauses" row (lines 95-100) from the "Leases" category. No change needed in `lease-template-builder.client.tsx` — `renderCustomClauses` safely handles the empty array; the plumbing is inert, not user-facing.
- **Why it fixes it:** The verifier proved the capability is unreachable for every subscriber on every tier; removing the row (and the CONTENT-19 feature string) removes every surface that sells it.
- **Risks / interactions:** Same file as CONTENT-01 — one edit pass. "Leases" category keeps 2 true rows (E-sign, Renewal reminders).
- **Files touched:** src/components/pricing/pricing-comparison-table.tsx
- **Decision:** Drop the claim (chosen) vs. ship clause-authoring UI in the lease builder with Max gating (rejected: a feature build — state management, validation, PDF integration, a new tier gate — far beyond truthfulness scope; the inert `customClauses` plumbing and `ClausesEditor` make it a reasonable future phase if wanted).

## CONTENT-15 — Homepage FAQ: trial includes "Everything… all features"
- **Finding:** src/components/sections/home-faq.tsx:36 (medium) — "Everything. You get full access to all features" (and line 16 "covers every feature"), but the trial is plan-scoped: e-sign is 402-gated off Starter trials and DB triggers enforce Starter caps during trial. The site's own /llms-full.txt lists Trial e-sign as "—".
- **Root cause:** Trial-scope class (see CONTENT-09): copy predates the plan-scoped trial mechanics (`trial_period_days` on the selected price + tier-gate entitlement by plan).
- **Fix:** Class-wide with CONTENT-09/18: (1) line 16 → `"…The 14-day free trial covers every feature of the plan you pick, so you can see the workflow before committing."`; (2) line 36 answer → `"Full access to every feature of the plan you choose, for 14 days, with no credit card required. Lease e-sign is included on Growth and Max. If you decide TenantFlow isn't right for you, there's no obligation — simply don't subscribe."`
- **Why it fixes it:** The verifier's failure case (trialing Starter user 402-blocked from e-sign after reading "all features") is impossible under the new copy, which matches the tier gate (`GROWTH_AND_MAX_PLANS`) and the /llms-full.txt table exactly.
- **Risks / interactions:** `homeFaqs` renders on the homepage via `marketing-home.tsx:138`; no FAQ JSON-LD is derived from `homeFaqs` (only /pricing and /faq emit FAQPage JSON-LD), so this is display-copy only. No test asserts these strings (marketing-home.test.tsx checked).
- **Files touched:** src/components/sections/home-faq.tsx

## CONTENT-16 — Logo cloud misrepresents infrastructure vendors as "Trusted integrations"
- **Finding:** src/components/sections/logo-cloud.tsx:16 (medium) — Defaults `title="Trusted integrations"` / `subtitle="Connect to the tools your portfolio already runs on"` render bare on the homepage (`marketing-home.tsx:93`), presenting Stripe/Supabase/Vercel/Resend — TenantFlow's own stack — as user-connectable integrations. features-client.tsx passes an honest title but keeps the same misleading subtitle.
- **Root cause:** The component was framed as an integrations section when the product has no integrations surface; the four logos are internal infrastructure (CLAUDE.md stack).
- **Fix:** (1) In logo-cloud.tsx change the defaults: `title = "Built on Stripe, Supabase, Vercel, and Resend"`, `subtitle = "The infrastructure behind billing, data, hosting, and email"`; update the JSDoc ("integration partners" → "technology stack") and rename the local `integrations` array to `stack` for honesty at the code level. (2) In features-client.tsx remove the now-redundant `title`/`subtitle` props from `<LogoCloud …/>` (lines 60-61) so both pages render the single honest default.
- **Why it fixes it:** The verifier's evidence is the "Connect to the tools" framing over non-connectable vendors; the new framing states only the true relationship (the product is built on them), matching the honest title features-client already used.
- **Risks / interactions:** The word "integrations" also disappears from the FAQ path via CONTENT-20's rewrite (Max API claim removed), keeping the story consistent. Phase 46 (MKTUI) may restyle this section afterward — copy lands first.
- **Files touched:** src/components/sections/logo-cloud.tsx, src/app/features/features-client.tsx

## CONTENT-17 — Hardcoded 5-star ratings on testimonials
- **Finding:** src/components/sections/testimonials-section.tsx:123 (medium) — Both the carousel (lines 122-126) and grid card (lines 222-226) render `[...Array(5)]` filled stars above every quote; `Testimonial` has no rating field, so the 5/5 is data-free invention over author-approved quotes whose own data file bans fabricated metrics.
- **Root cause:** Decorative star rows survived the Phase 67 fabricated-social-proof purge because they're markup, not data — but they assert a rating no customer gave.
- **Fix:** Delete the star row from the carousel (lines 122-126) and from `TestimonialCard` (lines 222-226); remove the now-unused `Star` import from `lucide-react`. Do NOT add a rating field — no real rating data exists.
- **Why it fixes it:** The invented 5/5 visual claim is removed from both render paths (homepage `marketing-home.tsx:130` and /pricing `pricing/page.tsx:95` with `realTestimonials`), restoring the repo's own anti-fabrication guardrail documented in `src/data/testimonials.ts`.
- **Risks / interactions:** Minor visual change above quotes (Quote icon + `pt-4` spacing remain; carousel keeps its layout). `noUnusedLocals` will fail the build if the `Star` import is left behind — remove it. Phase 46 (MKTUI) restyles after.
- **Files touched:** src/components/sections/testimonials-section.tsx
- **Decision:** Remove the stars (chosen) vs. add an optional `rating` field to `Testimonial` rendered only when a real rating exists (rejected: no collected ratings exist to populate it; an always-empty field invites re-fabrication).

## CONTENT-18 — FREETRIAL "Try every feature" contradicts its own 1-property/5-unit limits
- **Finding:** src/config/pricing.ts:67 (medium) — FREETRIAL description "Try every feature for 14 days" / audienceTagline "14-day full-feature trial" contradict the same object's limits (1 property, 5 units, no e-sign feature); the card renders user-facing on /billing/plans (no trial filter there).
- **Root cause:** Trial-scope class: the trial tier's copy claims full-feature access while its own `limits`/`features` (and `get_user_plan_limits`' ELSE branch) cap it at 1/5 with no e-sign.
- **Fix:** In `src/config/pricing.ts` FREETRIAL: description (line 67) → `"Try TenantFlow free for 14 days — 1 property, up to 5 units"`; audienceTagline (line 68) → `"14-day free trial"`. The features list (lines 84-92) already states the true limits and stays.
- **Why it fixes it:** The card's headline copy now agrees with the limits the verifier proved are enforced (config lines 77-83 + `get_user_plan_limits` in `20260510094421`), so a /billing/plans viewer sees a self-consistent trial card.
- **Risks / interactions:** Same file as CONTENT-02/03/19 — one edit pass across pricing.ts. /pricing is unaffected (bento filters `planId !== "trial"`).
- **Files touched:** src/config/pricing.ts
- **Decision:** Fix the copy (chosen) vs. also filter the trial card out of /billing/plans like /pricing does (rejected as the primary fix: trial-plan users landing on /billing/plans benefit from seeing their current tier's card; hiding it is a UX decision for a billing phase, and the copy must be fixed either way).

## CONTENT-19 — Max plan advertises "Custom lease clauses"
- **Finding:** src/config/pricing.ts:196 (medium) — Max features list "Custom lease clauses" but the lease builder hardcodes an empty `customClauses` const with no input UI on any plan.
- **Root cause:** Custom-clauses class (see CONTENT-14) — feature string for an unshipped authoring UI.
- **Fix:** Class-wide with CONTENT-14: delete `"Custom lease clauses"` from `TENANTFLOW_MAX.features` (line 196). Combined with the CONTENT-14 row removal, no surface sells the capability.
- **Why it fixes it:** Verifier evidence shows `renderCustomClauses()` always receives `[]` and returns `""` — the feature is unreachable; removing both marketing surfaces (config string + matrix row) makes zero claims about it.
- **Risks / interactions:** Same file as CONTENT-02/03/18. Max keeps 7 truthful feature strings after CONTENT-03 + CONTENT-19 removals.
- **Files touched:** src/config/pricing.ts
- **Decision:** Same as CONTENT-14 (drop the claim; building the Max-gated clause editor is a future feature phase).

## CONTENT-20 — FAQ claims "API access is available on the Max plan"
- **Finding:** src/data/faqs.ts:78 (medium) — Integrations answer claims Max API access (line 58 repeats it); the answers are emitted as FAQPage JSON-LD on /faq, propagating the false claim into search rich results.
- **Root cause:** API-claims class (see CONTENT-03) — FAQ copy derived from the same fictional Max capability.
- **Fix:** Class-wide with CONTENT-03: (1) line 58 → `"Yes. Starter handles up to 5 properties / 25 units, Growth manages up to 20 properties / 100 units, and Max supports unlimited properties with a dedicated account manager."`; (2) line 78 → `"Growth and Max can export financial, year-end, and 1099 reports as CSV for accounting imports. Lease e-signatures are included on Growth (25/month) and Max (unlimited); Starter does not include e-sign."` (drop only the API sentence — the rest is verified-true).
- **Why it fixes it:** Both grep-verified false sentences are removed; because `faqData` feeds `createFaqJsonLd` in `faq/page.tsx:32-36`, the JSON-LD is corrected by the same data edit.
- **Risks / interactions:** SEO rich-results content changes — note for Phase 48. faqs.ts is in the banlist test's `MARKETING_FILES`; new copy is clean.
- **Files touched:** src/data/faqs.ts

## CONTENT-21 — AppFolio "over $3,000/year" is arithmetically false
- **Finding:** src/app/compare/[competitor]/compare-data.ts:238 (low) — ($298 − $49) × 12 = $2,988 < $3,000, so "Save over $3,000/year" overstates its own cited parenthetical.
- **Root cause:** Rounding-up flourish not supported by the cited numbers (the Buildium sibling at line 109, $1,608 → "over $1,600", rounds down correctly).
- **Fix:** Change line 238 to `"Save $2,988/year at 30 units ($49/mo vs $298/mo minimum)"` — the exact figure, which is both precise and more credible than "nearly".
- **Why it fixes it:** The claim now equals the arithmetic of its own parenthetical, per the verifier's calculation.
- **Risks / interactions:** None. `$2,988` is not in `BANNED_NUMERIC_CLAIMS`; it is a derived price comparison with its methodology inline, matching the sanctioned Buildium-sibling pattern.
- **Files touched:** src/app/compare/[competitor]/compare-data.ts

## CONTENT-22 — RentRedi "Unlimited Units: no" contradicts Max's unlimited units on the same page
- **Finding:** src/app/compare/[competitor]/compare-data.ts:341 (low) — Feature row says TenantFlow "no — 25-100 by plan" while the pricing panel directly above shows "Max — Unlimited properties and units" (`PRICING_PLANS` Max `units: -1`).
- **Root cause:** The row was written against Starter/Growth caps only, ignoring the Max tier that the same page's `TENANTFLOW_PRICING` displays.
- **Fix:** Change the row (lines 338-344) to `tenantflow: "partial"`, `tenantflowNote: "Unlimited on Max; 25/100 on Starter/Growth"`, keeping `competitor: "yes"` / `competitorNote: "All plans"`.
- **Why it fixes it:** The cell now agrees with both the page's own pricing panel and canonical `pricing.ts:186` (Max units -1) while honestly conceding RentRedi offers it on all plans — `"partial"` is the accurate support level for "on one tier".
- **Risks / interactions:** Preserves the pinned count of 4 `"na"` rows (uses `"partial"`, which `FeatureIcon` renders as an amber Minus). Same file as CONTENT-04/05/06/21 — one edit pass.
- **Files touched:** src/app/compare/[competitor]/compare-data.ts

## CONTENT-23 — Stock photo alt text fabricates "TenantFlow support team"
- **Finding:** src/app/help/page.tsx:46 (low) — Generic Unsplash office photo captioned "TenantFlow support team helping landlords with their portfolios", asserting the people depicted are actual staff — the fabricated-identity class the banlist test guards, evaded by phrasing.
- **Root cause:** Alt text asserts identity/attribution the image doesn't have; the banlist (`BANNED_FABRICATED_IDENTITY_CLAIMS`) bans "meet the team"-style phrases but not this variant.
- **Fix:** (1) Change the alt (line 46) to the sanctioned neutral pattern used by siblings (about: "Professional team collaborating…"; faq: "Modern office workspace…"): `"Support professionals collaborating in a modern office"`. (2) Close the evasion class: add `"tenantflow support team"` to `BANNED_FABRICATED_IDENTITY_CLAIMS` in `src/app/__tests__/marketing-copy-landlord-only.test.ts`.
- **Why it fixes it:** The alt no longer claims the stock subjects are TenantFlow staff (the exact fabrication the verifier flagged), and the banlist addition makes the specific evasion a permanent test failure.
- **Risks / interactions:** Banlist scans all of src/app + src/components + src/lib — verify the new phrase has zero remaining occurrences after the alt fix (it will, this is the only one). Same file as CONTENT-07.
- **Files touched:** src/app/help/page.tsx, src/app/__tests__/marketing-copy-landlord-only.test.ts

## CONTENT-24 — Stale "as of 2025" vintage on legal/tax reference content
- **Finding:** src/app/resources/security-deposit-reference-card/page.tsx:628 (low) — Disclaimer labels the 50-state deposit table "as of 2025" in mid-2026 while the page itself warns laws "change frequently"; sibling `tax-deduction-data.ts:174` still cites "2025: 70 cents/mile" for the IRS standard mileage rate although the 2026 rate has applied since January.
- **Root cause:** Reference-content vintage was never given a refresh process; both pages embed a year+figure pair that silently goes stale.
- **Fix:** Two-part refresh task (implementer uses WebSearch — data must be verified, not invented): (1) Look up the published 2026 IRS standard mileage rate (IRS notice, irs.gov) and update `tax-deduction-data.ts:174` description to `"IRS standard mileage rate for rental property trips (2026: <verified> cents/mile)"` plus recompute the line-176 example (`500 miles × rate`). (2) Spot-verify the 50-state deposit table against current statutes for states with known 2025-2026 landlord-tenant changes (at minimum: WA, CO, CA, NY, OR — states with active legislative churn), correct any changed rows, then update the disclaimer (line 628) to `"as of July 2026"`. If any state cannot be verified, keep its row but note it in the PR; the disclaimer date reflects the review date, which the verification pass makes true.
- **Why it fixes it:** The verifier's defect is staleness by the page's own standard; a verification pass plus updated vintage restores the claim "as of <date>" to truth. Relabeling without verifying would substitute one false claim for another — hence the refresh is mandatory before the label moves.
- **Risks / interactions:** `tax-deduction-data.ts` has banlist exemptions (`numeric`, `feature`) — keep the file path unchanged so the exemption keys still match. Content-research effort (~1-2h) — the only non-mechanical task in this phase; schedule it as its own plan step.
- **Files touched:** src/app/resources/security-deposit-reference-card/page.tsx, src/app/resources/landlord-tax-deduction-tracker/tax-deduction-data.ts
- **Decision:** Verify-then-relabel (chosen — the only truthful path) vs. label-only bump to 2026 (rejected: fabricates a review that didn't happen) vs. dynamic `as of {currentYear}` (rejected hardest: auto-lies every January).

## Cross-cutting notes

**Class-wide fixes (plan each as ONE task so siblings don't trickle out one-per-cycle — Phase 31 FORMFIX-08 lesson):**

1. **Team-claims class** — CONTENT-01, -02, -06, -07, -10, -12 plus three unlisted siblings found by exhaustive grep: `src/app/pricing/pricing-content.tsx:105` ("how access works for your team"), `:172` ("add teammates and integrations"), and `src/app/(owner)/maintenance/[id]/edit/page.tsx:67` ("communicate changes with your team" — in-app copy implying multi-user; change to "Update request details and keep the record current."). Acceptance grep after the sweep: `grep -rni "team member\|team (3\|team billing\|team-member\|invite team\|teammates\|your team" src/` must return only compare-data.ts competitor-note lines (RentRedi's own "Unlimited team members" capability — legitimate third-party claims).
2. **API-claims class** — CONTENT-03, -20 (pricing.ts:174/197 + faqs.ts:58/78). Acceptance grep: `grep -rni "api access\|api key" src/app src/components src/config src/data` returns nothing product-side.
3. **Trial-scope class** — CONTENT-09, -15, -18. Canonical phrasing: "every feature of the plan you choose" + "e-sign on Growth and Max". Honest reference implementations already in-repo: `premium-cta.tsx:44-45`, Starter feature string, `/llms-full.txt` plan table.
4. **Newsletter/lead-magnet class** — CONTENT-11, -13. Shared strings: title `"Landlord tips in your inbox"`, toast `"You're on the list."`, modal CTA `"Subscribe"`.
5. **Custom-clauses class** — CONTENT-14, -19 (matrix row + Max feature string).

**Regression guard (ships with this phase):** extend `src/app/__tests__/marketing-copy-landlord-only.test.ts`:
- `BANNED_FEATURE_CLAIMS` += `"invite team members"`, `"team (3 users)"`, `"team-member seats"`, `"team billing"`, `"api access"` (post-fix, zero legitimate occurrences remain in scanned dirs; compare-data's competitor note "Unlimited team members" does not match any of these specific phrases).
- `BANNED_FABRICATED_IDENTITY_CLAIMS` += `"tenantflow support team"` (CONTENT-23).
All new replacement copy in this phase must itself be checked against the existing banlists (avoid "in minutes", "real-time", superlatives, SLA-shaped promises).

**Existing tests that constrain the fixes:** `compare-neutral-framing.test.tsx` pins exactly 4 `tenantflow:"na"` rows in compare-data.ts — CONTENT-06 uses `"no"`, CONTENT-22 uses `"partial"`, count preserved. `src/config/__tests__/pricing.test.ts` asserts only `calculateAnnualSavings` — unaffected by limits-field removal. No pricing/bento test asserts team/API/clause strings (grep-verified).

**Phase dependencies:** none hard. Phase 44 (PUBUX) executes immediately before this phase and audits the same public pages — re-verify all line numbers against post-44 main at plan time. Phase 46 (MKTUI), 47 (A11Y), 48 (SEO) run after and rebase on these copy changes; CONTENT-05/08/20 alter meta/JSON-LD content that Phase 48 must not "restore". CONTENT-08's alternative (enabling ACH) would be a Phase-36-class billing change — if ever done, the FAQ copy must be updated in that same PR.

**No DB/Edge Function changes anywhere in this phase** — every fix is frontend copy/data/config plus one test-file guard, so no owner-run deploys (CLI-401) are needed and `verify` is `bun run typecheck && bun run lint && bun run test:unit` plus visual spot-check of /pricing, /features, /help, /resources, /compare/*, homepage.

**Single-file collision map (order edits within one task per file):** `pricing.ts` ← CONTENT-02, -03, -18, -19; `pricing-comparison-table.tsx` ← CONTENT-01, -14; `compare-data.ts` ← CONTENT-04, -05, -06, -21, -22; `pricing-content.tsx` ← CONTENT-08, -09, -10(sibling); `help/page.tsx` ← CONTENT-07, -23.
