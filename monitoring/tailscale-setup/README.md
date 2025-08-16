# TenantFlow Monitoring Setup via Tailscale

## 🎯 Architecture Overview

```
[App Server - 30+ containers]          [Your Local Monitoring Server]
TenantFlow Frontend :3004               Prometheus :19090 (512MB RAM)
TenantFlow Backend :3001                Grafana :13000 (256MB RAM)
Tailscale IP: 100.x.x.x                 Tailscale IP: 100.y.y.y
                    ↓
            (Scrapes via Tailscale network)
```

**Total Additional Resource Usage: ~768MB RAM, 0.8 CPU cores**

## 🚀 Quick Setup

### Step 1: Get Your Tailscale IPs

```bash
# On both servers, run:
tailscale ip -4

# Note down:
# App server IP: 100.x.x.x
# Monitoring server IP: 100.y.y.y
```

### Step 2: Update Config Files

1. Edit `prometheus-tailscale.yml`:
    - Replace `100.x.x.x` with your app server's Tailscale IP
2. Edit `docker-compose.yml`:
    - Replace `100.x.x.y` with your monitoring server's Tailscale IP

### Step 3: Add Metrics Endpoint to TenantFlow

Add this to your TenantFlow app (we'll create it):

```typescript
// app/api/metrics/route.ts
export async function GET() {
	// Prometheus metrics format
	const metrics = await generatePrometheusMetrics()
	return new Response(metrics, {
		headers: { 'Content-Type': 'text/plain' }
	})
}
```

### Step 4: Start Monitoring Stack

```bash
# On your monitoring server
cd monitoring/tailscale-setup
docker-compose up -d

# Check it's running
docker-compose ps
```

### Step 5: Access Dashboards

- **Prometheus**: http://100.y.y.y:19090
- **Grafana**: http://100.y.y.y:13000 (admin/changeme123)
- **Uptime Kuma**: http://100.y.y.y:13001

## 🔧 Port Allocation (Conflict-Free)

| Service     | Port  | Purpose           |
| ----------- | ----- | ----------------- |
| Prometheus  | 19090 | Metrics storage   |
| Grafana     | 13000 | Dashboards        |
| Uptime Kuma | 13001 | Simple monitoring |

These ports are intentionally non-standard to avoid conflicts with your existing containers.

## 💾 Data Storage

Data is stored in Docker volumes:

- `prometheus_data`: Metrics (5GB max, 30 days retention)
- `grafana_data`: Dashboards and config
- `uptime-kuma-data`: Uptime monitoring

## 🔒 Security

- All communication via Tailscale (encrypted)
- No public internet exposure
- Services only accessible on your private network
- Default passwords should be changed

## 📊 What You'll Monitor

1. **Auth System Health** - Your new health check endpoint
2. **App Performance** - Response times, error rates
3. **System Resources** - If you add node exporter to app server
4. **Website Uptime** - External monitoring of tenantflow.app

## 🎚️ Resource Management

The setup is optimized for environments with many containers:

- **Memory limits**: Prometheus 512MB, Grafana 256MB
- **CPU limits**: 0.5 + 0.3 = 0.8 cores total
- **Storage**: 5GB max for metrics
- **Network**: Minimal impact via Tailscale

## 📈 Next Steps

1. Set up the metrics endpoint in your app
2. Create custom dashboards for your business metrics
3. Configure alerts for critical issues
4. Optional: Add more exporters for detailed monitoring

## 🔧 Troubleshooting

**Can't connect to app server?**

```bash
# Test Tailscale connectivity
ping 100.x.x.x
curl http://100.x.x.x:3004/api/health
```

**Port conflicts?**
Edit docker-compose.yml and change port mappings:

```yaml
ports:
    - '19091:9090' # Change first number
```

**High resource usage?**
Reduce retention and limits in docker-compose.yml:

```yaml
mem_limit: 256m # Reduce memory
cpus: 0.25 # Reduce CPU
```
