-- Blog posts' search titles and written descriptions (2026-11-24 SEO audit
-- PT-3, PT-4, PT-8, BL9; roadmap PR 4c).
--
-- `seo_title` is the post's <title>, at most 60 characters: the H1 (`title`)
-- runs to 85 characters and was rendered with a " | TenantFlow Blog" suffix,
-- so every post's title was cut off in search results. A post without one
-- falls back to its H1 (src/app/blog/[slug]/page.tsx).
--
-- The nine published posts get the audit's titles, H1s and descriptions
-- (P24-P32). `meta_description` and `excerpt` held the body's opening
-- sentence; both now hold one written description, which the post page shows
-- under the H1 and the blog cards show under the title. Strings are measured
-- (titles <= 60, descriptions 120-155) and clear validate_blog_post's banlist;
-- P25's "Collect Rental Applications" became "Take" / "Rental Applications
-- Online", since "collect rent" is a banned substring.
--
-- An UPDATE that matches no row (an empty replay database) changes nothing.

alter table public.blogs add column seo_title text;

alter table public.blogs
  add constraint blogs_seo_title_length
  check (seo_title is null or char_length(seo_title) between 10 and 60);

comment on column public.blogs.seo_title is
  'The post''s <title> (10-60 characters). Null falls back to title, the H1.';

update public.blogs set
  title = 'How to Organize Your Rental Properties and Units in One Afternoon (with TenantFlow)',
  seo_title = 'How to Organize Rental Properties and Units in an Afternoon',
  meta_description = 'A step-by-step way to set up properties, units, leases, tenants and documents in one afternoon, and how TenantFlow keeps them linked.',
  excerpt = 'A step-by-step way to set up properties, units, leases, tenants and documents in one afternoon, and how TenantFlow keeps them linked.'
where slug = 'how-tenantflow-organizes-your-properties-and-units-in-one-afternoon';

update public.blogs set
  title = 'How to Take Rental Applications Online (Without Tenant Accounts) in TenantFlow',
  seo_title = 'Rental Applications Online: Send Applicants a Shareable Link',
  meta_description = 'Send applicants a shareable link for a specific unit, review submissions, and turn an approved applicant into a tenant. No applicant accounts needed.',
  excerpt = 'Send applicants a shareable link for a specific unit, review submissions, and turn an approved applicant into a tenant. No applicant accounts needed.'
where slug = 'how-tenantflow-streamlines-application-collection-for-independent-landlords';

update public.blogs set
  seo_title = 'TenantFlow Free Trial: What to Set Up First',
  meta_description = 'A plan for your 14-day TenantFlow trial: properties and units, your first lease, tenant records, maintenance, and reports, in the order that pays off.',
  excerpt = 'A plan for your 14-day TenantFlow trial: properties and units, your first lease, tenant records, maintenance, and reports, in the order that pays off.'
where slug = 'what-to-set-up-first-during-your-tenantflow-14-day-free-trial';

update public.blogs set
  seo_title = 'TenantFlow Pricing: Starter vs Growth vs Max',
  meta_description = 'Compare TenantFlow''s Starter ($19), Growth ($49) and Max ($149) plans by properties, units, e-sign volume and storage, and pick one for your rentals.',
  excerpt = 'Compare TenantFlow''s Starter ($19), Growth ($49) and Max ($149) plans by properties, units, e-sign volume and storage, and pick one for your rentals.'
where slug = 'choosing-the-right-tenantflow-plan-starter-growth-or-max';

update public.blogs set
  title = 'Lease Renewal Reminders: How TenantFlow Keeps You Ahead of Every Lease End',
  seo_title = 'Lease Renewal Reminders for Landlords: Never Miss a Renewal',
  excerpt = meta_description
where slug = 'tenantflow-how-lease-renewal-reminders-keep-independent-landlords-organized';

update public.blogs set
  title = 'How to Organize Leases, Receipts and Inspection Photos in One Place (with TenantFlow)',
  seo_title = 'How to Organize Rental Property Documents in One Place',
  meta_description = 'Store every lease, receipt and inspection photo against its property, unit, tenant or repair, then search, filter by date, and zip it all for your CPA.',
  excerpt = 'Store every lease, receipt and inspection photo against its property, unit, tenant or repair, then search, filter by date, and zip it all for your CPA.'
where slug = 'how-tenantflow-organizes-your-leases-receipts-and-inspection-photos-in-one-place';

update public.blogs set
  title = 'Landlord Tax Season Checklist: How TenantFlow Gets Your Records CPA-Ready',
  seo_title = 'Landlord Tax Prep: Organize Rental Records for Schedule E',
  meta_description = 'Get rental income, repair costs and receipts CPA-ready: how TenantFlow''s ledger, maintenance costs, year-end PDFs and document zip cover Schedule E prep.',
  excerpt = 'Get rental income, repair costs and receipts CPA-ready: how TenantFlow''s ledger, maintenance costs, year-end PDFs and document zip cover Schedule E prep.'
where slug = 'how-tenantflow-simplifies-tax-season-for-independent-landlords';

update public.blogs set
  title = 'How a Rent Ledger Keeps Your Rental Income Straight (and How TenantFlow''s Works)',
  seo_title = 'Rent Ledger for Landlords: Track Rent Charges and Payments',
  meta_description = 'TenantFlow adds each month''s rent charge automatically; you record payments, late fees and credits, and see each lease''s balance. No bank link needed.',
  excerpt = 'TenantFlow adds each month''s rent charge automatically; you record payments, late fees and credits, and see each lease''s balance. No bank link needed.'
where slug = 'how-tenantflow-s-rent-ledger-brings-order-to-your-rental-income';

update public.blogs set
  title = 'Move-In and Move-Out Inspections: A Room-by-Room Record in TenantFlow',
  seo_title = 'Move-In and Move-Out Inspection Checklist for Landlords',
  meta_description = 'Document every room at move-in and move-out with photos, a condition rating and notes, tied to the lease, so deposit decisions rest on dated evidence.',
  excerpt = 'Document every room at move-in and move-out with photos, a condition rating and notes, tied to the lease, so deposit decisions rest on dated evidence.'
where slug = 'tenantflow-the-simple-way-to-run-move-in-and-move-out-inspections';
