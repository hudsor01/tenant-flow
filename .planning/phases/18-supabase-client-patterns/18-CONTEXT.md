# Phase 18: Supabase Client & Connection Patterns - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<vision>
## How This Should Work

Research official Supabase best practices for NestJS backends, then systematically align the codebase to match. The goal is not to invent patterns — it's to find what Supabase recommends and implement that correctly.

This is about "doing it the right way" according to Supabase documentation, not about optimizing for edge cases we haven't hit yet.

</vision>

<essential>
## What Must Be Nailed

All aspects are equally important — full best practices alignment:

- **Connection pooling done right** — Follow Supabase's official connection management guidance
- **Single client pattern** — Consistent client instantiation across all backend services
- **No connection leaks** — Every connection properly managed and released

</essential>

<boundaries>
## What's Out of Scope

No strict boundaries defined — follow what makes sense for best practices alignment.

Query optimization is covered in Phase 19, but if client patterns affect queries, address as needed.

</boundaries>

<specifics>
## Specific Ideas

No specific requirements — open to whatever official Supabase documentation recommends for NestJS backends.

</specifics>

<notes>
## Additional Context

This is a research-driven phase. The approach is:
1. Research official Supabase best practices
2. Audit current codebase patterns
3. Identify gaps between current state and best practices
4. Implement changes to align with official guidance

</notes>

---

*Phase: 18-supabase-client-patterns*
*Context gathered: 2026-01-18*
