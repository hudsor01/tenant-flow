# Phase 1: Critical Security - Context

**Gathered:** 2026-01-15
**Status:** Ready for planning

<vision>
## How This Should Work

Systematic audit and fix approach. Go through each RLS policy methodically, fix vulnerabilities one by one, and verify nothing breaks by running the existing test suite after each fix.

The goal is thoroughness over speed — every policy gets reviewed, every fix gets verified.

</vision>

<essential>
## What Must Be Nailed

- **No data leaks possible** — Every RLS policy correctly restricts access to the right users only. No user can see another user's data.
- **Production-ready security** — Confident enough to point security auditors at the RLS policies without concern.
- **Clean foundation** — All security debt cleared so future phases build on solid ground.

</essential>

<boundaries>
## What's Out of Scope

Nothing excluded — fix everything security-related identified in the health report:
- Fix active_entitlements `USING (true)` vulnerability
- Add `WITH CHECK` clause to 5 UPDATE policies missing validation
- Wrap 16 bare `auth.uid()` calls in `(SELECT ...)` for performance
- Review and re-enable security migrations from `.sql.skip` files

</boundaries>

<specifics>
## Specific Ideas

No specific requirements — use standard RLS patterns already established in the codebase.

</specifics>

<notes>
## Additional Context

Verification approach: Run existing test suite after each fix to catch regressions. Tests passing = fix is safe.

Reference: CODEBASE_HEALTH_REPORT.md Section 1.3

</notes>

---

*Phase: 1-critical-security*
*Context gathered: 2026-01-15*
