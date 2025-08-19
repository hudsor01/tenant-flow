# Health Check URL Configuration

## Current Test Environment (Local)
- **URL**: `http://localhost:3002/ping`
- **Purpose**: Local testing and simulation

## Railway Production Environment
- **Internal Health Check**: Railway uses the container's internal address
  - Example: `http://0.0.0.0:${PORT}/ping` or `http://127.0.0.1:${PORT}/ping`
  - Railway performs health checks INTERNALLY within the container
  - Does NOT use external domains like tenantflow.app

## Production Domains (External Access)
- **Backend API**: `https://api.tenantflow.app`
  - This is for external client access
  - NOT used for Railway health checks
  
- **Frontend**: `https://tenantflow.app`
  - Hosted on Vercel
  - Separate from backend

## How Railway Health Checks Work

1. **During Deployment**:
   - Railway starts your container
   - Waits for the app to bind to the PORT
   - Makes internal HTTP requests to `http://127.0.0.1:${PORT}/ping`
   - Does NOT go through the public internet or domain

2. **Configuration in railway.toml**:
   ```toml
   healthcheckPath = "/ping"  # Path only, not full URL
   healthcheckTimeout = 30    # Seconds to wait
   ```

3. **The app listens on**:
   ```javascript
   app.listen(process.env.PORT || 3000, '0.0.0.0')
   ```
   - Binds to all interfaces (0.0.0.0)
   - Uses Railway-provided PORT
   - Accessible internally for health checks

## Summary
- **Local Testing**: `localhost:3002`
- **Railway Health Check**: Internal container address (not public domain)
- **Public Access**: `api.tenantflow.app` (after deployment succeeds)