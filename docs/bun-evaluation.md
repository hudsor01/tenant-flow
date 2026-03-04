# Bun vs pnpm Evaluation — TenantFlow

**Date:** 2026-03-03
**Current setup:** pnpm 10.29.3 | Node 24 | Single-package Next.js 16 project
**Bun version evaluated:** 1.3.10 (latest stable, Feb 2026)

---

## Executive Summary

**Decision: Stay on pnpm.** Bun offers ~4x faster installs but introduces unacceptable risks for this project: Next.js 16 build segfaults, no Dependabot security updates, no nested overrides (we use 2), immature Vitest 4 compatibility, and ~4,900 open GitHub issues. The install speed gain (~25s saved per CI run) doesn't justify the stability regression. Re-evaluate when Bun 1.4+ ships with Next.js 16 segfault fixes.

---

## Detailed Comparison

### 1. Installation Speed

| Scenario | Bun | pnpm | Speedup |
|----------|-----|------|---------|
| Cold install (~1.1k packages, Next.js) | 8.6s | 31.9s | 3.7x |
| Cold install (~350 packages, library) | 3.4s | 12.1s | 3.6x |
| Warm install (small, 50 packages) | 0.3s | 1.1s | 3.7x |
| Warm install (large, 800 packages) | 1.2s | 8.4s | 7.0x |
| CI with cache (GitHub Actions) | ~10s | ~40s | ~4x |

**Winner: Bun** — consistently 3-7x faster. Written in Zig with native binary resolution, parallel downloads, and optimized I/O. In real CI terms, this saves ~25-30s per workflow run.

**However:** Our CI workflows run lint, typecheck, unit tests, and RLS tests in parallel. Install time is only ~15% of total CI wall time. The bottleneck is test execution (unit tests ~15s, RLS tests ~25s, property tests ~11s), not installation.

Sources:
- [2026 Package Manager Showdown](https://dev.to/pockit_tools/pnpm-vs-npm-vs-yarn-vs-bun-the-2026-package-manager-showdown-51dc)
- [BetterStack: pnpm vs Bun Install](https://betterstack.com/community/guides/scaling-nodejs/pnpm-vs-bun-install-vs-yarn/)

### 2. Disk Space & Deduplication

| Feature | pnpm | Bun |
|---------|------|-----|
| Global content-addressable store | Yes (~/.pnpm-store) | No |
| Cross-project deduplication via hard links | Yes | No |
| Disk savings across multiple projects | Up to 70% | None |
| Single-project node_modules size | 205 MB (Vue benchmark) | 234 MB (Vue benchmark) |
| Isolated installs (strict deps) | Default | Opt-in (workspace default) |
| Phantom dependency prevention | Yes (symlink structure) | Yes (isolated mode only) |

**Winner: pnpm** — the content-addressable store with hard links is a genuine architectural advantage. On a dev machine with multiple Node projects, pnpm saves GBs of disk. Bun copies packages per-project.

For TenantFlow specifically (single project), the difference is ~30MB — negligible. But for developer machines with multiple repos, pnpm's global store matters.

Sources:
- [pnpm Motivation](https://pnpm.io/motivation)
- [Bun Isolated Installs](https://bun.com/docs/pm/isolated-installs)

### 3. Dependency Resolution & Overrides

| Feature | pnpm | Bun |
|---------|------|-----|
| Overrides/resolutions | Full support (nested + scoped) | Top-level only |
| Nested overrides (`foo>bar`) | Yes | **No** ([Issue #6608](https://github.com/oven-sh/bun/issues/6608)) |
| Strict peer deps | Configurable | Stricter by default |
| Catalog protocol | Yes (pnpm 9+) | No equivalent |
| Patching (`pnpm patch`) | Yes | No built-in equivalent |

**Winner: pnpm** — critically, TenantFlow uses 2 nested overrides:
```json
"@commitlint/config-validator>ajv": ">=8.18.0",
"@vercel/static-config>ajv": ">=8.18.0"
```
These would silently stop working with Bun. No workaround exists.

Sources:
- [Bun Overrides Docs](https://bun.com/docs/pm/overrides)
- [Nested overrides issue](https://github.com/oven-sh/bun/issues/6608)

### 4. Next.js 16 Compatibility

**This is the dealbreaker.**

| Issue | Status | Impact |
|-------|--------|--------|
| Segfault during `next build` finalization | Open ([#25864](https://github.com/oven-sh/bun/issues/25864), [#24186](https://github.com/oven-sh/bun/issues/24186)) | Build crashes in Docker/CI |
| Chunk loading failures during build | Open ([#24829](https://github.com/oven-sh/bun/issues/24829)) | Build failures |
| React Compiler + Turbopack worker error | Open ([#24419](https://github.com/oven-sh/bun/issues/24419)) | Build failures |
| `worker_threads` NotImplementedError | Open | Turbopack compatibility |
| Slow production apps in Docker | Reported | Runtime performance |

**Important distinction:** Using Bun as **package manager only** (`bun install` then `node next build`) avoids runtime segfaults. But this is a half-measure — you get install speed but still need Node.js installed everywhere, and the complexity of maintaining two runtimes outweighs the benefit.

Sources:
- [Next.js 16 Docker segfault](https://github.com/oven-sh/bun/issues/25864)
- [Next.js 16 build issue](https://github.com/oven-sh/bun/issues/24829)

### 5. Test Framework Compatibility

| Framework | Status with Bun |
|-----------|----------------|
| Vitest 4.0 | Issues with `bun:test` module bundling conflicts ([#1490](https://github.com/nuxt/test-utils/issues/1490)). Must use `bun run vitest`, not `bun test`. |
| Jest 30 | Bun has built-in Jest-compatible runner, but standard Jest works via `bun run jest` |
| Playwright 1.58 | **Not officially supported** ([#38095](https://github.com/microsoft/playwright/issues/38095)). Works in practice but unsupported. |

**Winner: pnpm (Node.js)** — all three frameworks are battle-tested on Node.js. On Bun, Vitest 4 has known bundling conflicts, and Playwright explicitly does not support Bun.

TenantFlow runs 985 unit tests (Vitest), 60 RLS tests (Jest), and a full E2E suite (Playwright). Risking test infrastructure stability for install speed is not worth it.

### 6. Dependabot & Security

| Feature | pnpm | Bun |
|---------|------|-----|
| Dependabot version updates | GA | GA (Feb 2025) |
| Dependabot security updates | Yes | **No** — planned but not shipped |
| Dependabot lockfile updates | Yes | Buggy ([#11602](https://github.com/dependabot/dependabot-core/issues/11602)) |
| Renovate support | Full | Supported with workspace edge cases |
| `pnpm audit` / `bun audit` | `pnpm audit` works | No `bun audit` command |

**Winner: pnpm** — the lack of Dependabot security updates is a significant gap. TenantFlow handles financial data (Stripe payments, tenant PII). Automated security patching is non-negotiable, not optional.

Sources:
- [Dependabot Bun GA](https://github.blog/changelog/2025-02-13-dependabot-version-updates-now-support-the-bun-package-manager-ga/)
- [Dependabot bun.lock issue](https://github.com/dependabot/dependabot-core/issues/11602)

### 7. CI/CD & Tooling

| Feature | pnpm | Bun |
|---------|------|-----|
| GitHub Actions setup | `pnpm/action-setup@v4` (mature) | `oven-sh/setup-bun@v2` (mature) |
| Vercel package install | Native, zero-config | Native, zero-config |
| Vercel runtime | Node.js (stable) | Beta (not recommended for production) |
| Lefthook compatibility | Full | Works but needs `bun x` for some commands |
| `actions/setup-node` cache | `cache: pnpm` built-in | `cache: bun` supported |

**Tie** — both have mature CI support. Bun setup is slightly simpler (no separate Node setup needed if using Bun runtime), but pnpm's ecosystem is more battle-tested.

### 8. Lockfile Format

| Feature | pnpm | Bun |
|---------|------|-----|
| Format | YAML (pnpm-lock.yaml) | JSONC (bun.lock, text-based since v1.2) |
| Human-readable | Yes | Yes |
| Git diff friendly | Yes | Yes |
| Merge conflict resolution | Manageable | Manageable |

**Tie** — both are text-based and reviewable in PRs. Bun's lockfile is reportedly 30% smaller.

### 9. Ecosystem Maturity & Stability

| Metric | pnpm | Bun |
|--------|------|-----|
| Open GitHub issues | ~800 | ~4,900 |
| Production track record | 7+ years | ~3 years (1.0 Sept 2023) |
| Enterprise adoption | Widely adopted (Vue, Vite, Nuxt, Astro) | Limited, cautious |
| Native module support | Full (delegates to npm/node-gyp) | Improved but edge cases remain |
| Community consensus | "Correct, stable, professional standard" | "Fast, exciting, still maturing" |

**Winner: pnpm** — 6x fewer open issues, 4+ more years of production hardening. The "Bun is fast, pnpm is correct" framing from the community captures it well.

Sources:
- [Bun quality concerns](https://github.com/oven-sh/bun/issues/27664)
- [Is Bun Production-Ready in 2026?](https://dev.to/last9/is-bun-production-ready-in-2026-a-practical-assessment-181h)
- [Bun is Fast, pnpm is Correct](https://dev.to/tumf/bun-is-fast-pnpm-is-correct-the-future-of-the-js-ecosystem-as-shown-by-two-package-managers-2l06)

---

## TenantFlow-Specific Assessment

### What we'd gain
- ~25-30s faster CI installs (currently ~40s cached → ~10s)
- Slightly faster local `bun install` (nice but infrequent)

### What we'd lose or risk
1. **Next.js 16 build stability** — documented segfaults in Docker/CI
2. **2 nested overrides** — `@commitlint/config-validator>ajv` and `@vercel/static-config>ajv` would stop working
3. **Dependabot security updates** — not available for Bun lockfiles
4. **Vitest 4 compatibility** — bundling conflicts with `bun:test` module
5. **Playwright official support** — unsupported runtime for E2E tests
6. **pnpm's global dedup** — lose cross-project disk savings on dev machines
7. **`pnpm audit`** — no equivalent in Bun
8. **Stability confidence** — 4,900 open issues vs 800

### Migration effort (if we did it)
- Update 4 CI workflows, lefthook.yml, 8 package.json script references
- Delete pnpm-lock.yaml, generate bun.lock
- Create bunfig.toml from .npmrc settings
- Rewrite 2 nested overrides (no workaround exists — would need to find alternative fixes)
- Test all 985 unit tests, 60 RLS tests, E2E suite
- Estimated effort: 2-4 hours + risk of ongoing instability

---

## Decision Matrix

| Criterion | Weight | pnpm | Bun | Notes |
|-----------|--------|------|-----|-------|
| Install speed | 15% | 3 | 5 | Bun is 4x faster |
| Disk efficiency | 10% | 5 | 3 | pnpm global store wins |
| Dependency resolution | 15% | 5 | 3 | Nested overrides blocker |
| Build stability (Next.js 16) | 20% | 5 | 1 | Segfaults are disqualifying |
| Test framework compat | 15% | 5 | 3 | Vitest/Playwright concerns |
| Security tooling | 15% | 5 | 2 | No Dependabot security updates |
| Ecosystem maturity | 10% | 5 | 3 | 6x fewer open issues |
| **Weighted Score** | **100%** | **4.75** | **2.65** | **pnpm wins decisively** |

---

## Recommendation

**Stay on pnpm 10.** The ~25s CI speed gain does not justify:
- Build segfaults on Next.js 16
- Loss of Dependabot security updates for a financial SaaS
- Breaking 2 nested dependency overrides
- Risking test infrastructure stability

### When to re-evaluate
- Bun 1.4+ ships with Next.js 16 segfault fixes resolved
- Bun adds nested override support ([#6608](https://github.com/oven-sh/bun/issues/6608))
- Dependabot ships security update support for Bun
- Playwright officially supports Bun runtime

### Hybrid approach (not recommended now, but viable later)
Use `bun install` as package manager only + Node.js for runtime. This captures install speed without runtime risks. However, maintaining two runtimes adds complexity, and the nested overrides blocker still applies.

---

## Sources

- [2026 Package Manager Showdown](https://dev.to/pockit_tools/pnpm-vs-npm-vs-yarn-vs-bun-the-2026-package-manager-showdown-51dc)
- [BetterStack: pnpm vs Bun Install vs Yarn Berry](https://betterstack.com/community/guides/scaling-nodejs/pnpm-vs-bun-install-vs-yarn/)
- [Bun is Fast, pnpm is Correct](https://dev.to/tumf/bun-is-fast-pnpm-is-correct-the-future-of-the-js-ecosystem-as-shown-by-two-package-managers-2l06)
- [Is Bun Production-Ready in 2026?](https://dev.to/last9/is-bun-production-ready-in-2026-a-practical-assessment-181h)
- [Bun Overrides and Resolutions](https://bun.com/docs/pm/overrides)
- [Bun Nested Overrides Issue #6608](https://github.com/oven-sh/bun/issues/6608)
- [Bun Quality Concerns #27664](https://github.com/oven-sh/bun/issues/27664)
- [Dependabot Bun GA Announcement](https://github.blog/changelog/2025-02-13-dependabot-version-updates-now-support-the-bun-package-manager-ga/)
- [Dependabot bun.lock Issue #11602](https://github.com/dependabot/dependabot-core/issues/11602)
- [Vercel Bun Support](https://vercel.com/changelog/bun-install-is-now-supported-with-zero-configuration)
- [Bun + Next.js 16 Segfault #25864](https://github.com/oven-sh/bun/issues/25864)
- [Bun + Next.js Build Crash #24186](https://github.com/oven-sh/bun/issues/24186)
- [Playwright Bun Support Request #38095](https://github.com/microsoft/playwright/issues/38095)
- [Vitest + Bun bun:test Conflict #1490](https://github.com/nuxt/test-utils/issues/1490)
- [pnpm 10 Benchmarks](https://pnpm.io/benchmarks)
- [pnpm in 2025 Blog](https://pnpm.io/blog/2025/12/29/pnpm-in-2025)
- [Bun Isolated Installs](https://bun.com/docs/pm/isolated-installs)
