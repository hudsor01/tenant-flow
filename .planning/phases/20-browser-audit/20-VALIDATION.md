---
phase: 20
slug: browser-audit
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-09
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Claude-in-Chrome MCP (browser automation) + Vitest 4.x (regression) |
| **Config file** | vitest.config.ts (existing) |
| **Quick run command** | `pnpm typecheck && pnpm lint` |
| **Full suite command** | `pnpm typecheck && pnpm lint && pnpm test:unit` |
| **Estimated runtime** | ~16 seconds |

---

## Sampling Rate

- **After every fix commit:** Run `pnpm typecheck && pnpm lint`
- **After every plan completes:** Run `pnpm typecheck && pnpm lint && pnpm test:unit`
- **Before `/gsd:verify-work`:** Full suite must be green + all AUDIT-LOG entries show pass/fix
- **Max feedback latency:** 16 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | VER-01, VER-02 | browser + typecheck | Chrome MCP visual + `pnpm typecheck && pnpm lint` | ✅ | ⬜ pending |
| 20-02-01 | 02 | 1 | VER-01, VER-02 | browser + typecheck | Chrome MCP visual + `pnpm typecheck && pnpm lint` | ✅ | ⬜ pending |
| 20-03-01 | 03 | 1 | VER-01, VER-02 | browser + typecheck | Chrome MCP visual + `pnpm typecheck && pnpm lint` | ✅ | ⬜ pending |
| 20-04-01 | 04 | 2 | VER-01, VER-02 | browser + typecheck | Chrome MCP visual + `pnpm typecheck && pnpm lint` | ✅ | ⬜ pending |
| 20-05-01 | 05 | 2 | VER-01, VER-02 | browser + typecheck | Chrome MCP visual + `pnpm typecheck && pnpm lint` | ✅ | ⬜ pending |
| 20-06-01 | 06 | 2 | VER-01, VER-02 | browser + typecheck | Chrome MCP visual + `pnpm typecheck && pnpm lint` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Browser audit uses Claude-in-Chrome MCP tools (already available). Any code fixes are validated via existing typecheck + lint + unit test suite.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual rendering at viewports | VER-02 | Subjective visual assessment | Chrome MCP read_page at 375px, 768px, 1440px |
| Interactive element response | VER-01 | Requires browser DOM interaction | Chrome MCP javascript_tool click + verify |
| Console error absence | VER-01 | Runtime-only behavior | Chrome MCP read_console_messages |

*All "manual" verifications are performed by Claude-in-Chrome MCP automation, not human manual testing.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 16s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-09
