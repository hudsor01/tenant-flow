# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Use [GitHub's private vulnerability reporting](https://github.com/hudsor01/tenant-flow/security/advisories/new) to report vulnerabilities. You will receive a response within 48 hours.

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Security Measures

This project implements:

- **Row Level Security (RLS)** on all Supabase tables — the only access control layer
- **Secret scanning** with push protection enabled
- **Dependabot** security updates with automated patching
- **CodeQL** static analysis on every PR and weekly schedule
- **CSP headers** and security response headers via Next.js middleware
- **No service role key** on the client — all queries use the authenticated user's JWT

## Disclosure Policy

When a vulnerability is reported:

1. We confirm receipt within 48 hours
2. We investigate and determine impact within 7 days
3. We develop and test a fix
4. We release the fix and publish a security advisory
5. We credit the reporter (unless they prefer anonymity)
