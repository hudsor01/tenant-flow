# Resume: v1.6 SEO & Google Indexing Optimization

## Where We Are
- Branch: `fix/google-indexing-seo` (from main)
- Milestone v1.6 started, PROJECT.md and STATE.md updated
- **4/4 research files complete** in `.planning/research/`: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
- **REQUIREMENTS.md written** with 43 requirements across 7 categories (UTIL, CRAWL, META, SCHEMA, PRICE, VALID, CONTENT)
- **SUMMARY.md NOT yet written** — needs synthesis
- **ROADMAP.md NOT yet created** — needs roadmapper agent

## What To Do Next (in order)

### Step 1: Synthesize Research
Spawn `gsd-research-synthesizer` agent:
```
Read .planning/research/{STACK,FEATURES,ARCHITECTURE,PITFALLS}.md
Write .planning/research/SUMMARY.md
```

### Step 2: Create Roadmap
Spawn `gsd-roadmapper` agent with:
- Phase numbering **continues from 31** (v1.5 ended at phase 31)
- Read: PROJECT.md, REQUIREMENTS.md, research/SUMMARY.md, config.json, MILESTONES.md
- Map all 43 requirements to phases, derive success criteria, write ROADMAP.md + update STATE.md + REQUIREMENTS.md traceability
- Present roadmap for user approval

### Step 3: After Approval
- Commit planning artifacts (if commit_docs changes to true, otherwise skip)
- Show next step: `/gsd-discuss-phase 32` or `/gsd-plan-phase 32`

## Critical Research Findings (must inform roadmap phase ordering)
1. **`robots.txt` blocks `/_next/`** — prevents Googlebot from loading CSS/JS, pages may appear blank to crawler. HIGHEST PRIORITY FIX.
2. **Self-serving `AggregateRating`** in `generate-metadata.ts` (fabricated 4.8 stars, 1,250 reviews not shown on any page) — risks Google manual action stripping ALL rich results.
3. **`public/sitemap.xml` shadows `src/app/sitemap.ts`** — crawlers get stale Feb 2025 data instead of dynamic sitemap.
4. **`priceValidUntil: '2025-12-31'`** expired in pricing JSON-LD.
5. **3 `'use client'` pages** (features, blog hub, blog/category) can't export metadata — need server wrapper pattern.

## Config
- `commit_docs: false` (planning docs not committed)
- `model_profile: quality` (opus for researcher/roadmapper, sonnet for synthesizer)
- `research_enabled: true`

## Key Files
| File | Status |
|------|--------|
| `.planning/PROJECT.md` | Updated for v1.6 |
| `.planning/STATE.md` | Updated with resume context |
| `.planning/REQUIREMENTS.md` | 43 requirements, 0 mapped to phases |
| `.planning/ROADMAP.md` | Stale (v1.5) — will be overwritten by roadmapper |
| `.planning/research/STACK.md` | Complete |
| `.planning/research/FEATURES.md` | Complete |
| `.planning/research/ARCHITECTURE.md` | Complete |
| `.planning/research/PITFALLS.md` | Complete |
| `.planning/research/SUMMARY.md` | NOT YET CREATED |
