# Deferred Items - Phase 26

## Out-of-scope discoveries during 26-02 execution

### 1. selection-step-filters.tsx also has client-side expires_at on INSERT
- **File:** `src/components/leases/wizard/selection-step-filters.tsx` (lines 46, 56)
- **Issue:** Same pattern as the 3 files fixed in 26-02 -- `expiresAt` variable and `expires_at: expiresAt` in a `.insert()` call to `tenant_invitations`
- **Why deferred:** Not listed in plan scope. Pre-existing issue in an unrelated file.
- **Recommended fix:** Remove `expiresAt` variable and `expires_at` field from the insert payload (DB default handles it after 26-01 migration).
