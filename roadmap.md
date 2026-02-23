Here is a refined, simplified, and "context-driven" roadmap designed specifically for a solo developer.

You can copy and paste the content below directly into a file named `ROADMAP.md` in your `tenant-flow` repository. It is formatted with checkboxes `[ ]` so you can check them off as you go, and it focuses heavily on *context* (why you are doing it) and *acceptance criteria* (knowing when it's done).

***

# Tenant Flow: Solo Developer Roadmap

**Project Status:** Active Development  
**Developer:** Solo  
**Stack:** Next.js, Supabase, Stripe Connect

---

## 🚀 Development Principles (Context-Driven)

Since this is a solo build, we prioritize **Revenue Impact** and **Risk Reduction** over feature breadth.

1.  **Cash Flow First:** Features that directly enable or protect payments take precedence.
2.  **Support Cost Reduction:** Every feature built should ideally answer a question or solve a problem *before* the user emails you.
3.  **Security by Default:** Financial data requires strict access control (RLS). We never compromise on this.
4.  **Done is Better Than Perfect:** Ship the core loop (Invite -> Pay -> Record) before adding "nice-to-haves."

---

## Phase 1: The "Trust & Money" Loop
**Goal:** Build a bulletproof foundation for collecting and splitting payments. If payments break, the business breaks.

### 1.1 Identity & Access (The Gatekeeper)
*Context: You must prove that data is secure before a landlord will trust you with their tenant's personal info.*

- [ ] **Implement Supabase Row Level Security (RLS)**
    - *Why:* Prevents Tenant A from querying Tenant B's lease data.
    - *Implementation:* Write policies for `profiles`, `properties`, and `leases` ensuring `auth.uid() == user_id`.
    - *Done When:* You log in as Tenant A, open the browser console, and fail to fetch Tenant B's data.

- [ ] **Configure Magic Link Authentication**
    - *Why:* Reduces "I forgot my password" support emails by ~90%.
    - *Implementation:* Use Supabase `signInWithOtp`. Remove password fields from the UI if possible.
    - *Done When:* A user can enter an email, receive a link, and log in without setting a password.

### 1.2 Stripe Connect (The Revenue Engine)
*Context: You need to route money to landlords without holding it yourself (compliance) and taking your cut (monetization).*

- [ ] **Landlord Onboarding (Express Account)**
    - *Why:* Legally required to pay landlords. Collects KYC (Tax ID, Bank Info).
    - *Implementation:* Create `/api/connect/onboarding`. Save `stripe_account_id` to the `profiles` table.
    - *Done When:* A landlord can click "Get Paid," fill out Stripe's form, and return to your dashboard with a `account_status: active`.

- [ ] **Payment Flow with Fee Split**
    - *Why:* This is how you get paid.
    - *Implementation:* In `checkout/session.ts`, set `application_fee_amount` (2.9%) and `transfer_data: { destination: landlord_id }`.
    - *Done When:* A test payment of $100 results in Landlord receiving ~$97.10 and your platform retaining ~$2.90.

- [ ] **Secure Webhook Handler**
    - *Why:* Stripe notifies *you* when payment succeeds. If you miss this, the DB won't update.
    - *Implementation:* Verify signature using `STRIPE_WEBHOOK_SECRET`. Handle `checkout.session.completed`.
    - *Done When:* A payment succeeds in Stripe, and your `payments` table updates automatically within 5 seconds.

---

## Phase 2: The "Zero-Friction" Experience
**Goal:** Make the product so easy to use that tenants and landlords don't need to call you for help.

### 2.1 Tenant Onboarding
*Context: If a tenant can't figure out how to pay in 30 seconds, they will call the landlord, who will then blame you.*

- [ ] **Tenant Invite Flow**
    - *Why:* Landlords need a one-click way to bring tenants in.
    - *Implementation:* Generate a unique token/link. Allow tenant to set up their profile via that link.
    - *Done When:* Landlord clicks "Invite," sends link, and Tenant can create account immediately.

- [ ] **Mobile-First Payment UI**
    - *Why:* 80% of tenants will pay from their phone.
    - *Implementation:* Ensure Stripe `PaymentElement` is responsive and buttons are thumb-friendly (min 44px height).
    - *Done When:* You can pay rent successfully on a mobile browser without zooming in.

### 2.2 Operational Visibility
*Context: Landlords need to see the "Green" (Money coming in) to feel good about the subscription.*

- [ ] **Landlord Financial Dashboard**
    - *Why:* Visual proof of ROI.
    - *Implementation:* Simple cards showing "Expected Rent" vs "Collected Rent" and "Occupancy Rate".
    - *Done When:* Numbers match the raw data in the database exactly.

- [ ] **Automated Receipt Emails**
    - *Why:* Tenants demand proof of payment for taxes/records.
    - *Implementation:* Trigger a Resend/SendGrid email upon webhook success.
    - *Done When:* Tenant pays $1000 and receives a branded HTML email receipt immediately.

---

## Phase 3: The "Stickiness" Layer
**Goal:** Give the landlord reasons to stay subscribed beyond just "processing rent."

### 3.1 Maintenance & Communication
*Context: The second biggest pain point after rent is "fixing broken things."*

- [ ] **Maintenance Ticketing System**
    - *Why:* Stops the "My sink is leaking" phone calls at 10 PM.
    - *Implementation:* Tenants submit category/desc/photos. Landlords see a list and can update status.
    - *Done When:* Tenant submits request -> Landlord sees it -> Landlord marks "Resolved" -> Tenant gets notified.

- [ ] **In-App Messaging**
    - *Why:* Keeps communication centralized and searchable (vs. lost text messages).
    - *Implementation:* Simple table `messages` linking tenant/landlord. Realtime subscription via Supabase.
    - *Done When:* Landlord sends a message, and Tenant's browser updates instantly without refresh.

### 3.2 Automation (The Force Multiplier)
*Context: Automation is what justifies a $29/mo subscription over a free spreadsheet.*

- [ ] **Automated Late Fees**
    - *Why:* Landlords hate awkward money conversations.
    - *Implementation:* Cron job runs daily. Checks `due_date < now` & `status != paid`. Adds configurable fee.
    - *Done When:* Rent is 1 day late, and the ledger automatically updates with the late fee amount.

- [ ] **Rent Reminder Notifications**
    - *Why:* Increases on-time payment rate (better for landlord cash flow).
    - *Implementation:* Cron job 3 days before due date. Sends email/SMS.
    - *Done When:* Tenant receives "Rent is due in 3 days" email automatically.

---

## Phase 4: Data & Scale (Future State)
*Goal:* Prepare for growth and power users.*

- [ ] **CSV/Excel Export**
    - *Why:* Accountants love Excel. This is a low-effort, high-value feature.
    - *Done When:* Landlord can download a .csv of all payments for the year.

- [ ] **Vendor/Contractor Access (Optional)**
    - *Why:* Allows landlords to invite plumbers directly to specific tickets.
    - *Done When:* Landlord can invite `bob@plumbing.com` to only see "Unit 4B - Plumbing" tickets.

- [ ] **Automated Accounting Export (QB/Xero)**
    - *Why:* Lock-in. Once their books sync automatically, they will never churn.
    - *Done When:* One-click sync sends invoice data to QuickBooks Online.

---

## 📝 Solo Dev Notes & Risks

**High Risk Areas (Handle with Care):**
1.  **Webhook Idempotency:** Ensure your webhook handler checks if a payment ID already exists in the DB before inserting. Stripe may send the same event twice.
2.  **Environment Variables:** Never commit `.env`. Use a `.env.example` for the repo.
3.  **Error Logging:** Integrate Sentry or LogRocket. You cannot monitor the app 24/7. You need to know when a 500 error happens *before* a user tells you.

**Current Focus:** *[Insert your current focus here, e.g., "Phase 1.2 Stripe Connect"]*

**Last Updated:** *[Date]*
