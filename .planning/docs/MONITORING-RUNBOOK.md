# Monitoring Runbook

TenantFlow production monitoring reference guide.

## Health Endpoints Reference

All health endpoints are prefixed with `/api/v1/health`.

| Endpoint | Type | Purpose | Expected Response |
|----------|------|---------|-------------------|
| `/health/ping` | Liveness | Basic app responsiveness | `200 OK` with `{ status: 'ok' }` |
| `/health/ready` | Readiness | App ready to serve traffic (DB + Redis connected) | `200 OK` with connection status |
| `/health` | Full | Complete health check with all dependencies | `200 OK` with detailed status |
| `/health/stripe-sync` | Service | Stripe sync service status | `200 OK` with `{ status: 'healthy' }` |
| `/health/performance` | Metrics | Performance metrics and timing | `200 OK` with metrics data |
| `/health/circuit-breaker` | Resilience | Circuit breaker states | `200 OK` with circuit states |

### When to Use Each Endpoint

- **Kubernetes Liveness Probe**: `/health/ping` (lightweight, fast)
- **Kubernetes Readiness Probe**: `/health/ready` (checks dependencies)
- **Load Balancer Health Check**: `/health/ping` or `/health/ready`
- **Monitoring Dashboard**: `/health` (complete picture)
- **Payment System Check**: `/health/stripe-sync`
- **Performance Monitoring**: `/health/performance`
- **Fault Tolerance Status**: `/health/circuit-breaker`

## Alert Thresholds

### Database Response Time

| Level | Threshold | Action |
|-------|-----------|--------|
| Normal | < 100ms | No action |
| Warning | 100-500ms | Monitor, investigate if sustained |
| Critical | > 500ms | Immediate investigation |

### API Latency (p95)

| Level | Threshold | Action |
|-------|-----------|--------|
| Normal | < 200ms | No action |
| Warning | 200-500ms | Review slow endpoints |
| Critical | > 500ms | Scale up, optimize queries |

### Memory Usage

| Level | Threshold | Action |
|-------|-----------|--------|
| Normal | < 80% | No action |
| Warning | 80-90% | Monitor, prepare to scale |
| Critical | > 90% | Scale immediately, investigate leaks |

### Error Rate

| Level | Threshold | Action |
|-------|-----------|--------|
| Normal | < 1% | No action |
| Warning | 1-5% | Investigate error patterns |
| Critical | > 5% | Incident response |

## Escalation Matrix

### Warning Level

**Notification**: Slack #alerts channel

**Examples**:
- DB response time 100-500ms for 5+ minutes
- Memory usage above 80%
- Error rate 1-5%
- Non-critical health check degraded

**Response Time**: Within 1 hour during business hours

### Critical Level

**Notification**: Slack #alerts + PagerDuty on-call

**Examples**:
- DB response time > 500ms
- Memory usage > 90%
- Error rate > 5%
- Any health endpoint returning non-200
- Circuit breaker in OPEN state

**Response Time**: Within 15 minutes, 24/7

### Payment Critical

**Notification**: Slack #alerts + PagerDuty + Engineering Lead

**Examples**:
- `/health/stripe-sync` unhealthy
- Stripe webhook processing failures
- Payment intent creation failures > 1%

**Response Time**: Within 5 minutes, 24/7

## Smoke Test Usage

### Local Development

```bash
# Start backend first
pnpm dev:backend

# Run smoke tests (new terminal)
pnpm test:smoke
```

### CI/CD Pipeline

Add to deployment workflow after deploy step:

```yaml
- name: Post-Deploy Smoke Test
  run: |
    BACKEND_URL=${{ secrets.PRODUCTION_API_URL }} pnpm test:smoke
  timeout-minutes: 2
```

### Manual Production Verification

```bash
# Production
BACKEND_URL=https://api.tenantflow.app pnpm test:smoke

# Staging
BACKEND_URL=https://api-staging.tenantflow.app pnpm test:smoke
```

### Expected Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TenantFlow Smoke Test
  Target: https://api.tenantflow.app
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Testing: Liveness Probe (/health/ping)
✓ PASS Liveness Probe (0.045s)
Testing: Readiness Probe (/health/ready)
✓ PASS Readiness Probe (0.089s)
Testing: Stripe Sync Status (/health/stripe-sync)
✓ PASS Stripe Sync Status (0.112s)
Testing: Full Health Check (/health)
✓ PASS Full Health Check (0.156s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Passed: 4
  Failed: 0

All smoke tests passed!
```

## Troubleshooting Guide

### Liveness Probe Failing (`/health/ping`)

**Symptoms**: Pod restarts, 502 errors

**Possible Causes**:
1. Application crash/hang
2. Out of memory
3. Infinite loop in request handler

**Remediation**:
1. Check pod logs: `kubectl logs <pod-name>`
2. Check memory usage: `kubectl top pod <pod-name>`
3. Restart if hung: `kubectl delete pod <pod-name>`
4. Review recent deployments

### Readiness Probe Failing (`/health/ready`)

**Symptoms**: Pod not receiving traffic, 503 errors

**Possible Causes**:
1. Database connection lost
2. Redis connection lost
3. Network partition

**Remediation**:
1. Check database connectivity: `pg_isready -h <host>`
2. Check Redis connectivity: `redis-cli ping`
3. Verify network policies
4. Check connection pool exhaustion

### Stripe Sync Unhealthy (`/health/stripe-sync`)

**Symptoms**: Payment failures, stale data

**Possible Causes**:
1. Stripe API errors
2. Webhook signature verification failing
3. Sync worker crashed

**Remediation**:
1. Check Stripe dashboard for incidents
2. Verify webhook secret is correct
3. Check sync worker logs
4. Manually trigger resync if needed

### High Database Latency

**Symptoms**: Slow API responses, timeouts

**Possible Causes**:
1. Missing indexes
2. Lock contention
3. Connection pool exhaustion
4. Database under-provisioned

**Remediation**:
1. Check slow query log
2. Review `pg_stat_activity` for locks
3. Increase connection pool size
4. Add missing indexes
5. Scale database instance

### High Error Rate

**Symptoms**: User-facing errors, alert notifications

**Possible Causes**:
1. Deployment bug
2. Third-party service outage
3. Invalid data/state

**Remediation**:
1. Check Sentry for error patterns
2. Review recent deployments
3. Check third-party status pages
4. Rollback if deployment-related

### Circuit Breaker Open

**Symptoms**: Degraded functionality, fast failures

**Possible Causes**:
1. Downstream service failure
2. Network issues
3. Rate limiting

**Remediation**:
1. Check which circuit is open via `/health/circuit-breaker`
2. Investigate downstream service
3. Circuit will auto-recover when downstream healthy
4. If persistent, consider fallback strategy

## Contact Information

- **On-Call Engineering**: PagerDuty rotation
- **Slack Channel**: #engineering-alerts
- **Incident Command**: #incident-response (during active incidents)
