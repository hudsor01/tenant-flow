# Security Policy

## Known Vulnerabilities

### validator.js CVE-2025-56200 (CVSS 6.1 - Medium)

**Status**: Dismissed (Tolerable Risk)
**Vulnerability**: URL validation bypass in `isURL()` function (versions ≤13.15.15)
**Dependency Chain**: `@nestjs/terminus` → `@nestjs/common` → `class-validator` → `validator@13.15.15`

**Our Risk Assessment**: LOW
- validator.js is a transitive dependency, not used directly in application code
- Only present in `@nestjs/terminus` for health check endpoints
- Health check endpoints do not process user input through validator.js
- No user-supplied URLs are validated using the vulnerable function
- The vulnerable `isURL()` function is never called in our codebase

**Mitigation Strategy**:
1. Monitor validator.js releases for security patches
2. Upgrade immediately when patched version becomes available
3. Current version: 13.15.15 (latest available, no patch yet)
4. Dependabot alert #25 dismissed as tolerable risk (2025-10-24)

**Workaround**: Not required - the vulnerable code path is not exercised in our application.

**References**:
- GitHub Dependabot Alert: #25 (dismissed)
- CVE-2025-56200
- Affected Package: validator@13.15.15
- Dismissed Date: 2025-10-24
- Reason: Tolerable risk - transitive dependency with no vulnerable code paths in application

---

## Resolved Vulnerabilities

### esbuild Development Server Request Bypass (Fixed)

**Status**: RESOLVED
**Vulnerability**: esbuild development server could process requests from any website
**Fix Date**: 2025-10-24
**Resolution**: Added pnpm override to force esbuild@^0.25.11 across all transitive dependencies
**Previous Version**: 0.14.47 (via @vercel/node)
**Current Version**: 0.25.11

**Details**:
- Added `"esbuild": "^0.25.11"` to `pnpm.overrides` in root package.json
- Affects development environment only (not production builds)
- All esbuild instances now running patched version

---

## Reporting Security Issues

If you discover a security vulnerability in TenantFlow, please email security@tenantflow.app with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if any)

**Do not** create public GitHub issues for security vulnerabilities.

---

## Security Best Practices

This project follows:
- NestJS security best practices
- OWASP Top 10 mitigation strategies
- Supabase Row Level Security (RLS) for data access control
- Stripe PCI-compliant payment processing
- Environment variable isolation via Doppler

---

**Last Updated**: 2025-10-24
