# TenantFlow Backend Deployment Instructions for Ubuntu Server

## Instructions for Claude on Ubuntu Server

Copy this entire document and give it to Claude on your Ubuntu server. Claude will execute these steps to deploy the TenantFlow backend.

---

## Claude, please follow these steps to deploy TenantFlow Backend:

### 1. Initial Setup

First, create the deployment directory and clone the repository:

```bash
# Create directory for TenantFlow
sudo mkdir -p /opt/tenantflow
sudo chown $USER:$USER /opt/tenantflow
cd /opt/tenantflow

# Clone the repository
git clone https://github.com/[USERNAME]/tenant-flow.git .
```

### 2. Create Environment File

Create the environment file with all required variables:

```bash
# Create .env.production file
cat > /opt/tenantflow/.env.production << 'EOF'
# Database (Supabase)
DATABASE_URL=postgresql://[USER]:[PASSWORD]@[HOST]:5432/[DATABASE]?schema=public
DIRECT_URL=postgresql://[USER]:[PASSWORD]@[HOST]:5432/[DATABASE]?schema=public

# Supabase
SUPABASE_URL=https://[PROJECT_ID].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]

# JWT/Auth
JWT_SECRET=[YOUR_JWT_SECRET]
JWT_EXPIRATION=7d

# Stripe
STRIPE_SECRET_KEY=[YOUR_STRIPE_SECRET_KEY]
STRIPE_WEBHOOK_SECRET=[YOUR_STRIPE_WEBHOOK_SECRET]

# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

# CORS
CORS_ORIGIN=https://tenantflow.app

# Logging
LOG_LEVEL=info
EOF

# Secure the environment file
chmod 600 /opt/tenantflow/.env.production
```

### 3. Build Docker Image

Build the Docker image using the Dockerfile:

```bash
cd /opt/tenantflow

# Build the image
docker build -t tenantflow-backend:latest .

# Verify the image was created
docker images | grep tenantflow-backend
```

### 4. Create Docker Compose Entry

Add this service to your existing docker-compose.yml:

```yaml
  tenantflow-backend:
    image: tenantflow-backend:latest
    container_name: tenantflow-backend
    restart: unless-stopped
    ports:
      - "3031:3000"  # Adjust port if 3031 is taken
    env_file:
      - /opt/tenantflow/.env.production
    networks:
      - cloudflared  # Your existing Cloudflare network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 5. Configure Cloudflare Tunnel

Add the TenantFlow backend to your Cloudflare Tunnel configuration:

```bash
# Edit your tunnel config (usually at ~/.cloudflared/config.yml)
sudo nano /etc/cloudflared/config.yml
```

Add this ingress rule BEFORE your catch-all rule:

```yaml
  - hostname: api.tenantflow.app
    service: http://localhost:3031
```

Restart cloudflared to apply changes:

```bash
sudo systemctl restart cloudflared
```

### 6. Add DNS Record in Vercel

The user needs to add this DNS record in Vercel Dashboard:
- Type: CNAME
- Name: api
- Value: [YOUR-TUNNEL-ID].cfargotunnel.com

### 7. Start the Container

```bash
# Start the container
docker-compose up -d tenantflow-backend

# Check logs
docker logs -f tenantflow-backend

# Verify it's running
curl http://localhost:3031/health
```

### 8. Verify Deployment

Test the deployment:

```bash
# Local test
curl http://localhost:3031/api/v1/health

# External test (after DNS propagates)
curl https://api.tenantflow.app/health
```

### 9. Maintenance Commands

Useful commands for maintenance:

```bash
# View logs
docker logs tenantflow-backend

# Restart container
docker restart tenantflow-backend

# Update to latest code
cd /opt/tenantflow
git pull
docker build -t tenantflow-backend:latest .
docker-compose up -d tenantflow-backend

# Run database migrations manually if needed
docker exec tenantflow-backend npm run migrate:deploy

# Access container shell
docker exec -it tenantflow-backend sh
```

### 10. Monitoring

Set up basic monitoring:

```bash
# Add to crontab for basic health monitoring
(crontab -l 2>/dev/null; echo "*/5 * * * * curl -f http://localhost:3031/health || docker restart tenantflow-backend") | crontab -
```

## Troubleshooting

If you encounter issues:

1. **Database Connection**: Ensure DATABASE_URL is correct and accessible
2. **Port Conflicts**: Change 3031 to another port if needed
3. **Memory Issues**: The Dockerfile sets max-old-space-size, but you may need to adjust
4. **Prisma Issues**: Try `docker exec tenantflow-backend npx prisma generate`

## Success Indicators

You know the deployment is successful when:
- ✅ `docker ps` shows tenantflow-backend as "Up" with healthy status
- ✅ `curl http://localhost:3031/health` returns 200 OK
- ✅ `curl https://api.tenantflow.app/health` returns 200 OK (after DNS propagates)
- ✅ No errors in `docker logs tenantflow-backend`

---

**Note for User**: After Claude completes these steps on your Ubuntu server, you'll need to:
1. Add the CNAME record in Vercel Dashboard (api → your-tunnel.cfargotunnel.com)
2. Update your frontend .env to use `VITE_API_URL=https://api.tenantflow.app/api/v1`
3. Wait 5-10 minutes for DNS propagation