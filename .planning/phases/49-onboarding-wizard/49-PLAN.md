# Phase 49: Landlord Onboarding Wizard

**Goal:** Build a multi-step onboarding wizard for new property owners — property setup, Stripe Connect account, first tenant invite, completion celebration. Redirect new owners through the wizard after signup, persisting progress so they can return to it.

**Architecture:** New route `/(owner)/onboarding` with a multi-step wizard component. Zustand store for wizard state. Backend endpoint `POST /api/v1/users/me/onboarding-complete`. Auth callback detects new owners and redirects to wizard. Reuse existing PropertyForm, InviteTenantForm, ConnectOnboardingDialog.

**Tech Stack:** Next.js App Router, Zustand, TanStack Query, Supabase, NestJS

---

### Task 1: Backend — onboarding complete endpoint

**Files:**
- Modify: `apps/backend/src/modules/users/users.service.ts`
- Modify: `apps/backend/src/modules/users/users.controller.ts`

**Step 1: Read current users service and controller**

Read both files fully before editing.

**Step 2: Add markOnboardingComplete method to UsersService**

In `users.service.ts`, add:

```typescript
async markOnboardingComplete(userId: string): Promise<void> {
  const client = this.supabase.getAdminClient()
  const { error } = await client
    .from('users')
    .update({
      onboarding_status: 'completed',
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (error) {
    throw new NotFoundException('Failed to update onboarding status')
  }
}

async getOnboardingStatus(userId: string): Promise<{
  onboarding_status: string
  onboarding_completed_at: string | null
}> {
  const client = this.supabase.getAdminClient()
  const { data, error } = await client
    .from('users')
    .select('onboarding_status, onboarding_completed_at')
    .eq('id', userId)
    .single()

  if (error || !data) throw new NotFoundException('User not found')
  return data
}
```

**Step 3: Add endpoints to UsersController**

In `users.controller.ts`, add (BEFORE any :id routes):

```typescript
@Get('me/onboarding')
@UseGuards(JwtAuthGuard)
getOnboardingStatus(@Request() req: AuthenticatedRequest) {
  return this.usersService.getOnboardingStatus(req.user.id)
}

@Post('me/onboarding-complete')
@UseGuards(JwtAuthGuard)
async markOnboardingComplete(@Request() req: AuthenticatedRequest) {
  await this.usersService.markOnboardingComplete(req.user.id)
  return { success: true, message: 'Onboarding complete' }
}
```

**Step 4: Verify TypeScript**
```bash
cd apps/backend && npx tsc --noEmit 2>&1 | tail -20
```

**Step 5: Commit**
```bash
git add apps/backend/src/modules/users/
git commit -m "feat(phase-49): add onboarding status and complete endpoints to users API"
```

---

### Task 2: Frontend — onboarding Zustand store + TanStack hooks

**Files:**
- Create: `apps/frontend/src/stores/onboarding-store.ts`
- Create: `apps/frontend/src/hooks/api/use-onboarding.ts`

**Step 1: Create the onboarding store**

`apps/frontend/src/stores/onboarding-store.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type OnboardingStep =
  | 'welcome'
  | 'add_property'
  | 'stripe_connect'
  | 'invite_tenant'
  | 'complete'

interface OnboardingState {
  currentStep: OnboardingStep
  completedSteps: Set<OnboardingStep>
  createdPropertyId: string | null
  hasStripeConnect: boolean
  invitedTenantEmail: string | null

  // Actions
  setStep: (step: OnboardingStep) => void
  markStepComplete: (step: OnboardingStep) => void
  setCreatedPropertyId: (id: string | null) => void
  setHasStripeConnect: (value: boolean) => void
  setInvitedTenantEmail: (email: string | null) => void
  reset: () => void
  canSkipTo: (step: OnboardingStep) => boolean
}

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'add_property',
  'stripe_connect',
  'invite_tenant',
  'complete'
]

const initialState = {
  currentStep: 'welcome' as OnboardingStep,
  completedSteps: new Set<OnboardingStep>(),
  createdPropertyId: null,
  hasStripeConnect: false,
  invitedTenantEmail: null,
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => set({ currentStep: step }),

      markStepComplete: (step) =>
        set((state) => ({
          completedSteps: new Set([...state.completedSteps, step])
        })),

      setCreatedPropertyId: (id) => set({ createdPropertyId: id }),
      setHasStripeConnect: (value) => set({ hasStripeConnect: value }),
      setInvitedTenantEmail: (email) => set({ invitedTenantEmail: email }),

      reset: () => set(initialState),

      canSkipTo: (step) => {
        const stepIdx = STEP_ORDER.indexOf(step)
        const currentIdx = STEP_ORDER.indexOf(get().currentStep)
        return stepIdx <= currentIdx + 1
      },
    }),
    {
      name: 'tenantflow-onboarding',
      // Serialize Set properly
      serialize: (state) =>
        JSON.stringify({
          ...state,
          state: {
            ...state.state,
            completedSteps: [...state.state.completedSteps]
          }
        }),
      deserialize: (str) => {
        const parsed = JSON.parse(str)
        return {
          ...parsed,
          state: {
            ...parsed.state,
            completedSteps: new Set(parsed.state.completedSteps || [])
          }
        }
      }
    }
  )
)
```

**Step 2: Create use-onboarding.ts hooks**

`apps/frontend/src/hooks/api/use-onboarding.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'

interface OnboardingStatus {
  onboarding_status: 'not_started' | 'in_progress' | 'completed'
  onboarding_completed_at: string | null
}

export function useOnboardingStatus() {
  return useQuery({
    queryKey: ['user', 'onboarding'],
    queryFn: () => apiRequest<OnboardingStatus>('/api/v1/users/me/onboarding'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useMarkOnboardingComplete() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiRequest<{ success: boolean }>('/api/v1/users/me/onboarding-complete', {
        method: 'POST'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'onboarding'] })
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] })
    },
  })
}
```

**Step 3: Verify TypeScript**
```bash
pnpm typecheck 2>&1 | tail -20
```

**Step 4: Commit**
```bash
git add apps/frontend/src/stores/onboarding-store.ts apps/frontend/src/hooks/api/use-onboarding.ts
git commit -m "feat(phase-49): add onboarding Zustand store and TanStack Query hooks"
```

---

### Task 3: Onboarding wizard pages

**Files:**
- Create: `apps/frontend/src/app/(owner)/onboarding/page.tsx`
- Create: `apps/frontend/src/app/(owner)/onboarding/layout.tsx`
- Create: `apps/frontend/src/components/onboarding/onboarding-progress.tsx`
- Create: `apps/frontend/src/components/onboarding/steps/welcome-step.tsx`
- Create: `apps/frontend/src/components/onboarding/steps/add-property-step.tsx`
- Create: `apps/frontend/src/components/onboarding/steps/stripe-connect-step.tsx`
- Create: `apps/frontend/src/components/onboarding/steps/invite-tenant-step.tsx`
- Create: `apps/frontend/src/components/onboarding/steps/complete-step.tsx`

**Step 1: Create onboarding layout**

`apps/frontend/src/app/(owner)/onboarding/layout.tsx`:

```tsx
// Simple layout without the main navigation sidebar
// Shows TenantFlow logo, progress indicator, and "skip onboarding" link
import type { ReactNode } from 'react'
import Link from 'next/link'

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-semibold text-lg">TenantFlow</span>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip setup →
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  )
}
```

**Step 2: Create OnboardingProgress component**

`apps/frontend/src/components/onboarding/onboarding-progress.tsx`:

```tsx
'use client'

import { CheckCircle, Circle, ChevronRight } from 'lucide-react'
import type { OnboardingStep } from '#stores/onboarding-store'

interface Step {
  id: OnboardingStep
  label: string
}

const STEPS: Step[] = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'add_property', label: 'Add Property' },
  { id: 'stripe_connect', label: 'Receive Payments' },
  { id: 'invite_tenant', label: 'Invite Tenant' },
  { id: 'complete', label: 'Done' },
]

interface OnboardingProgressProps {
  currentStep: OnboardingStep
  completedSteps: Set<OnboardingStep>
}

export function OnboardingProgress({ currentStep, completedSteps }: OnboardingProgressProps) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((step, idx) => (
        <div key={step.id} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {completedSteps.has(step.id) ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : step.id === currentStep ? (
              <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground" />
            )}
            <span
              className={`text-sm ${
                step.id === currentStep
                  ? 'font-medium text-foreground'
                  : completedSteps.has(step.id)
                  ? 'text-green-600'
                  : 'text-muted-foreground'
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  )
}
```

**Step 3: Create step components**

`apps/frontend/src/components/onboarding/steps/welcome-step.tsx`:
```tsx
'use client'

import { Button } from '#components/ui/button'
import { Home, DollarSign, Users } from 'lucide-react'

interface WelcomeStepProps {
  onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="text-center space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome to TenantFlow</h1>
        <p className="text-muted-foreground text-lg">
          Let's get your property management set up in a few easy steps.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-left">
        <div className="p-4 border rounded-lg space-y-2">
          <Home className="w-6 h-6 text-primary" />
          <h3 className="font-medium">Add Your Property</h3>
          <p className="text-sm text-muted-foreground">Register your rental property with address and details.</p>
        </div>
        <div className="p-4 border rounded-lg space-y-2">
          <DollarSign className="w-6 h-6 text-primary" />
          <h3 className="font-medium">Receive Rent Payments</h3>
          <p className="text-sm text-muted-foreground">Connect your bank account to collect rent automatically.</p>
        </div>
        <div className="p-4 border rounded-lg space-y-2">
          <Users className="w-6 h-6 text-primary" />
          <h3 className="font-medium">Invite Your Tenant</h3>
          <p className="text-sm text-muted-foreground">Send an invitation so tenants can access their portal.</p>
        </div>
      </div>

      <Button size="lg" onClick={onNext} className="px-8">
        Let's Get Started
      </Button>
    </div>
  )
}
```

`apps/frontend/src/components/onboarding/steps/add-property-step.tsx`:
```tsx
'use client'

// Wraps the existing PropertyFormClient
// On successful property creation: calls setCreatedPropertyId(id) + markStepComplete('add_property') + onNext()

import { useOnboardingStore } from '#stores/onboarding-store'
import { PropertyFormClient } from '#components/properties/property-form.client'

interface AddPropertyStepProps {
  onNext: () => void
}

export function AddPropertyStep({ onNext }: AddPropertyStepProps) {
  const { setCreatedPropertyId, markStepComplete } = useOnboardingStore()

  const handleSuccess = (propertyId: string) => {
    setCreatedPropertyId(propertyId)
    markStepComplete('add_property')
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Add Your First Property</h2>
        <p className="text-muted-foreground">Enter the details for your rental property.</p>
      </div>
      <PropertyFormClient onSuccess={handleSuccess} mode="onboarding" />
    </div>
  )
}
```

Note: Check what props `PropertyFormClient` accepts. It may need an `onSuccess` callback added or there may be an existing success handler. Read the component before implementing.

`apps/frontend/src/components/onboarding/steps/stripe-connect-step.tsx`:
```tsx
'use client'

// Reuses ConnectOnboardingDialog or shows inline Stripe Connect setup
// Option A: Show the ConnectOnboardingDialog inline (not as a modal)
// Option B: Redirect to Stripe Connect setup and return here

import { useState } from 'react'
import { Button } from '#components/ui/button'
import { ExternalLink, CheckCircle } from 'lucide-react'
import { useOnboardingStore } from '#stores/onboarding-store'

interface StripeConnectStepProps {
  onNext: () => void
  onSkip: () => void
}

export function StripeConnectStep({ onNext, onSkip }: StripeConnectStepProps) {
  const { setHasStripeConnect, markStepComplete, hasStripeConnect } = useOnboardingStore()

  const handleConnectComplete = () => {
    setHasStripeConnect(true)
    markStepComplete('stripe_connect')
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Set Up Rent Collection</h2>
        <p className="text-muted-foreground">
          Connect your bank account to receive rent payments directly from tenants.
        </p>
      </div>

      {/* Show the Stripe Connect setup button */}
      {/* This component initiates the Stripe Connect Express onboarding flow */}
      {/* Look at existing ConnectOnboardingDialog for the pattern */}

      <div className="border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Stripe Connect</h3>
            <p className="text-sm text-muted-foreground">Powered by Stripe — the world's most trusted payment platform</p>
          </div>
        </div>

        <Button onClick={handleConnectComplete} className="w-full">
          <ExternalLink className="w-4 h-4 mr-2" />
          Connect Bank Account
        </Button>
      </div>

      <div className="text-center">
        <button
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Skip for now (you can set this up later in Settings)
        </button>
      </div>
    </div>
  )
}
```

Note: Read `apps/frontend/src/app/(owner)/financials/billing/_components/connect-onboarding-dialog.tsx` for the actual Stripe Connect initiation pattern before implementing.

`apps/frontend/src/components/onboarding/steps/invite-tenant-step.tsx`:
```tsx
'use client'

// Wraps existing InviteTenantForm
// propertyId comes from useOnboardingStore().createdPropertyId

import { useOnboardingStore } from '#stores/onboarding-store'
import { InviteTenantForm } from '#components/tenants/invite-tenant-form'
import { Button } from '#components/ui/button'

interface InviteTenantStepProps {
  onNext: () => void
  onSkip: () => void
}

export function InviteTenantStep({ onNext, onSkip }: InviteTenantStepProps) {
  const { createdPropertyId, setInvitedTenantEmail, markStepComplete } = useOnboardingStore()

  const handleInvited = (email: string) => {
    setInvitedTenantEmail(email)
    markStepComplete('invite_tenant')
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Invite Your First Tenant</h2>
        <p className="text-muted-foreground">
          Send your tenant an invitation to access their portal and pay rent online.
        </p>
      </div>

      <InviteTenantForm
        preselectedPropertyId={createdPropertyId ?? undefined}
        onSuccess={handleInvited}
        submitLabel="Send Invitation"
      />

      <div className="text-center">
        <button
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Skip — I'll invite my tenant later
        </button>
      </div>
    </div>
  )
}
```

Note: Check what props `InviteTenantForm` accepts. Add `onSuccess` and `preselectedPropertyId` props if they don't exist yet.

`apps/frontend/src/components/onboarding/steps/complete-step.tsx`:
```tsx
'use client'

import { Button } from '#components/ui/button'
import { CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMarkOnboardingComplete } from '#hooks/api/use-onboarding'
import { useOnboardingStore } from '#stores/onboarding-store'
import { toast } from 'sonner'

export function CompleteStep() {
  const router = useRouter()
  const { mutateAsync: markComplete, isPending } = useMarkOnboardingComplete()
  const { reset } = useOnboardingStore()

  const handleGoToDashboard = async () => {
    try {
      await markComplete()
      reset()  // Clear localStorage state
      toast.success('Setup complete! Welcome to TenantFlow.')
      router.push('/dashboard')
    } catch {
      // Even if the API call fails, allow them to proceed
      reset()
      router.push('/dashboard')
    }
  }

  return (
    <div className="text-center space-y-8">
      <div className="flex justify-center">
        <CheckCircle className="w-16 h-16 text-green-500" />
      </div>

      <div>
        <h2 className="text-3xl font-bold mb-2">You're All Set!</h2>
        <p className="text-muted-foreground text-lg">
          Your property management account is ready. Head to your dashboard to start managing your portfolio.
        </p>
      </div>

      <div className="space-y-3">
        <Button size="lg" onClick={handleGoToDashboard} disabled={isPending} className="px-8">
          {isPending ? 'Finishing up...' : 'Go to Dashboard'}
        </Button>
      </div>
    </div>
  )
}
```

**Step 4: Create the main onboarding page**

`apps/frontend/src/app/(owner)/onboarding/page.tsx`:

```tsx
'use client'

import { useOnboardingStore } from '#stores/onboarding-store'
import { OnboardingProgress } from '#components/onboarding/onboarding-progress'
import { WelcomeStep } from '#components/onboarding/steps/welcome-step'
import { AddPropertyStep } from '#components/onboarding/steps/add-property-step'
import { StripeConnectStep } from '#components/onboarding/steps/stripe-connect-step'
import { InviteTenantStep } from '#components/onboarding/steps/invite-tenant-step'
import { CompleteStep } from '#components/onboarding/steps/complete-step'
import type { OnboardingStep } from '#stores/onboarding-store'

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'add_property',
  'stripe_connect',
  'invite_tenant',
  'complete'
]

export default function OnboardingPage() {
  const { currentStep, completedSteps, setStep, markStepComplete } = useOnboardingStore()

  const goToNextStep = () => {
    const currentIdx = STEP_ORDER.indexOf(currentStep)
    if (currentIdx < STEP_ORDER.length - 1) {
      const nextStep = STEP_ORDER[currentIdx + 1]
      markStepComplete(currentStep)
      setStep(nextStep)
    }
  }

  const skipStep = () => {
    const currentIdx = STEP_ORDER.indexOf(currentStep)
    if (currentIdx < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[currentIdx + 1])
    }
  }

  return (
    <div>
      <OnboardingProgress currentStep={currentStep} completedSteps={completedSteps} />

      {currentStep === 'welcome' && <WelcomeStep onNext={goToNextStep} />}
      {currentStep === 'add_property' && <AddPropertyStep onNext={goToNextStep} />}
      {currentStep === 'stripe_connect' && (
        <StripeConnectStep onNext={goToNextStep} onSkip={skipStep} />
      )}
      {currentStep === 'invite_tenant' && (
        <InviteTenantStep onNext={goToNextStep} onSkip={skipStep} />
      )}
      {currentStep === 'complete' && <CompleteStep />}
    </div>
  )
}
```

**Step 5: Verify TypeScript**
```bash
pnpm typecheck 2>&1 | tail -20
```

**Step 6: Commit**
```bash
git add apps/frontend/src/app/(owner)/onboarding/ apps/frontend/src/components/onboarding/
git commit -m "feat(phase-49): add multi-step onboarding wizard pages and step components"
```

---

### Task 4: Auth callback routing — redirect new owners to onboarding

**Files:**
- Modify: `apps/frontend/src/app/auth/callback/route.ts`

**Step 1: Read the current callback route**

Read `apps/frontend/src/app/auth/callback/route.ts` fully.

**Step 2: Add onboarding check for new owners**

After `supabase.auth.exchangeCodeForSession(code)`, check if the user's `onboarding_status` is not 'completed':

```typescript
// After getting the session
if (!error && data?.session) {
  const userType = data.session.user.app_metadata?.user_type

  if (userType === 'TENANT') {
    return NextResponse.redirect(`${origin}/tenant`)
  }

  // For owners: check if they've completed onboarding
  // Check the next param first (respects invite links and other redirects)
  const nextParam = searchParams.get('next')
  if (nextParam && nextParam !== '/dashboard') {
    return NextResponse.redirect(`${origin}${nextParam}`)
  }

  // For brand new owners (no properties yet), redirect to onboarding
  // We check this by querying user metadata or by convention
  const isNewUser = data.session.user.created_at
    ? (Date.now() - new Date(data.session.user.created_at).getTime()) < 5 * 60 * 1000  // Created within last 5 minutes
    : false

  if (isNewUser) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
```

Note: The "5 minute" heuristic is a safe approximation. The onboarding wizard also checks `onboarding_status` from the DB. If the user navigates away from onboarding and returns, the wizard state is persisted in localStorage via Zustand.

**Step 3: Add a middleware check to redirect from /dashboard to /onboarding for users who haven't completed onboarding**

Check `apps/frontend/src/middleware.ts` — if it exists, add logic to redirect owners from `/dashboard` to `/onboarding` if their `onboarding_status` is `not_started` (but do this carefully to avoid redirect loops; the onboarding page must not redirect to itself).

A simpler alternative: In `apps/frontend/src/app/(owner)/dashboard/page.tsx`, check the onboarding status and redirect client-side using `useRouter` + `useOnboardingStatus()` hook.

**Step 4: Update DashboardEmptyState to link to onboarding**

In `apps/frontend/src/app/(owner)/dashboard/page.tsx`, update `DashboardEmptyState` to include an "Start Setup Wizard" button in addition to the existing "Add Your First Property" link:

```tsx
function DashboardEmptyState() {
  return (
    <div ...>
      <EmptyTitle>Welcome to TenantFlow</EmptyTitle>
      <EmptyDescription>
        Get started by following our setup wizard to add your property and invite tenants.
      </EmptyDescription>
      <EmptyContent>
        <Link href="/onboarding" className="...primary button styles...">
          Start Setup Wizard
        </Link>
        <Link href="/properties/new" className="...secondary styles...">
          Add Property Manually
        </Link>
      </EmptyContent>
    </div>
  )
}
```

**Step 5: Verify TypeScript**
```bash
pnpm typecheck 2>&1 | tail -20
```

**Step 6: Commit**
```bash
git add apps/frontend/src/app/auth/ apps/frontend/src/app/(owner)/dashboard/
git commit -m "feat(phase-49): redirect new owners to onboarding wizard after signup"
```

---

### Verification

After all tasks:
1. Backend typechecks: `cd apps/backend && npx tsc --noEmit`
2. Frontend typechecks: `pnpm typecheck`
3. Backend tests: `cd apps/backend && npx jest "users.service\|users.controller" --forceExit`
4. Lint: `pnpm lint`

### Success Criteria

- [ ] `POST /api/v1/users/me/onboarding-complete` updates onboarding_status to 'completed' in DB
- [ ] `GET /api/v1/users/me/onboarding` returns current onboarding_status and onboarding_completed_at
- [ ] `/(owner)/onboarding` route renders the wizard with progress indicator
- [ ] Welcome step has 3 feature highlight cards and "Let's Get Started" button
- [ ] Add Property step reuses PropertyFormClient and records the created property ID in store
- [ ] Stripe Connect step reuses the existing connect dialog pattern and allows skip
- [ ] Invite Tenant step reuses InviteTenantForm with preselected property and allows skip
- [ ] Complete step calls the onboarding-complete API and redirects to /dashboard
- [ ] Wizard progress persists in localStorage if user navigates away and returns
- [ ] Dashboard empty state has "Start Setup Wizard" CTA linking to /onboarding
- [ ] All TypeScript type checks pass
- [ ] `pnpm lint` passes with no new violations
