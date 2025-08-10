# Security Scanning Workflow Guide

This document explains the automated security scanning system implemented for TenantFlow.

## 🔒 Security Scan Overview

The security scanning workflow (`security-scan.yml`) provides comprehensive security analysis across multiple dimensions:

### Scan Types

1. **Secret Detection (GitGuardian)**
   - Detects API keys, passwords, tokens, and certificates
   - Scans entire git history for leaked credentials
   - Runs on all push/PR events

2. **Static Application Security Testing (SAST) - Semgrep**
   - Identifies security vulnerabilities in source code
   - Covers OWASP Top 10 and language-specific security patterns
   - Optimized for TypeScript, React, Node.js, and Next.js

3. **Dependency Vulnerability Scanning (npm audit)**
   - Scans npm packages for known security vulnerabilities
   - Focuses on high and critical severity issues
   - Monitors both direct and transitive dependencies

4. **Docker Security Scanning (Trivy)**
   - Analyzes Docker images and configurations
   - Detects vulnerabilities in base images and dependencies
   - Runs only when Dockerfiles are modified

## 🚀 Workflow Triggers

### Automatic Triggers
- **Push to main**: Full security scan
- **Pull Requests**: Smart scanning based on changed files
- **Weekly Schedule**: Complete security audit every Sunday at 2 AM UTC

### Manual Triggers
```bash
# Via GitHub UI: Actions → Security Scan → Run workflow
# Options:
# - full: Complete security scan
# - secrets-only: Only secret detection
# - dependencies-only: Only dependency vulnerabilities
# - sast-only: Only static code analysis
```

## ⚡ Performance Optimizations

### Smart Change Detection
The workflow automatically detects relevant changes to optimize scan time:
- Code changes → Run SAST and secret detection
- Dependency changes → Run dependency vulnerability scan
- Config changes → Run Docker security scan
- Documentation only → Skip all security scans

### Aggressive Caching
- **GitGuardian**: Cache scan rules and results
- **Semgrep**: Cache rules database and analysis results
- **Dependencies**: Cache node_modules for faster audit
- **Docker**: Cache Trivy database updates

### Parallel Execution
All security scans run in parallel when possible, reducing total scan time from ~15 minutes to ~5-8 minutes.

## 📊 Results and Reporting

### GitHub Security Tab Integration
Security findings are automatically uploaded to GitHub's Security tab:
- **Code Scanning**: SAST results from Semgrep
- **Secret Scanning**: Detected secrets (when GitGuardian is configured)
- **Dependabot**: Vulnerability alerts for dependencies

### Artifacts
Each scan produces downloadable artifacts:
- `gitguardian-results`: JSON report of secret detection
- `semgrep-results`: SARIF format for code scanning
- `dependency-scan-results`: NPM audit results and summary
- `docker-security-results`: Container vulnerability report
- `security-summary`: Overall security posture report

### PR Integration
Security scan status is visible on pull requests:
- ✅ Security scans passed
- ⚠️ Security issues detected (review required)
- ❌ Critical security issues found (fix required)

## 🛠️ Configuration

### Required Secrets (Optional but Recommended)
```bash
# GitHub Secrets to configure:
GITGUARDIAN_API_KEY=your_gitguardian_api_key
SEMGREP_APP_TOKEN=your_semgrep_token
```

### Customizing Scans

#### Semgrep Rules
Edit `.semgrepignore` to exclude files/directories:
```bash
# Add to .semgrepignore
test-data/
legacy-code/
third-party/
```

#### Security Thresholds
Currently configured as warnings (non-blocking). To make security issues block CI, uncomment the `exit 1` lines in the workflow.

## 🚨 Handling Security Findings

### Severity Levels
1. **Critical**: Immediate fix required (exposed secrets, RCE vulnerabilities)
2. **High**: Fix within 24-48 hours (SQL injection, XSS, auth bypasses)
3. **Medium**: Fix within 1 week (security misconfigurations)
4. **Low**: Fix when convenient (code quality, best practices)

### Common Remediation Actions

#### Secret Detection
```bash
# If secrets are detected:
1. Immediately rotate/revoke the exposed credentials
2. Remove secrets from git history:
   git filter-repo --path-glob '**/*secret*' --invert-paths
3. Add proper .gitignore patterns
4. Use environment variables or secret management
```

#### Dependency Vulnerabilities
```bash
# Update vulnerable dependencies:
npm audit fix
npm update

# For unfixable vulnerabilities:
npm audit --audit-level=high
# Review each package and consider alternatives
```

#### Code Security Issues
```bash
# Review Semgrep findings:
# 1. Check GitHub Security tab for detailed reports
# 2. Address high/critical issues first
# 3. Use secure coding patterns:
#    - Input validation and sanitization
#    - Parameterized queries
#    - Secure authentication/authorization
#    - Proper error handling
```

## 🔄 Continuous Improvement

### Weekly Security Review
Every Sunday, review the automated security scan results:
1. Check the security summary artifact
2. Prioritize and assign security findings
3. Update security scanning rules if needed
4. Review and rotate secrets/tokens

### Metrics to Track
- Number of security findings by severity
- Time to remediate security issues
- Coverage of security scanning across codebase
- False positive rate and rule tuning

## 📝 Integration with Development Workflow

### Pre-Commit (Recommended)
```bash
# Install pre-commit hook for local secret scanning:
pip install pre-commit
echo "repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
" > .pre-commit-config.yaml
pre-commit install
```

### IDE Integration
- **VS Code**: Install Semgrep extension for real-time SAST
- **IntelliJ**: Enable security vulnerability scanning plugins

### Branch Protection Rules
Configure branch protection to require security status checks:
```bash
# GitHub Settings → Branches → main → Add rule:
☑ Require status checks to pass before merging
☑ Require branches to be up to date before merging
☑ Status checks: "Security Status Check"
```

## 🆘 Troubleshooting

### Common Issues

#### Workflow Timeout
```yaml
# If scans timeout, increase timeout values in security-scan.yml:
timeout-minutes: 20  # Increase from 15
env:
  SEMGREP_TIMEOUT: 600  # Increase from 300
```

#### High False Positive Rate
```bash
# Tune Semgrep rules by updating the workflow:
config: >-
  auto
  p/security-audit
  # Remove noisy rule sets:
  # p/owasp-top-ten
```

#### Memory Issues
```yaml
# Increase memory limits:
env:
  SEMGREP_MAX_MEMORY: 8192  # Increase from 4096
```

### Getting Help
- Review security scan artifacts for detailed findings
- Check GitHub Security tab for remediation guidance
- Consult OWASP guidelines for secure coding practices
- Reach out to the security team for critical findings

---

**Security is everyone's responsibility.** Regular scanning and prompt remediation of security findings helps maintain the security posture of TenantFlow.