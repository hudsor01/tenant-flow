# Turbo Remote Cache Setup Instructions

## ✅ Step 1: Configuration Created
I've created `.turbo/config.json` with your team configuration:
- Team ID: `team_hHHBP2g1RyRcqEZlePKqViVa`
- Team: hudson-dev
- Project: tenant-flow

## 🔑 Step 2: Authentication Required

### Option A: Using Vercel CLI (Recommended)
```bash
# 1. Login to Vercel (if not already)
npx vercel login

# 2. Generate a Turbo token
npx turbo login
```

This will:
- Open your browser to authenticate
- Create a token linked to your Vercel account
- Save it locally in `~/.turbo/config.json`

### Option B: Manual Token Creation
1. Go to: https://vercel.com/account/tokens
2. Create a new token with name "Turbo Cache"
3. Copy the token

## 🚀 Step 3: Configure Environment Variables

### For Local Development
Add to your `.env.local` or shell profile:
```bash
export TURBO_TOKEN="your-token-here"
export TURBO_TEAM="team_hHHBP2g1RyRcqEZlePKqViVa"
```

### For Vercel Deployment
Add these environment variables in Vercel dashboard:
1. Go to: https://vercel.com/hudson-dev/tenant-flow/settings/environment-variables
2. Add:
   - `TURBO_TOKEN` = [your token]
   - `TURBO_TEAM` = team_hHHBP2g1RyRcqEZlePKqViVa

### For GitHub Actions
Add to repository secrets:
1. Go to: Settings → Secrets and variables → Actions
2. Add:
   - `TURBO_TOKEN` = [your token]
   - `TURBO_TEAM` = team_hHHBP2g1RyRcqEZlePKqViVa

## 📊 Step 4: Verify Setup

Test remote caching:
```bash
# Clear local cache
rm -rf .turbo

# Run build (will populate remote cache)
npx turbo run build --filter=@repo/frontend

# Clear local cache again
rm -rf .turbo

# Run build again (should pull from remote)
npx turbo run build --filter=@repo/frontend
```

You should see:
```
✓ @repo/frontend#build (cache hit - remote)
```

## 🎯 Expected Performance Gains

### Before (No Remote Cache):
- CI/CD Build: ~38 seconds every time
- Team member first build: ~38 seconds
- After pull: ~38 seconds if dependencies changed

### After (With Remote Cache):
- CI/CD Build: ~10-15 seconds (cache hit)
- Team member first build: ~10-15 seconds (downloads cache)
- After pull: ~5 seconds if only app code changed

## 📈 Monitoring Cache Performance

View cache statistics:
```bash
npx turbo run build --filter=@repo/frontend --summarize
```

This shows:
- Cache hit rate
- Time saved
- Remote vs local cache usage

## 🔧 Troubleshooting

### If Remote Cache Not Working:
1. Check token is valid: `npx turbo whoami`
2. Verify team link: `cat .turbo/config.json`
3. Check environment: `echo $TURBO_TOKEN`
4. Test connection: `npx turbo run build --remote-only`

### Common Issues:
- **"Unauthorized"**: Token expired or invalid
- **"Team not found"**: Wrong team ID in config
- **"Cache miss"**: First build or cache expired (7 days)

## 🚨 Important Notes

1. **Cache Invalidation**: Cache expires after 7 days
2. **Cache Size**: Up to 10GB per team on free plan
3. **Security**: Never commit TURBO_TOKEN to git
4. **Gitignore**: `.turbo/config.json` is already in .gitignore

## Next Steps

1. Complete authentication (Step 2)
2. Add environment variables (Step 3)
3. Test the setup (Step 4)
4. Enjoy 70% faster builds! 🎉