# Phase 22: Cold Start & Performance Optimization - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<vision>
## How This Should Work

Comprehensive performance optimization for the NestJS backend covering both cold start (deployment latency) and runtime efficiency. The primary focus is production deployment latency — users shouldn't wait on first request after a Railway deploy.

Beyond startup, this is a general performance sweep: faster API response times, more efficient database queries, and leaner memory usage. The backend should feel snappy and not consume excessive resources.

</vision>

<essential>
## What Must Be Nailed

- **Deploy latency** — Cold starts on Railway should be fast so first requests don't timeout
- **API response times** — Endpoints respond quickly under normal load
- **Database efficiency** — Minimize query counts, connection overhead, prevent N+1 issues
- **Memory efficiency** — Keep memory usage lean within Railway's limits

</essential>

<boundaries>
## What's Out of Scope

No explicit exclusions — open to whatever improves performance. However, this is a [RESEARCH] phase, so the primary output is documentation and recommendations, not necessarily implementation.

</boundaries>

<specifics>
## Specific Ideas

No specific requirements mentioned — standard approaches to:
- Lazy loading of modules
- Module optimization
- Connection pooling review
- Query efficiency analysis

</specifics>

<notes>
## Additional Context

This phase is marked [RESEARCH] in the roadmap, similar to Phases 18-21. The focus should be on auditing current performance characteristics, documenting findings, and recommending optimizations.

Prior phase (21) identified billing module as oversized (14k lines) with circular forwardRef dependencies — this may be relevant to startup optimization.

</notes>

---

*Phase: 22-cold-start-optimization*
*Context gathered: 2026-01-18*
