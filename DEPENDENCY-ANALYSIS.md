# Dependency Analysis for TenantFlow

## 🔍 Analysis Results

### ❌ **UNUSED DEPENDENCIES** (Safe to Remove)

1. **`express: ^5.1.0`** - NOT USED
   - No server files using Express
   - Using Vercel serverless functions instead
   - CORS handling done manually in API routes

2. **`cors: ^2.8.5`** - NOT USED  
   - CORS handled manually with headers in API routes
   - No Express server to attach CORS middleware to

3. **`node-fetch: ^3.3.2`** - NOT USED
   - No imports found in codebase
   - Modern `fetch` API available in Node 18+
   - Supabase uses its own fetch implementation

4. **`puppeteer: ^24.10.2`** - NOT USED
   - No imports found in codebase
   - Large package (~200MB) affecting install time

5. **`dotenv: ^16.5.0`** - NOT USED
   - Vite handles environment variables natively
   - No `.env` loading code found

### ⚠️ **MISSING FILE REFERENCE**
- `send-invitation-server.js` referenced in `dev:email` script but file doesn't exist

### ✅ **CONFIRMED IN USE**

1. **`docx: ^9.5.1`** ✓ - Used in lease generator
2. **`jspdf: ^3.0.1`** ✓ - Used in lease generator  
3. **`jszip: ^3.10.1`** ✓ - Used in lease generator
4. **`stripe: ^18.2.1`** ✓ - Used in API routes
5. **`vercel: ^43.3.0`** ✓ - Used for deployments
6. **`resend: ^4.6.0`** ✓ - Used for email services

## 💾 **Estimated Savings**
Removing unused dependencies will save:
- **~250MB** in node_modules size
- **~30 seconds** in install time
- **Security surface reduction**

## 🧹 **Recommended Actions**

1. Remove unused dependencies
2. Fix broken email dev script
3. Update documentation
