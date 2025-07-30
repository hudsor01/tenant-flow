# TenantFlow CI/CD Test Automation System

This directory contains a comprehensive GitHub Actions-based CI/CD test automation system designed to ensure MVP quality and reliability for TenantFlow. The system provides fast feedback loops, smart test selection, and comprehensive validation coverage.

## 🏗️ Workflow Architecture

### Core Workflows

1. **`ci.yml`** - Main CI Pipeline (Orchestrator)
   - Intelligent test strategy selection
   - Conditional workflow execution
   - Comprehensive status reporting
   - PR commenting and summaries

2. **`test-unit.yml`** - Fast Unit Tests (< 2 minutes)
   - Matrix testing across workspaces
   - Smart change detection
   - Coverage reporting
   - Turbo caching optimization

3. **`test-integration.yml`** - Integration Tests (< 5 minutes)
   - PostgreSQL service integration
   - API endpoint validation
   - Database interaction testing
   - Health check verification

4. **`test-e2e-smoke.yml`** - Critical E2E Flows (< 10 minutes)
   - Essential user journey validation
   - Single browser (Chromium) testing
   - Fast failure detection
   - PR-optimized execution

5. **`test-e2e-full.yml`** - Comprehensive E2E Suite (< 30 minutes)
   - Multi-browser testing (Chrome, Firefox, Safari)
   - Complete user journey coverage
   - Mobile device testing
   - Release validation

6. **`test-stripe.yml`** - Payment Flow Validation (< 5 minutes)
   - Stripe API integration testing
   - Payment flow validation
   - Webhook processing verification
   - MCP server integration support

7. **`test-performance.yml`** - Performance & Load Testing
   - API performance benchmarking
   - Frontend Core Web Vitals
   - Load testing with k6
   - Performance regression detection

8. **`test-cross-browser.yml`** - Cross-Browser Matrix Testing
   - Multi-browser compatibility testing
   - Mobile device validation
   - Visual regression testing
   - Accessibility compliance checks

9. **`test-nightly-regression.yml`** - Comprehensive Nightly Testing
   - Full regression test suite
   - Large-scale data testing
   - Security vulnerability scanning
   - Automated issue creation

## 🚀 Test Execution Strategy

### Smart Test Selection

The system automatically determines which tests to run based on:

- **Branch Context**: Main, develop, and feature branches have different test strategies
- **File Changes**: Specific file patterns trigger relevant test suites
- **PR Labels**: Manual control via GitHub labels
- **Manual Override**: Force full test suite execution

### Test Strategy Matrix

| Context | Unit | Integration | E2E Smoke | E2E Full | Stripe | Performance | Cross-Browser |
|---------|------|-------------|-----------|----------|---------|-------------|---------------|
| Feature PR | ✅ | ✅ | 🔍¹ | ❌ | 🔍² | ❌ | ❌ |
| Develop | ✅ | ✅ | ✅ | ❌ | 🔍² | ❌ | ❌ |
| Main | ✅ | ✅ | ✅ | ❌ | 🔍² | ✅ | ❌ |
| Release | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Nightly | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

¹ *Runs if frontend changes detected*  
² *Runs if Stripe-related changes detected*

## 🎯 Performance Targets

### Speed Targets
- **Unit Tests**: < 2 minutes (parallelized across workspaces)
- **Integration Tests**: < 5 minutes (optimized database setup)
- **E2E Smoke Tests**: < 10 minutes (critical flows only)
- **E2E Full Suite**: < 30 minutes (comprehensive validation)
- **Stripe Tests**: < 5 minutes (focused payment flows)

### Quality Gates
- **Code Coverage**: 80% minimum for unit tests
- **API Response Time**: P95 < 500ms
- **Frontend FCP**: < 2.5 seconds
- **Error Rate**: < 5% under load
- **Cross-Browser Compatibility**: 90%+ pass rate

## 🏷️ GitHub Labels for Test Control

Use these labels on PRs to control test execution:

- `e2e` - Run E2E smoke tests
- `e2e:full` - Run comprehensive E2E suite
- `performance` - Include performance testing
- `cross-browser` - Run cross-browser compatibility tests
- `stripe` - Force Stripe payment testing
- `security` - Include security scanning

## 🔧 Environment Variables & Secrets

### Required Secrets

```bash
# Database
DATABASE_URL=postgresql://...
TEST_DATABASE_URL=postgresql://...

# Supabase
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe (Test Keys Only)
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_test_...
VITE_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...

# Turbo (Optional)
TURBO_TOKEN=...
TURBO_TEAM=...
```

### Optional Test Secrets

```bash
# Enhanced Testing
E2E_TEST_USER_EMAIL=test@example.com
E2E_TEST_USER_PASSWORD=TestPassword123!
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Notifications (Future)
SLACK_WEBHOOK_URL=...
DISCORD_WEBHOOK_URL=...
```

## 📊 Test Result Reporting

### Automated Reports
- **GitHub Step Summary**: Detailed test results in workflow runs
- **PR Comments**: Automated status updates on pull requests
- **Artifact Storage**: Test reports, screenshots, and coverage data
- **Issue Creation**: Automatic issues for nightly test failures

### Coverage & Metrics
- **Unit Test Coverage**: Uploaded to Codecov/similar service
- **Performance Metrics**: Stored for trend analysis
- **Visual Regression**: Screenshot comparisons across browsers
- **Accessibility Reports**: WCAG compliance validation

## 🛠️ Local Development Integration

### Running Tests Locally

```bash
# Unit tests (fast feedback)
npm run test:unit

# Integration tests (requires database)
npm run test:integration

# E2E tests (requires running services)
npm run test:e2e

# Performance tests (requires services)
npm run test:performance

# All tests
npm run test:all
```

### Debugging Failed Tests

1. **Check Workflow Logs**: Detailed execution logs in GitHub Actions
2. **Download Artifacts**: Screenshots, videos, and test reports
3. **Local Reproduction**: Use same environment setup locally
4. **Debug Mode**: Enable verbose logging with environment variables

## 🔒 Security & Compliance

### Security Features
- **Dependency Scanning**: npm audit and vulnerability detection
- **Secret Management**: Secure handling of API keys and tokens
- **Access Control**: Limited permissions for workflow execution
- **Test Isolation**: Separate databases and environments

### Compliance Checks
- **GDPR**: Data handling validation in E2E tests
- **PCI**: Stripe integration security validation
- **Accessibility**: WCAG 2.1 AA compliance testing
- **Security Headers**: HTTP security header validation

## 📈 Monitoring & Alerting

### Failure Handling
- **Automatic Retries**: Flaky test retry mechanisms
- **Failure Notifications**: Immediate alerts for critical failures
- **Issue Tracking**: Automated GitHub issue creation
- **Trend Analysis**: Performance and reliability tracking

### Success Metrics
- **Test Reliability**: Flaky test identification and resolution
- **Execution Speed**: Performance optimization tracking
- **Coverage Trends**: Code coverage improvement tracking
- **Deployment Confidence**: Release readiness scoring

## 🚀 Deployment Gates

### Quality Gates
- **All Unit Tests**: Must pass for merge eligibility
- **Integration Tests**: Required for main branch
- **E2E Smoke Tests**: Critical for production deployment
- **Security Scan**: Must pass with no high-severity issues

### Release Process Integration
1. **Feature PR**: Unit + Integration + Smart E2E
2. **Main Branch**: + Performance validation
3. **Release Tag**: Full test suite including cross-browser
4. **Production Deploy**: Manual approval after all tests pass

## 📝 Maintenance & Updates

### Regular Maintenance Tasks
- **Dependency Updates**: Keep test dependencies current
- **Browser Updates**: Update Playwright browser versions
- **Test Data Refresh**: Update seed data for realistic testing
- **Performance Baselines**: Update performance thresholds

### Workflow Updates
- **Version Pinning**: Keep GitHub Actions versions pinned
- **Cache Optimization**: Regularly review and optimize caching
- **Timeout Adjustments**: Adjust based on actual execution times
- **Resource Optimization**: Monitor and optimize runner usage

## 🔍 Troubleshooting Guide

### Common Issues

**Slow Test Execution**
- Check Turbo cache utilization
- Review parallel execution configuration
- Optimize test data setup/teardown

**Flaky E2E Tests**
- Increase timeouts for network operations
- Add explicit waits for dynamic content
- Review element selectors for stability

**Database Connection Failures**
- Verify service health checks
- Check connection string formatting
- Review timeout configurations

**Build Failures**
- Check dependency installation
- Verify environment variable setup
- Review Prisma client generation

### Getting Help

1. **Check Workflow Logs**: Detailed error messages and stack traces
2. **Review Documentation**: This README and workflow comments
3. **Check Issues**: Look for similar problems in GitHub issues
4. **Team Slack**: Post in #engineering for immediate help

---

## 🎉 Getting Started

1. **Review Current Setup**: Ensure all secrets are configured
2. **Test Locally**: Run unit tests to verify environment
3. **Create Test PR**: Verify CI pipeline execution
4. **Add Labels**: Experiment with different test strategies
5. **Monitor Results**: Check reports and optimize as needed

This comprehensive test automation system ensures TenantFlow maintains MVP quality while enabling rapid development and deployment. The smart test selection and parallel execution provide fast feedback while comprehensive coverage ensures reliability at scale.