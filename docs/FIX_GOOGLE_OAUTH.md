# Fix Google OAuth 404 Error

## Problem
Google OAuth is returning a 404 error when users try to sign in with Google.

## Root Cause
The 404 error occurs because Google OAuth provider is not properly configured in Supabase. This requires configuration in three places:
1. Supabase Dashboard (Enable Google provider)
2. Google Cloud Console (OAuth 2.0 credentials)
3. Application code (redirect URLs)

## Solution Steps

### 1. Configure Google OAuth in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Choose "Web application"
6. Add authorized JavaScript origins:
   ```
   http://localhost:3000
   https://tenantflow.app
   https://www.tenantflow.app
   ```
7. Add authorized redirect URIs:
   ```
   https://<your-supabase-project>.supabase.co/auth/v1/callback
   ```
   (Replace `<your-supabase-project>` with your actual Supabase project ID)
8. Save and copy the Client ID and Client Secret

### 2. Enable Google Provider in Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to "Authentication" > "Providers"
4. Find "Google" in the list
5. Toggle it ON
6. Enter your Google OAuth credentials:
   - **Client ID**: (from Google Cloud Console)
   - **Client Secret**: (from Google Cloud Console)
7. The redirect URL shown here should match what you added in Google Cloud Console
8. Click "Save"

### 3. Verify Redirect URLs

Ensure these URLs are configured correctly:

#### In Supabase Dashboard (Authentication > URL Configuration):
- **Site URL**: `https://tenantflow.app` (or `http://localhost:3000` for development)
- **Redirect URLs** (add all of these):
  ```
  http://localhost:3000/auth/callback
  https://tenantflow.app/auth/callback
  https://www.tenantflow.app/auth/callback
  ```

### 4. Code Changes Applied

The following changes have been made to fix redirect URL handling:

#### `/apps/frontend/src/lib/actions/auth-actions.ts`
- Added fallback URL handling for missing environment variables
- Added debug logging to track OAuth flow
- Ensured consistent redirect URL construction

#### `/apps/frontend/src/lib/clients/supabase-oauth.ts`
- Updated client-side OAuth to match server-side pattern
- Added debug logging for troubleshooting

### 5. Environment Variables

Ensure these are set in your `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # or https://tenantflow.app in production
NEXT_PUBLIC_APP_URL=http://localhost:3000   # fallback
```

### 6. Testing

1. Run the application locally:
   ```bash
   npm run dev
   ```

2. Navigate to the login page
3. Click "Continue with Google"
4. Check browser console and server logs for debug messages
5. You should be redirected to Google's OAuth consent screen

### 7. Common Issues

#### Still Getting 404?
- Double-check that Google provider is enabled in Supabase Dashboard
- Verify the Client ID and Client Secret are correctly entered
- Ensure redirect URLs match exactly (including trailing slashes)

#### "Redirect URI mismatch" Error
- The redirect URI in Google Cloud Console must exactly match Supabase's callback URL
- Check for typos, missing protocols (http/https), or trailing slashes

#### "Invalid Client" Error
- Client ID or Client Secret is incorrect
- Wait a few minutes after creating credentials in Google Cloud Console

### 8. Debug Information

When testing, look for these debug messages in the console:
- `[OAuth Debug] Initiating Google sign-in with redirect to: <url>`
- `[OAuth Debug] Redirecting to Google OAuth URL: <url>`
- `[OAuth Error] Google sign-in failed: <error>`

These will help identify where the flow is breaking.

## Next Steps

After completing the above configuration:
1. Test Google OAuth locally
2. Deploy changes to production
3. Update production redirect URLs in both Google Cloud Console and Supabase Dashboard
4. Test in production environment