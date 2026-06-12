# Facebook Content Pipeline — Go-Live Log (2026-06-12)

Phase 2 of social distribution (phase 1 = the 50-state deposit hub launch,
see FB-LAUNCH-2026-06-12.md).

## What shipped today

- **61 posts scheduled in Meta Business Suite**, all confirmed: posts 01-20
  as 10:00 AM weekday anchors (Jun 15 - Jul 10), posts 21-61 on the
  3-slot/day grid (9:00 AM / 1:00 PM / 5:00 PM CT, Jun 13 - Jun 26).
  Every post: branded cover, owner-voice copy (adversarially checked for
  AI tells), per-post date/time verified before and after submission.
- **Publish-time trigger live** (#827 + #828): every blog that passes the
  factory gates now spawns a headless session that voice-writes its FB
  post, lints it, and slots it into the calendar automatically. First
  fully autonomous run verified (buildium-vs-landlord-studio, 2:42 PM).
- **Daily top-up cron** (9:53 AM): submits staged posts as they enter
  Meta's 29-day scheduling window + backfills any trigger misses.

## Constraints discovered

- Meta Business Suite hard-caps scheduling at 20 min - 29 days out; the
  3-slot/day density exists to keep the queue inside that window.
- First comments (the blog links) cannot be scheduled (Instagram-only
  feature) — they are pasted + pinned manually when each post publishes,
  from .planning/social/FB-CONTENT-CALENDAR-2026-Q3.md.
- Reclaim-tier republishes are redirect-shadowed until the next deploy
  (filterActiveRedirects drops ghost 301s at build time) — and new post
  pages need a deploy at all (dynamicParams=false). Deploy cadence must
  keep pace with publish cadence; this merge is itself the deploy that
  un-shadows today's post-2:28-PM publishes.
