# Texas Residential Lease Agreement - Form Fields

## Complete Field Structure for Lease Generator

Based on the Texas Residential Lease Agreement template provided.

---

## Multi-Step Form Structure (7 Steps)

### **Step 1: Agreement Basics**

| Field Name | Type | Required | Validation | Example |
|------------|------|----------|------------|---------|
| `agreementDay` | Number | Yes | 1-31 | 15 |
| `agreementMonth` | Select | Yes | Jan-Dec | January |
| `agreementYear` | Number | Yes | YYYY | 2024 |
| `landlordName` | Text | Yes | Min 2 chars | John Smith Properties LLC |
| `tenantName` | Text | Yes | Min 2 chars | Jane Doe |

---

### **Step 2: Property Details**

| Field Name | Type | Required | Validation | Example |
|------------|------|----------|------------|---------|
| `propertyAddress` | Textarea | Yes | Full address | 123 Main Street, Austin, TX 78701 |
| `propertyType` | Select | Yes | Enum | Single Family, Apartment, Condo, Townhouse |
| `unitNumber` | Text | No | Optional | Apt 4B |
| `propertyBuiltBefore1978` | Boolean | Yes | Required by law | false |

---

### **Step 3: Lease Term**

| Field Name | Type | Required | Validation | Example |
|------------|------|----------|------------|---------|
| `commencementDate` | Date | Yes | Future date | 2024-02-01 |
| `terminationDate` | Date | Yes | After start | 2025-01-31 |
| `leaseType` | Radio | Yes | Fixed/Month-to-Month | Fixed Term |
| `monthToMonthNotice` | Number | If M2M | Days (default 30) | 30 |

**Auto-Calculated**:
- Lease duration (months)
- Is mid-month start (for prorating)

---

### **Step 4: Financial Terms**

| Field Name | Type | Required | Validation | Example |
|------------|------|----------|------------|---------|
| `monthlyRent` | Currency | Yes | > 0 | 1500.00 |
| `rentDueDay` | Number | Yes | 1-31 (default 1) | 1 |
| `lateFeePerDay` | Currency | Yes | >= 0 | 50.00 |
| `lateChargeWaiverDay` | Number | Yes | 1-31 (default 3) | 3 |
| `nsfCheckFee` | Currency | Yes | >= 0 | 50.00 |
| `securityDeposit` | Currency | Yes | >= 0 | 1500.00 |
| `holdOverRent` | Currency | Yes | >= monthlyRent | 1800.00 |
| `proratedFirstMonth` | Boolean | Auto | Based on start date | true |
| `proratedAmount` | Currency | Auto | Calculated | 750.00 |

**Auto-Calculations**:
- If start date is not 1st of month → calculate prorated rent
- Suggested security deposit = 1x monthly rent
- Suggested hold over rent = 1.2x monthly rent

---

### **Step 5: Occupancy & Restrictions**

| Field Name | Type | Required | Validation | Example |
|------------|------|----------|------------|---------|
| `immediateFamilyMembers` | Textarea | No | Comma-separated | John Doe (spouse), Emily Doe (daughter, age 8) |
| `maxOccupants` | Number | Yes | > 0 | 4 |
| `petsAllowed` | Boolean | Yes | Yes/No | false |
| `petFeePerDay` | Currency | If pets | >= 0 | 25.00 |
| `waterbedsAllowed` | Boolean | Yes | Yes/No | false |

**Conditional Logic**:
- If `petsAllowed = true` → show `petFeePerDay` field
- If `waterbedsAllowed = true` → require separate Waterbed Addendum

---

### **Step 6: Responsibilities & Notices**

| Field Name | Type | Required | Validation | Example |
|------------|------|----------|------------|---------|
| `tenantResponsibleForUtilities` | Multi-Select | Yes | Checkboxes | Electric, Water, Gas, Internet |
| `landlordNoticeAddress` | Textarea | Yes | Full address | 456 Property Management Ave, Austin, TX 78702 |
| `landlordEmail` | Email | Yes | Valid email | landlord@example.com |
| `landlordPhone` | Phone | Yes | Valid phone | (512) 555-0100 |
| `tenantEmail` | Email | Yes | Valid email | tenant@example.com |
| `tenantPhone` | Phone | Yes | Valid phone | (512) 555-0200 |

---

### **Step 7: Legal Disclosures & Review**

| Field Name | Type | Required | Validation | Example |
|------------|------|----------|------------|---------|
| `leadPaintDisclosureProvided` | Boolean | If pre-1978 | Required | true |
| `leadPaintDisclosureAcknowledged` | Checkbox | If pre-1978 | Must check | true |
| `hoaRules` | Boolean | No | Has HOA? | false |
| `condoRules` | Boolean | No | Is condo? | false |
| `specialClauses` | Textarea | No | Custom text | No smoking within 25 feet of building |
| `additionalAddendums` | Multi-Select | No | Checkboxes | Pet Addendum, Parking Addendum |

**Final Review Screen**:
- Preview generated PDF
- Confirm all details
- Accept terms checkbox
- Generate & Send for Signature button

---

## Complete Zod Schema

```typescript
// packages/shared/src/validation/lease-generator.schemas.ts

import { z } from 'zod'

export const leaseFormSchema = z.object({
  // Step 1: Agreement Basics
  agreementDay: z.number().min(1).max(31),
  agreementMonth: z.enum([
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]),
  agreementYear: z.number().min(2024).max(2050),
  landlordName: z.string().min(2, 'Landlord name required'),
  tenantName: z.string().min(2, 'Tenant name required'),

  // Step 2: Property Details
  propertyAddress: z.string().min(10, 'Full property address required'),
  propertyType: z.enum(['Single Family', 'Apartment', 'Condo', 'Townhouse']),
  unitNumber: z.string().optional(),
  propertyBuiltBefore1978: z.boolean(),

  // Step 3: Lease Term
  commencementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date required'),
  terminationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date required'),
  leaseType: z.enum(['Fixed Term', 'Month-to-Month']),
  monthToMonthNotice: z.number().min(1).max(90).default(30),

  // Step 4: Financial Terms
  monthlyRent: z.number().min(1, 'Monthly rent must be positive'),
  rentDueDay: z.number().min(1).max(31).default(1),
  lateFeePerDay: z.number().min(0),
  lateChargeWaiverDay: z.number().min(1).max(31).default(3),
  nsfCheckFee: z.number().min(0),
  securityDeposit: z.number().min(0),
  holdOverRent: z.number().min(0),

  // Step 5: Occupancy & Restrictions
  immediateFamilyMembers: z.string().optional(),
  maxOccupants: z.number().min(1),
  petsAllowed: z.boolean(),
  petFeePerDay: z.number().min(0).optional(),
  waterbedsAllowed: z.boolean(),

  // Step 6: Responsibilities & Notices
  tenantResponsibleForUtilities: z.array(z.enum([
    'Electric', 'Water', 'Gas', 'Sewer', 'Trash', 'Internet', 'Cable'
  ])),
  landlordNoticeAddress: z.string().min(10),
  landlordEmail: z.string().email(),
  landlordPhone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Format: (123) 456-7890'),
  tenantEmail: z.string().email(),
  tenantPhone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Format: (123) 456-7890'),

  // Step 7: Legal Disclosures
  leadPaintDisclosureProvided: z.boolean().optional(),
  leadPaintDisclosureAcknowledged: z.boolean().optional(),
  hoaRules: z.boolean().default(false),
  condoRules: z.boolean().default(false),
  specialClauses: z.string().optional(),
  additionalAddendums: z.array(z.string()).optional()
})
.refine(
  (data) => new Date(data.terminationDate) > new Date(data.commencementDate),
  {
    message: 'Termination date must be after commencement date',
    path: ['terminationDate']
  }
)
.refine(
  (data) => !data.propertyBuiltBefore1978 || data.leadPaintDisclosureProvided,
  {
    message: 'Lead paint disclosure required for properties built before 1978',
    path: ['leadPaintDisclosureProvided']
  }
)
.refine(
  (data) => !data.petsAllowed || (data.petFeePerDay && data.petFeePerDay > 0),
  {
    message: 'Pet fee per day required when pets are allowed',
    path: ['petFeePerDay']
  }
)
.refine(
  (data) => data.holdOverRent >= data.monthlyRent,
  {
    message: 'Hold over rent must be at least equal to monthly rent',
    path: ['holdOverRent']
  }
)

export type LeaseFormData = z.infer<typeof leaseFormSchema>

// Helper schemas for nested DTOs
export const createLeaseFormDto = leaseFormSchema
export const updateLeaseFormDto = leaseFormSchema.partial()
```

---

## Smart Defaults & Auto-Fill Logic

### **Pre-fill from Property Data**

When landlord selects a property from dropdown:

```typescript
// Auto-populate these fields:
{
  propertyAddress: property.fullAddress,
  propertyType: property.type,
  unitNumber: unit?.unitNumber,
  propertyBuiltBefore1978: property.yearBuilt < 1978,
  monthlyRent: unit?.rent || property.baseRent,
  landlordNoticeAddress: property.ownerAddress || user.address,
  landlordEmail: user.email,
  landlordPhone: user.phone
}
```

### **Pre-fill from Tenant Data**

When landlord selects tenant from dropdown:

```typescript
// Auto-populate these fields:
{
  tenantName: `${tenant.firstName} ${tenant.lastName}`,
  tenantEmail: tenant.email,
  tenantPhone: tenant.phone,
  immediateFamilyMembers: tenant.familyMembers // if stored
}
```

### **Smart Calculations**

```typescript
// Auto-calculate security deposit (suggestion)
securityDeposit = monthlyRent * 1.0

// Auto-calculate hold over rent (suggestion)
holdOverRent = monthlyRent * 1.2

// Calculate prorated rent for mid-month start
if (commencementDay !== 1) {
  const daysInMonth = getDaysInMonth(commencementMonth, commencementYear)
  const daysRemaining = daysInMonth - commencementDay + 1
  proratedRent = (monthlyRent / daysInMonth) * daysRemaining
}

// Calculate lease duration
leaseDurationMonths = monthsBetween(commencementDate, terminationDate)
leaseDurationDays = daysBetween(commencementDate, terminationDate)
```

---

## Validation Rules Summary

| Field | Validation Rules |
|-------|------------------|
| `agreementDay` | 1-31, must be valid for month |
| `commencementDate` | Future date (or today) |
| `terminationDate` | After commencement date |
| `monthlyRent` | > 0, format: currency |
| `lateFeePerDay` | >= 0, reasonable (< $200/day) |
| `securityDeposit` | Typically 1-2x monthly rent (TX law) |
| `holdOverRent` | >= monthly rent |
| `landlordEmail` | Valid email format |
| `tenantEmail` | Valid email format, different from landlord |
| `landlordPhone` | US phone format: (XXX) XXX-XXXX |
| `leadPaintDisclosure` | Required if propertyBuiltBefore1978 = true |
| `petFeePerDay` | Required if petsAllowed = true |

---

## Form UX Flow

### **Step Navigation**

```
┌─────────────────────────────────────────────────────────────────┐
│ Progress: ●●●○○○○ (Step 3 of 7)                                │
│                                                                 │
│ Step 3: Lease Term                                             │
│ ─────────────────────────────────────────────────────────────  │
│                                                                 │
│ When does the lease start? *                                   │
│ [Date Picker: 02/01/2024]                                      │
│                                                                 │
│ When does the lease end? *                                     │
│ [Date Picker: 01/31/2025]                                      │
│                                                                 │
│ ℹ️ Lease Duration: 12 months                                   │
│                                                                 │
│ Lease Type: *                                                  │
│ ○ Fixed Term (ends on termination date)                       │
│ ○ Month-to-Month (continues until terminated)                 │
│                                                                 │
│ [Back]                                    [Save & Continue →]  │
└─────────────────────────────────────────────────────────────────┘
```

### **Auto-Save**

- Save form data to localStorage every 30 seconds
- Show "Saved" indicator
- Restore from localStorage if user navigates away
- Clear localStorage after successful generation

### **Validation Feedback**

```
┌─────────────────────────────────────────────────────────────────┐
│ Monthly Rent: *                                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ $                                                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ✓ Suggested security deposit: $1,500.00 (1x monthly rent)     │
│                                                                 │
│ Security Deposit: *                                            │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ $ 1,500.00                                                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ✓ Complies with Texas law (max 2x monthly rent)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## PDF Field Mapping

### **How Form Fields Map to PDF Template**

| PDF Section | Form Fields Used |
|-------------|------------------|
| **Header** | agreementDay, agreementMonth, agreementYear, landlordName, tenantName |
| **Section 1 (Property)** | propertyAddress |
| **Section 2 (Term)** | commencementDate, terminationDate, monthToMonthNotice |
| **Section 3 (Rent)** | monthlyRent, rentDueDay, lateFeePerDay, lateChargeWaiverDay, nsfCheckFee, proratedAmount |
| **Section 4 (Security Deposit)** | securityDeposit |
| **Section 6 (Use of Premises)** | immediateFamilyMembers, maxOccupants |
| **Section 11 (Utilities)** | tenantResponsibleForUtilities |
| **Section 16 (Hold Over)** | holdOverRent |
| **Section 18 (Animals)** | petsAllowed, petFeePerDay |
| **Section 19 (Waterbeds)** | waterbedsAllowed |
| **Section 33 (Notice)** | landlordNoticeAddress |
| **Section 34 (Lead Paint)** | propertyBuiltBefore1978, leadPaintDisclosureProvided |
| **Signature Block** | landlordName, tenantName, agreementDay, agreementMonth, agreementYear |

---

## Next Steps

Once you decide on DocuSeal, I'll prepare:

1. ✅ **Helm chart** for K3s deployment
2. ✅ **NestJS service** for DocuSeal integration
3. ✅ **Multi-step form component** (React + TanStack Form)
4. ✅ **PDF template** (@react-pdf/renderer with all 34 sections)
5. ✅ **n8n workflow** for signature events
6. ✅ **Database migrations** for lease_documents table
7. ✅ **Email templates** for signature notifications

**Ready to deploy DocuSeal and build this feature?**
