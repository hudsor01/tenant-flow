# Requirements: TenantFlow v1.3

**Defined:** 2026-03-11
**Core Value:** A landlord can add a property, invite a tenant, collect rent, and see their financials -- without touching a spreadsheet or calling anyone.

## v1.3 Requirements

Requirements for Stub Elimination. Each replaces a placeholder/toast with a real, production-ready implementation.

### Email & Notifications

- [x] **EMAIL-01**: Tenant receives invitation email when owner creates invitation (via Edge Function + Resend)
- [x] **EMAIL-02**: Invitation email contains accept link that routes to tenant onboarding

### Data Export & Privacy

- [x] **GDPR-01**: Owner can export all personal data as downloadable file (GDPR/CCPA compliance)
- [x] **GDPR-02**: Owner can self-service delete account with 30-day grace period (no "contact support" workaround)
- [x] **GDPR-03**: Tenant can export all personal data as downloadable file

### Documents & Templates

- [x] **DOC-01**: Owner can preview lease template as PDF before sending
- [x] **DOC-02**: Owner can export/download lease template as PDF
- [x] **DOC-03**: Owner can save custom template definitions (field configurations persist)

### Property Management

- [ ] **PROP-01**: Owner can bulk import properties via CSV upload (backend processes and creates records)
- [ ] **PROP-02**: Bulk import validates CSV data and reports errors before committing

### Maintenance

- [ ] **MAINT-01**: Tenant can upload photos when submitting maintenance request
- [ ] **MAINT-02**: Owner can view maintenance request photos in detail view

### Stripe Integration

- [ ] **STRIPE-01**: Owner can access Stripe Express Dashboard via login link from connect status page

## Future Requirements

### Code Quality

- **QUAL-F01**: Knip CI integration to prevent dead code regression
- **QUAL-F02**: Full typography normalization across all 350+ files
- **QUAL-F03**: MSW component test layer
- **QUAL-F04**: Test data factories (@faker-js/faker)

### UI Enhancements

- **UI-F01**: Dark mode implementation
- **UI-F02**: Storybook / visual regression CI
- **UI-F03**: Accessibility regression test suite

## Out of Scope

| Feature | Reason |
|---------|--------|
| In-app notifications | Email covers notification needs for now |
| Twilio SMS notifications | Email sufficient for v1 |
| Real-time chat | High complexity, not core to property management |
| Mobile app | Web-first approach |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EMAIL-01 | Phase 21 | Complete |
| EMAIL-02 | Phase 21 | Complete |
| GDPR-01 | Phase 22 | Complete |
| GDPR-02 | Phase 22 | Complete |
| GDPR-03 | Phase 22 | Complete |
| DOC-01 | Phase 23 | Complete |
| DOC-02 | Phase 23 | Complete |
| DOC-03 | Phase 23 | Complete |
| PROP-01 | Phase 24 | Pending |
| PROP-02 | Phase 24 | Pending |
| MAINT-01 | Phase 25 | Pending |
| MAINT-02 | Phase 25 | Pending |
| STRIPE-01 | Phase 25 | Pending |

**Coverage:**
- v1.3 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-03-11*
*Last updated: 2026-03-11 after roadmap creation*
