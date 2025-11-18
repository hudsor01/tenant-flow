

Add UUID validation to Stripe controller
Apply UUID validation to all Stripe controller endpoints that accept UUID parameters.

Rate limit tenant invitation endpoint
Add rate limiting to the invitation endpoint to protect against abuse, brute forcing, or mass-invite spam.

Enforce LeaseStatus via DB CHECK constraint
Add a database-level constraint ensuring LeaseStatus can only store valid, known values.

Wire health thresholds to ConfigService / env
Move health/metrics thresholds out of hardcoded values and into configuration managed by ConfigService / env vars.

Define and implement a single canonical rule for which timestamp is considered the “payment receipt date” when
multiple exist.

Add explicit onError / onSuccess in tenant portal hooks
Ensure tenant portal operations explicitly handle success/failure with correct UI and logging behavior.

Add explicit retry configuration for tenant portal queries
Configure retry, retryDelay, and onError for tenant portal queries intentionally instead of relying on library defaults.

Fix env var validation and header standardization in RLS tests
Make sure RLS boundary tests properly validate required environment variables and headers, matching real runtime expectations.

Throw errors instead of returning null from retry utility
Replace “null on failure” with explicit errors so callers must handle failure paths.

Replace sequential maintenance queries with eager loading
Refactor the maintenance update flow to use an eager-loading pattern and eliminate 50–100 ms wasted latency per operation.

Create optimized unit stats RPC
Implement an optimized database RPC for unit stats (targeting 200 ms → 100 ms) and update the application to consume it.

Replace hardcoded lease status strings with constants
Ensure all lease-related UI and logic use shared LEASE_STATUS constants aligned with backend values.

Implement robust 409 conflict handling in forms
In lease/maintenance/unit forms, correctly detect HTTP 409 conflicts and surface appropriate UX instead of silently overwriting or failing.
