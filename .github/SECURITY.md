# Security Policy

TenantFlow is a multi-tenant property management platform that handles sensitive
personal, financial, and lease data. We take security seriously and appreciate
responsible disclosure.

---

## Supported Versions

TenantFlow is a cloud-hosted SaaS — there are no versioned releases to patch
separately. The production deployment is always the current supported version.
Security fixes ship to production as soon as they are validated.

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

### Preferred: GitHub Private Reporting

Use the **[Report a vulnerability](../../security/advisories/new)** button in
the Security tab. This opens a private draft advisory that only maintainers can
see — your report is never publicly visible until we explicitly publish it after
a fix is deployed.

### Alternative: Email

[support@tenantflow.app](mailto:support@tenantflow.app)

Encrypt sensitive reports with our public key if possible. Include:
- A clear description of the vulnerability
- Steps to reproduce (proof of concept if applicable)
- The potential impact and affected components
- Any suggested mitigations you have in mind

---

## What to Expect

| Stage | Timeline |
|-------|----------|
| Acknowledgment | Within 48 hours |
| Initial triage (valid / not valid) | Within 5 business days |
| Status updates | Every 7 days until resolved |
| Critical / High severity fix | Within 14 days |
| Medium severity fix | Within 45 days |
| Low severity fix | Within 90 days |

If a reported timeline cannot be met we will communicate that proactively
rather than go silent.

---

## Scope

The following are in scope for vulnerability reports:

**High priority**
- Cross-tenant data access — one owner or tenant reading/writing another's data
- Authentication bypass — accessing protected routes or data without valid credentials
- Row-Level Security (RLS) policy bypasses on any Supabase table
- Payment data exposure or Stripe integration vulnerabilities
- Privilege escalation — tenant acting as owner, or owner acting across organizations

**Also in scope**
- Injection attacks (SQL, command, template)
- Cross-site scripting (XSS) — stored or reflected
- Cross-site request forgery (CSRF)
- Insecure direct object references (IDOR)
- Sensitive data exposure in API responses, logs, or error messages
- Server-Side Request Forgery (SSRF)
- Broken access control in Edge Functions or API routes
- Dependency vulnerabilities with a realistic exploit path in this codebase

---

## Out of Scope

The following will not be accepted as valid vulnerability reports:

- Vulnerabilities in third-party services (Supabase, Stripe, Vercel, GitHub) — report those directly to the vendor
- Attacks requiring physical access to a device
- Social engineering or phishing of users or staff
- Automated scanner output without proof of exploitability
- Rate limiting or brute force on non-sensitive endpoints
- Missing security headers with no demonstrated impact
- Self-XSS (exploiting your own browser/session)
- Denial of service via resource exhaustion without a clear amplification factor
- Bugs in software we do not control

---

## Disclosure Policy

We follow a **90-day coordinated disclosure** timeline from the date of your
initial report. If a fix cannot be shipped within 90 days we will communicate
the delay and agree on an extension. After the fix is deployed we will work
with you on the timing of public disclosure and will credit you by name (or
handle) unless you prefer to remain anonymous.

---

## Safe Harbor

TenantFlow will not pursue legal action against security researchers who:

- Report vulnerabilities through the channels above in good faith
- Avoid accessing, modifying, or deleting data beyond what is needed to
  demonstrate the vulnerability
- Do not perform attacks that degrade service availability
- Do not disclose the vulnerability publicly before the agreed disclosure date
- Limit testing to accounts you own or have explicit permission to test

---

## Acknowledgments

We maintain a hall of fame for researchers who report valid, in-scope
vulnerabilities. If you would like to be credited, include your preferred
name or handle in your report.
