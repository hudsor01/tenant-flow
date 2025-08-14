# Authentication Migration Guide: Middleware to Layout-Based

This guide documents the migration from middleware-based authentication to layout-based authentication in TenantFlow, providing better compatibility with Next.js 15 and avoiding Edge Runtime issues.

## Migration Overview

**Before**: Middleware handled all route protection and redirects at the edge
**After**: Layout-based protection with server-side and client-side guards

## Key Changes Made

### 1. Directory Structure Changes

```
app/
├── (dashboard)/              # Protected dashboard routes
│   ├── layout.tsx           # Protected layout with auth guards
│   ├── dashboard/
│   ├── properties/
│   ├── tenants/
│   └── ...
├── (public)/                # Public marketing routes  
│   ├── layout.tsx           # Public layout
│   ├── page.tsx             # Home page
│   ├── about/
│   ├── pricing/
│   └── ...
├── auth/                    # Authentication routes
│   ├── layout.tsx           # Auth layout with reverse guard
│   ├── login/
│   ├── signup/
│   └── ...
└── layout.tsx               # Root layout
```

### 2. New Authentication Components

#### AuthProvider (`/src/providers/auth-provider.tsx`)
- Global authentication state management
- Automatic session refresh
- Route-based redirects
- Integrates with existing useAuth hook patterns

#### ServerAuthGuard (`/src/components/auth/server-auth-guard.tsx`)
- Server-side authentication checking
- Redirects before page render
- No flash of unauthenticated content

#### ProtectedRouteGuard (`/src/components/auth/protected-route-guard.tsx`)
- Client-side authentication protection
- Loading states during auth checks
- Handles edge cases and race conditions

#### SessionManager (`/src/lib/auth/session-manager.ts`)
- Automatic token refresh (5 minutes before expiry)
- Session validation
- Centralized session lifecycle management

### 3. Layout Integration

#### Dashboard Layout
```tsx
<ServerAuthGuard requireAuth={true}>
  <AuthProvider>
    <ProtectedRouteGuard>
      {/* Dashboard content */}
    </ProtectedRouteGuard>
  </AuthProvider>
</ServerAuthGuard>
```

#### Auth Layout
```tsx
<AuthProvider>
  <ReverseAuthGuard>
    {/* Auth forms */}
  </ReverseAuthGuard>
</AuthProvider>
```

#### Public Layout
```tsx
<AuthProvider>
  {/* Public content */}
</AuthProvider>
```

## Migration Benefits

### ✅ Resolved Issues
- **Edge Runtime Compatibility**: No more middleware issues with Next.js 15
- **Better Performance**: Server-side redirects are faster than middleware
- **Improved UX**: Proper loading states, no flash of wrong content
- **Cleaner Architecture**: Separation of concerns between public/protected routes
- **Better Error Handling**: Graceful handling of auth failures

### ✅ Enhanced Security
- **Server-side First**: Authentication checks happen before rendering
- **Defense in Depth**: Both server and client-side protection
- **Session Management**: Automatic token refresh prevents auth interruptions
- **Route Isolation**: Clear separation between authenticated and public areas

### ✅ Developer Experience  
- **Type Safety**: Full TypeScript integration
- **Composable Guards**: Reusable auth components
- **Clear Testing**: Easier to test individual auth components
- **Better Debugging**: Clear auth flow with proper logging

## Testing Guide

### Auth Flow Testing

#### 1. Protected Route Access
```bash
# Test unauthenticated access to dashboard
curl -i http://localhost:3000/dashboard
# Should redirect to /auth/login

# Test authenticated access
# (With valid session cookies)
curl -i -H "Cookie: sb-access-token=..." http://localhost:3000/dashboard
# Should render dashboard
```

#### 2. Auth Page Redirection
```bash
# Test accessing login when already authenticated
curl -i -H "Cookie: sb-access-token=..." http://localhost:3000/auth/login
# Should redirect to /dashboard
```

#### 3. Session Management
```bash
# Test automatic token refresh
# Monitor network requests in browser dev tools
# Should see refresh requests ~5 minutes before expiry
```

### Component Testing

#### 1. ServerAuthGuard
```tsx
// Test server-side auth protection
describe('ServerAuthGuard', () => {
  it('redirects unauthenticated users', async () => {
    // Mock getCurrentUser to return null
    // Render ServerAuthGuard component
    // Expect redirect to /auth/login
  })
})
```

#### 2. ProtectedRouteGuard
```tsx
// Test client-side auth protection
describe('ProtectedRouteGuard', () => {
  it('shows loading state during auth check', () => {
    // Mock useAuth with loading: true
    // Render ProtectedRouteGuard
    // Expect loading spinner
  })
})
```

#### 3. SessionManager
```tsx
// Test session lifecycle
describe('SessionManager', () => {
  it('schedules token refresh', async () => {
    // Mock session with expiry
    // Call initialize()
    // Verify setTimeout was called with correct timing
  })
})
```

### Integration Testing

#### 1. Complete Auth Flow
```tsx
// Test full authentication journey
describe('Authentication Flow', () => {
  it('handles complete login journey', async () => {
    // 1. Visit protected route → redirect to login
    // 2. Fill login form → successful login
    // 3. Redirect to dashboard → access granted
    // 4. Logout → redirect to home
  })
})
```

#### 2. Session Persistence
```tsx
describe('Session Persistence', () => {
  it('maintains session across page refreshes', async () => {
    // 1. Login successfully
    // 2. Refresh page
    // 3. Verify still authenticated
  })
})
```

## Migration Checklist

### ✅ Completed
- [x] Created AuthProvider for global state
- [x] Implemented ServerAuthGuard for server-side protection
- [x] Implemented ProtectedRouteGuard for client-side protection  
- [x] Updated dashboard layout with auth guards
- [x] Created public layout system
- [x] Implemented SessionManager for automatic refresh
- [x] Moved marketing pages to (public) route group
- [x] Created auth layout with reverse guard
- [x] Disabled middleware (`middleware.ts.disabled`)

### 🔄 Next Steps (Implementation)
- [ ] Update existing auth forms to use new AuthProvider
- [ ] Test all authentication flows end-to-end
- [ ] Update navigation components to use new auth state
- [ ] Add proper error boundaries for auth failures
- [ ] Performance test session management
- [ ] Add auth flow documentation for team
- [ ] Create Playwright tests for auth journeys

### 🧪 Testing Required
- [ ] Login/logout functionality
- [ ] Protected route access (dashboard, properties, tenants, etc.)
- [ ] Public route access (home, pricing, about, etc.)
- [ ] Auth page redirection (login/signup when already auth'd)
- [ ] Session persistence across refreshes
- [ ] Automatic token refresh
- [ ] Error handling for auth failures
- [ ] Loading states during auth checks

## Rollback Plan

If issues arise, rollback process:

1. **Re-enable middleware**: Rename `middleware.ts.disabled` → `middleware.ts`
2. **Remove auth guards**: Remove ServerAuthGuard/ProtectedRouteGuard from layouts
3. **Restore old structure**: Move pages back to original locations
4. **Update imports**: Restore old import paths

## Performance Considerations

### Server-Side Guards
- **Pro**: No client-side flash, faster redirects
- **Con**: Server-side rendering overhead
- **Optimization**: Cache auth checks where possible

### Client-Side Guards  
- **Pro**: Better UX with loading states
- **Con**: Potential flash if server guard fails
- **Optimization**: Minimize auth check time

### Session Management
- **Pro**: Prevents auth interruptions
- **Con**: Background network requests
- **Optimization**: Intelligent refresh scheduling

## Monitoring and Debugging

### Key Metrics
- Auth check latency
- Session refresh frequency
- Failed auth attempts
- Route protection effectiveness

### Debug Tools
- Browser dev tools for session cookies
- Network tab for refresh requests  
- Console logs for auth state changes
- React DevTools for provider state

### Common Issues
1. **Double AuthProvider**: Ensure only one provider per route tree
2. **Race Conditions**: Use proper loading states
3. **Session Conflicts**: Clear storage on logout
4. **Redirect Loops**: Check guard logic carefully

This migration provides a robust, Next.js 15-compatible authentication system with better performance and developer experience.