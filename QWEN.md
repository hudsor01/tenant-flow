# Tech Stack & Developer Guidelines

## Core Stack

- **Framework:** Next.js (App Router, Server Actions, Route Handlers, React Server Components)
- **Language:** TypeScript (Strict mode enabled, no `any` or loose types)
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security / RLS, `@supabase/ssr` client)
- **Payments:** Stripe (Checkout Sessions, Customer Portal, Webhook Handlers, Subscription lifecycle)
- **Transactional Email:** Resend (React Email components, API integration)
- **Styling:** Tailwind CSS

---

## Architectural Conventions & Code Style

### Next.js (App Router)

- Favor **React Server Components (RSC)** by default. Mark components `'use client'` only when state, hooks, or event listeners are strictly necessary.
- Use **Server Actions** or **Route Handlers** for data mutations, form submissions, and external API calls.
- Structure routes logically using modern App Router patterns (`app/(auth)`, `app/(dashboard)`, `app/api/...`).

### Supabase (Database & Auth)

- Use `@supabase/ssr` for server-side auth validation in Server Components, Server Actions, and Route Handlers.
- Ensure all database tables enforce **Row Level Security (RLS)** policies. Never bypass RLS in standard client/server calls; use the service role key strictly in secure webhook or administrative contexts.
- Maintain end-to-end type safety using generated Supabase database types (`Database['public']['Tables']`).

### Stripe Integration

- Keep Stripe API operations server-side only (Server Actions or Route Handlers).
- Handle Stripe Webhook signatures securely using `stripe.webhooks.constructEvent` with the raw request body.
- Synchronize subscription statuses, customer IDs, and payment events directly with Supabase tables.

### Resend & Email

- Build email templates using clean React Email components.
- Send emails asynchronously from Server Actions or Webhook handlers.

---

## Testing & Quality Standards

- Write modular, type-safe utilities.
- Maintain clear error boundaries and structured response formats (`{ success: boolean, data?: T, error?: string }`).
