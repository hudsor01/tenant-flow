## Out-of-scope discoveries (deferred)

Pre-commit unit-tests suite shows ~15 flaky failures unrelated to Phase 12-02:
- src/components/{leases,maintenance,properties,tenants}/__tests__/*  — userEvent timeouts
- src/app/(owner)/{profile,settings}/__tests__/* — hook/test timeouts
- src/app/blog/[slug]/page.test.tsx — generateStaticParams retry timeout
- src/components/shell/__tests__/app-shell.test.tsx — command-palette timeout
- 2 unhandled errors: 'Failed to start threads worker' / 'Timeout waiting for worker to respond'

Root cause: vitest worker-pool resource exhaustion during the full 105k-test parallel run
(176s wall, lost worker threads). property-form.test.tsx passes 20/20 in isolation (1.18s).
Not a regression from the 12-02 OG-route change. Pre-existing environment flakiness.

