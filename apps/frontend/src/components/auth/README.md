# Authentication Components

This directory contains all authentication-related components for the TenantFlow application.

## Directory Structure

```
auth/
├── ui/                    # Auth-specific UI components
│   ├── supabase-button.tsx
│   ├── supabase-card.tsx
│   ├── supabase-input.tsx
│   ├── supabase-label.tsx
│   └── supabase-button-variants.ts
├── forms/                 # Authentication forms
│   ├── SupabaseLoginForm.tsx
│   ├── SupabaseSignupForm.tsx
│   ├── SupabaseForgotPasswordForm.tsx
│   └── SupabaseUpdatePasswordForm.tsx
├── SupabaseAuthProcessor.tsx
└── AuthLayout.tsx
```

## Usage Guidelines

### When to Use Auth Components

Use components from `auth/ui/` when:
- Building login/signup forms
- Creating password reset flows
- Implementing auth-related UI elements
- Working with Supabase authentication

### When to Use General Components

Use components from `components/ui/` when:
- Building application UI
- Creating non-auth forms
- Implementing general user interactions

## Component Naming Convention

All auth-specific UI components are prefixed with "Supabase" to clearly indicate their purpose and prevent confusion with general-purpose components.

## Examples

```tsx
// For authentication forms
import { SupabaseButton } from '@/components/auth/ui/supabase-button'
import { SupabaseInput } from '@/components/auth/ui/supabase-input'

// For general application UI
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
```

## Best Practices

1. **Keep auth components isolated** - Don't use auth UI components outside of authentication flows
2. **Maintain consistency** - Always use Supabase-prefixed components for auth-related UI
3. **Follow SRP** - Each component should focus on a single authentication concern