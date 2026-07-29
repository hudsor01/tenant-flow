# Phase 52 — Deferred Items

Out-of-scope discoveries logged during execution (not fixed — outside the current plan's files).

## From Plan 52-06 (notifications inbox page)

- **Stale settings nav description (code hygiene, NOT a user-facing leak).**
  `src/app/(owner)/settings/page.tsx:76` still declares
  `description: "Email, SMS, and push settings"` for the Notifications section.
  This contradicts the HONEST-01/02 channel-honesty removal (52-08), but the
  `section.description` field is **not rendered anywhere in the DOM** — the
  settings sidebar `<nav>` renders only `section.icon` and `section.label`
  (`page.tsx:230-233`). So there is no runtime honesty violation and the 52-06
  E2E honesty assertion passes. Recommend a future one-line copy fix to
  `"Email and category preferences"` for source honesty. Out of scope for 52-06
  (unrelated file, not in this plan's `files_modified`, not rendered).
