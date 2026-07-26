# Phase 56 - Discussion Log

**Date:** 2026-07-26
**Mode:** default (interactive, no flags)
**Areas selected:** all four offered

Human reference only. Downstream agents read `56-CONTEXT.md`, not this file.

---

## Area 1 - Hub shape & sub-routes

| Question | Options presented | Selected |
|---|---|---|
| How should the hub be structured? | Real sub-routes (rec) / Tabs on one page / Sections on one scrolling page | **Real sub-routes** |
| How should the hub index group reports? | Statements-Analytics-Exports (rec) / Flat list / Statements vs everything else | **Statements / Analytics / Exports** |
| What happens to existing `/reports/{generate,year-end,analytics}`? | Keep in place (rec) / Re-slot into new structure / You decide | **Re-slot** (non-recommended) |
| Should the index show data or just navigate? | Navigation only (rec) / Light summary + nav / You decide | **Navigation only** |

**Note:** choosing re-slot means three already-correct `/reports/*` URLs also need redirects,
expanding the map beyond the legacy trees. Captured as D-03.

---

## Area 2 - Fate of the /analytics section

| Question | Options presented | Selected |
|---|---|---|
| Only `/analytics/financial`, or the whole section? | Only financial (rec) / Absorb all / Only financial + rename | **Absorb all** (non-recommended, scope expansion) |
| How does `/analytics/financial` land? | Merge into existing `/reports/analytics` (rec) / New sibling sub-route / You decide | **Merge into existing** |
| How many top-level nav entries? | Two: Reports + Analytics (rec) / One: Reports only / You decide | **Two** |
| What about the `/analytics` index financial entry? | Cross-link to hub (rec) / Remove entirely / You decide | **You decide** |

### Conflict raised and resolved

"Absorb all of /analytics" and "keep two nav entries" contradicted each other - if the whole
section folds into the hub there is no `/analytics` left to hold a nav entry, and no index page for
the fourth question to apply to. Surfaced rather than guessed.

| Reconciliation options | Selected |
|---|---|
| Both - URLs absorb, nav keeps two entries pointing into the hub (rec) / Absorb everything with one nav entry / Revert to roadmap-literal | **Both** |

Result: every `/analytics/*` URL 308s into `/reports/analytics/*`, while the nav shows
`Reports -> /reports` and `Analytics -> /reports/analytics`. The scope expansion (~6 extra
redirects and E2E routes beyond RPTHUB-01) was accepted knowingly. Captured as D-05 through D-08.

---

## Area 3 - Legacy route removal mechanics

| Question | Options presented | Selected |
|---|---|---|
| What happens to old `page.tsx` files? | Delete, redirects only in next.config (rec) / Keep as permanentRedirect stubs / Delete most | **Delete** |
| How to sequence E2E-before-removal? | Ordered plans in-phase (rec) / Ship hub now, remove later / You decide | **Ordered plans in-phase** |
| Where do the ~21 legacy URLs point? | 1:1 exact (rec) / Group-level / Exact where possible | **1:1 exact** |
| How far on the duplicated `PREMIUM_REPORT_TYPES`? | Verify both, leave duplication (rec) / Consolidate into `_shared/` / You decide | **Verify both, leave duplication** |

Consolidating the duplicated set was recorded as a deferred idea rather than dropped.

---

## Area 4 - /documents landing composition

| Question | Options presented | Selected |
|---|---|---|
| What does the landing show? | Three entry points (rec) / Entry points + recent documents / Entry points + storage usage | **Entry points + recent documents** (non-recommended) |
| Does `/documents/vault` stay canonical? | Yes (rec) / No, vault moves to `/documents` / You decide | **Yes** |
| How are the four printable templates surfaced? | One card listing all four (rec) / Four separate cards / You decide | **Four separate cards** (non-recommended) |
| How to handle the contradicting code comment? | Replace and record why (rec) / Replace silently / You decide | **Replace and record why** |

**Concern raised, user proceeded:** the recent-documents list overlaps what `/documents/vault`
already renders, and four separate template cards plus vault plus lease-template makes the landing
six tiles plus a list. Both noted in D-14 and D-16 with guidance (reuse the vault's query; defer
layout balance to the UI phase) rather than re-litigated.

---

## Scope creep redirected

- De-duplicating `PREMIUM_REPORT_TYPES` across the two edge functions -> deferred idea.
- New report types / new analytics visualizations -> explicitly out of scope in `<domain>`.

## Claude's discretion recorded

Exact sub-route slugs, whether `/reports/analytics` needs its own index, hub/landing card layout,
and whether the recent-documents list is server- or client-rendered.

## Prior context applied (not re-asked)

Phase 55's Scheduled vs Collected revenue vocabulary (D-07/D-08) carries forward unchanged as D-18.
