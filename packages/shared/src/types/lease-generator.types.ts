/**
 * TenantFlow Lease Generator - Production SaaS Types
 * Core Types for Dynamic Lease Generation
 */
/**
 * US States with specific lease requirements
 */
export type USState = 
  | 'AL' | 'AK' | 'AZ' | 'AR' | 'CA' | 'CO' | 'CT' | 'DE' | 'FL' | 'GA'
  | 'HI' | 'ID' | 'IL' | 'IN' | 'IA' | 'KS' | 'KY' | 'LA' | 'ME' | 'MD'
  | 'MA' | 'MI' | 'MN' | 'MS' | 'MO' | 'MT' | 'NE' | 'NV' | 'NH' | 'NJ'
  | 'NM' | 'NY' | 'NC' | 'ND' | 'OH' | 'OK' | 'OR' | 'PA' | 'RI' | 'SC'
  | 'SD' | 'TN' | 'TX' | 'UT' | 'VT' | 'VA' | 'WA' | 'WV' | 'WI' | 'WY'
  | 'DC'; // District of Columbia

/**
 * Property types with different legal requirements
 */
export type PropertyType = 
  | 'single_family_home'
  | 'apartment'
  | 'condo'
  | 'townhouse'
  | 'duplex'
  | 'mobile_home'
  | 'room_rental'
  | 'commercial';

/**
 * Lease term types
 */
export type LeaseTermType = 
  | 'fixed_term'      // Standard 1-year lease
  | 'month_to_month'  // Monthly renewal
  | 'week_to_week'    // Weekly (rare)
  | 'at_will';        // Terminable at any time

/**
 * Base lease form data that user fills out
 */
export interface LeaseFormData {
  // Property Information
  property: {
    address: {
      street: string;
      unit?: string;
      city: string;
      state: USState;
      zipCode: string;
    };
    type: PropertyType;
    bedrooms: number;
    bathrooms: number;
    squareFeet?: number;
    parking?: {
      included: boolean;
      spaces?: number;
      monthly_fee?: number;
    };
    amenities?: string[];
  };

  // Landlord Information
  landlord: {
    name: string;
    isEntity: boolean; // Individual vs LLC/Corp
    entityType?: 'LLC' | 'Corporation' | 'Partnership';
    address: {
      street: string;
      city: string;
      state: USState;
      zipCode: string;
    };
    phone: string;
    email: string;
    agent?: {
      name: string;
      phone: string;
      email: string;
    };
  };

  // Tenant Information
  tenants: Array<{
    name: string;
    email: string;
    phone: string;
    isMainTenant: boolean;
  }>;

  // Lease Terms
  leaseTerms: {
    type: LeaseTermType;
    startDate: string; // ISO date
    endDate?: string; // For fixed term
    rentAmount: number; // Monthly rent in cents
    currency: 'USD';
    
    // Payment Terms
    dueDate: number; // Day of month (1-31)
    lateFee: {
      enabled: boolean;
      amount?: number;
      gracePeriod?: number; // Days
      percentage?: number; // Alternative to fixed amount
    };
    
    // Security Deposit
    securityDeposit: {
      amount: number;
      monthsRent: number; // 1x, 2x, etc.
      holdingAccount?: boolean; // Some states require separate account
    };
    
    // Additional Fees
    additionalFees?: Array<{
      type: 'pet_fee' | 'cleaning_fee' | 'application_fee' | 'key_deposit' | 'other';
      description: string;
      amount: number;
      refundable: boolean;
    }>;
  };

  // Property Rules & Policies
  policies?: {
    pets: {
      allowed: boolean;
      types?: Array<'dogs' | 'cats' | 'birds' | 'fish' | 'other'>;
      deposit?: number;
      monthlyFee?: number;
      restrictions?: string; // Weight limits, breed restrictions
    };
    smoking: {
      allowed: boolean;
      designatedAreas?: string;
    };
    guests: {
      overnightLimit?: number; // Days per month
      extendedStayLimit?: number; // Consecutive days
    };
    maintenance: {
      tenantResponsibilities: string[];
      landlordResponsibilities: string[];
    };
  };

  // Optional Custom Terms
  customTerms?: Array<{
    title: string;
    content: string;
    required: boolean;
  }>;

  // Generation Options
  options: {
    includeStateDisclosures: boolean;
    includeFederalDisclosures: boolean;
    includeSignaturePages: boolean;
    format: 'standard' | 'detailed' | 'simple';
  };
}

/**
 * State-specific legal requirements
 */
export interface StateLeaseRequirements {
  state: USState;
  stateName: string;
  
  // Security Deposit Rules
  securityDeposit: {
    maxAmount: {
      type: 'months_rent' | 'fixed_amount';
      value: number;
    };
    holdingRequirements: {
      separateAccount: boolean;
      interestRequired: boolean;
      interestRate?: number;
    };
    returnPeriod: number; // Days
  };

  // Required Disclosures
  requiredDisclosures: Array<{
    type: 'lead_paint' | 'mold' | 'bed_bugs' | 'sex_offender' | 'flood_zone' | 'other';
    title: string;
    content: string;
    applicableIf?: {
      propertyType?: PropertyType[];
      buildYear?: 'before_1978' | 'any';
      floodZone?: boolean;
    };
  }>;

  // Notice Periods
  noticePeriods: {
    monthToMonthTermination: number; // Days
    rentIncrease: number; // Days
    entryForInspection: number; // Hours
    entryForRepairs: number; // Hours
  };

  // Late Fee Rules
  lateFeeRules: {
    maxAmount?: {
      type: 'percentage' | 'fixed';
      value: number;
    };
    gracePeriod: number; // Minimum grace period in days
    dailyFees: boolean; // Whether daily late fees are allowed
  };

  // Prohibited Clauses
  prohibitedClauses: Array<{
    type: string;
    description: string;
    reason: string;
  }>;

  // Required Clauses
  requiredClauses: Array<{
    type: string;
    title: string;
    content: string;
    placement: 'beginning' | 'middle' | 'end';
  }>;
}

/**
 * Generated lease document
 */
export interface GeneratedLease {
  id: string;
  userId: string;
  
  // Form data used
  formData: LeaseFormData;
  
  // Generated content
  document: {
    html: string;
    pdf: Buffer;
    pageCount: number;
    generatedAt: string;
  };
  
  // State compliance info
  compliance: {
    state: USState;
    appliedRules: string[];
    warnings: Array<{
      type: 'info' | 'warning' | 'error';
      message: string;
      suggestion?: string;
    }>;
  };
  
  // Billing
  billing: {
    plan: 'free' | 'basic' | 'pro' | 'enterprise';
    cost: number;
    transaction?: string; // Stripe payment intent ID
  };
  
  // Status
  status: 'draft' | 'generated' | 'downloaded' | 'signed';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  expiresAt: string; // When draft expires
}

/**
 * User's lease generation history
 */
export interface UserLeaseHistory {
  userId: string;
  leases: GeneratedLease[];
  
  // Usage statistics
  usage: {
    totalGenerated: number;
    thisMonth: number;
    planLimits: {
      monthlyLimit: number;
      remaining: number;
    };
  };
  
  // Billing info
  billing: {
    currentPlan: 'free' | 'basic' | 'pro' | 'enterprise';
    subscriptionId?: string;
    nextBillingDate?: string;
  };
}

/**
 * Pricing tiers for lease generation
 */
export interface LeaseGenerationPricing {
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  
  limits: {
    leasesPerMonth: number;
    statesSupported: USState[] | 'all';
    customClauses: boolean;
    priority_support: boolean;
    whiteLabel: boolean;
  };
  
  pricing: {
    monthly: number; // in cents
    yearly: number; // in cents
    perLease: number; // in cents (for overage)
  };
  
  features: string[];
}

// API Response Types
export interface LeaseGenerationResponse {
  success: boolean;
  lease: GeneratedLease;
  downloadUrl: string;
  previewUrl: string;
}

export interface LeaseValidationResponse {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    suggestion: string;
  }>;
  stateRequirements: StateLeaseRequirements;
}