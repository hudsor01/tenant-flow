# Phase 49 Summary: Landlord Onboarding Wizard

**one_liner:** Added a 5-step onboarding wizard that guides new property owners through setup: add property, connect Stripe, invite first tenant.

## What Was Built

### Shared
- `packages/shared/src/validation/users.ts`: added `onboardingUpdateSchema` with `status: z.enum(['started', 'completed', 'skipped'])` and exported `OnboardingUpdate` type

### Backend
- `UpdateOnboardingDto` in `apps/backend/src/modules/users/dto/update-onboarding.dto.ts`
- `UsersService.updateOnboarding(userId, status)`: updates `onboarding_status`, sets `onboarding_completed_at` when status is `'completed'`
- `UsersController`: added `PATCH /users/me/onboarding` endpoint with `@SkipSubscriptionCheck()` (placed before dynamic routes)
- 2 unit tests added to `users.service.spec.ts` for `updateOnboarding` — all 25 tests passing

### Frontend
- `use-onboarding.ts`: hook that reads `onboarding_status` from user profile, returns `showWizard`, `completeOnboarding()`, `skipOnboarding()`
- `onboarding-wizard.tsx`: main dialog with 5 steps and step indicator dots, auto-shows for new owners
- `onboarding-step-welcome.tsx`: welcome screen explaining wizard purpose
- `onboarding-step-property.tsx`: simplified property creation form
- `onboarding-step-stripe.tsx`: Stripe Connect info + link to billing settings
- `onboarding-step-tenant.tsx`: simplified tenant invite form
- `onboarding-step-complete.tsx`: success screen with next steps
- `apps/frontend/src/app/(owner)/dashboard/page.tsx`: wired `<OnboardingWizard />` into dashboard

## Notes
- No new migration needed — `onboarding_status`, `onboarding_started_at`, `onboarding_completed_at` already existed on `users` table
- Wizard is skippable at any step; skip stores `'skipped'` status so it doesn't re-appear

## Commit
`00be170b0 feat(phase-49): landlord onboarding wizard with multi-step setup`
