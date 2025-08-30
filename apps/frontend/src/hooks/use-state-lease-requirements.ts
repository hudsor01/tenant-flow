import { useQuery } from '@tanstack/react-query'
import type { USState, StateLeaseRequirements } from '@repo/shared'

// State-specific lease requirements database
const STATE_REQUIREMENTS: Partial<Record<USState, StateLeaseRequirements>> = {
  CA: {
    state: 'CA',
    stateName: 'California',
    securityDeposit: {
      maxAmount: { type: 'months_rent', value: 2 },
      holdingRequirements: {
        separateAccount: false,
        interestRequired: false,
      },
      returnPeriod: 21,
    },
    requiredDisclosures: [
      {
        type: 'lead_paint',
        title: 'Lead-Based Paint Disclosure',
        content: 'Properties built before 1978 may contain lead-based paint...',
        applicableIf: { buildYear: 'before_1978' },
      },
      {
        type: 'bed_bugs',
        title: 'Bed Bug History',
        content: 'Landlord must disclose any known bed bug infestations in the past year...',
      },
    ],
    noticePeriods: {
      monthToMonthTermination: 30,
      rentIncrease: 30,
      entryForInspection: 24,
      entryForRepairs: 24,
    },
    lateFeeRules: {
      gracePeriod: 3,
      dailyFees: false,
    },
    prohibitedClauses: [
      {
        type: 'waiver_of_habitability',
        description: 'Cannot waive habitability warranties',
        reason: 'Civil Code Section 1942.1',
      },
      {
        type: 'liquidated_damages',
        description: 'Liquidated damage clauses are unenforceable',
        reason: 'Civil Code Section 1671',
      },
    ],
    requiredClauses: [
      {
        type: 'habitability_warranty',
        title: 'Warranty of Habitability',
        content: 'Landlord warrants that the premises are fit for human occupancy...',
        placement: 'beginning',
      },
    ],
  },

  TX: {
    state: 'TX',
    stateName: 'Texas',
    securityDeposit: {
      maxAmount: { type: 'months_rent', value: 2 },
      holdingRequirements: {
        separateAccount: false,
        interestRequired: false,
      },
      returnPeriod: 30,
    },
    requiredDisclosures: [
      {
        type: 'lead_paint',
        title: 'Lead-Based Paint Disclosure',
        content: 'Properties built before 1978 may contain lead-based paint...',
        applicableIf: { buildYear: 'before_1978' },
      },
    ],
    noticePeriods: {
      monthToMonthTermination: 30,
      rentIncrease: 30,
      entryForInspection: 24,
      entryForRepairs: 0, // Can enter without notice for repairs
    },
    lateFeeRules: {
      gracePeriod: 1, // Very landlord-friendly
      dailyFees: true,
    },
    prohibitedClauses: [],
    requiredClauses: [],
  },

  NY: {
    state: 'NY',
    stateName: 'New York',
    securityDeposit: {
      maxAmount: { type: 'months_rent', value: 1 },
      holdingRequirements: {
        separateAccount: true,
        interestRequired: true,
        interestRate: 1,
      },
      returnPeriod: 14,
    },
    requiredDisclosures: [
      {
        type: 'lead_paint',
        title: 'Lead-Based Paint Disclosure',
        content: 'Properties built before 1978 may contain lead-based paint...',
        applicableIf: { buildYear: 'before_1978' },
      },
      {
        type: 'bed_bugs',
        title: 'Bed Bug Disclosure',
        content: 'Annual bed bug disclosure required...',
      },
    ],
    noticePeriods: {
      monthToMonthTermination: 30,
      rentIncrease: 30,
      entryForInspection: 24,
      entryForRepairs: 24,
    },
    lateFeeRules: {
      maxAmount: { type: 'percentage', value: 0.05 }, // 5% max
      gracePeriod: 5,
      dailyFees: false,
    },
    prohibitedClauses: [
      {
        type: 'waiver_of_jury_trial',
        description: 'Cannot waive right to jury trial',
        reason: 'Real Property Law',
      },
    ],
    requiredClauses: [
      {
        type: 'rent_stabilization',
        title: 'Rent Stabilization Notice',
        content: 'If applicable, tenant rights under rent stabilization laws...',
        placement: 'beginning',
      },
    ],
  },

  FL: {
    state: 'FL',
    stateName: 'Florida',
    securityDeposit: {
      maxAmount: { type: 'months_rent', value: 2 },
      holdingRequirements: {
        separateAccount: true,
        interestRequired: true,
        interestRate: 2,
      },
      returnPeriod: 15,
    },
    requiredDisclosures: [
      {
        type: 'lead_paint',
        title: 'Lead-Based Paint Disclosure',
        content: 'Properties built before 1978 may contain lead-based paint...',
        applicableIf: { buildYear: 'before_1978' },
      },
      {
        type: 'mold',
        title: 'Mold Disclosure',
        content: 'Florida requires mold disclosure for rental properties...',
      },
    ],
    noticePeriods: {
      monthToMonthTermination: 15,
      rentIncrease: 30,
      entryForInspection: 12,
      entryForRepairs: 12,
    },
    lateFeeRules: {
      gracePeriod: 3,
      dailyFees: true,
    },
    prohibitedClauses: [],
    requiredClauses: [
      {
        type: 'radon_notice',
        title: 'Radon Gas Notice',
        content: 'Radon is a naturally occurring radioactive gas...',
        placement: 'end',
      },
    ],
  },

  // Add more states as needed...
  // For now, create a default template for other states
} as const

// Default requirements for states not yet implemented
const DEFAULT_REQUIREMENTS: StateLeaseRequirements = {
  state: 'AL', // placeholder
  stateName: 'Default State',
  securityDeposit: {
    maxAmount: { type: 'months_rent', value: 2 },
    holdingRequirements: {
      separateAccount: false,
      interestRequired: false,
    },
    returnPeriod: 30,
  },
  requiredDisclosures: [
    {
      type: 'lead_paint',
      title: 'Lead-Based Paint Disclosure',
      content: 'Properties built before 1978 may contain lead-based paint...',
      applicableIf: { buildYear: 'before_1978' },
    },
  ],
  noticePeriods: {
    monthToMonthTermination: 30,
    rentIncrease: 30,
    entryForInspection: 24,
    entryForRepairs: 24,
  },
  lateFeeRules: {
    gracePeriod: 5,
    dailyFees: false,
  },
  prohibitedClauses: [],
  requiredClauses: [],
}

// Fill in remaining states with default requirements
const ALL_STATES: USState[] = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]

// Create complete state requirements with defaults
const COMPLETE_STATE_REQUIREMENTS: Record<USState, StateLeaseRequirements> = {} as Record<USState, StateLeaseRequirements>

ALL_STATES.forEach(state => {
  COMPLETE_STATE_REQUIREMENTS[state] = STATE_REQUIREMENTS[state] || {
    ...DEFAULT_REQUIREMENTS,
    state,
    stateName: getStateName(state),
  }
})

function getStateName(state: USState): string {
  const stateNames: Record<USState, string> = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
    HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
    KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
    MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
    NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
    OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
    VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
    DC: 'District of Columbia'
  }
  return stateNames[state] || state
}

/**
 * Hook to get state-specific lease requirements
 */
export function useStateLeaseRequirements(state?: USState) {
  return useQuery({
    queryKey: ['state-lease-requirements', state],
    queryFn: async () => {
      if (!state) return null
      
      // In a real app, this would be an API call
      // await fetch(`/api/lease-requirements/${state}`)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100))
      
      return COMPLETE_STATE_REQUIREMENTS[state]
    },
    enabled: !!state,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

/**
 * Hook to validate lease form data against state requirements
 */
export function useLeaseValidation(formData?: { leaseTerms?: { securityDeposit?: { amount?: number }, lateFee?: { enabled?: boolean, amount?: number, gracePeriod?: number }, rentAmount?: number } }, state?: USState) {
  const { data: requirements } = useStateLeaseRequirements(state)
  
  return useQuery({
    queryKey: ['lease-validation', formData, state],
    queryFn: async () => {
      if (!formData || !requirements || !state) return null
      
      const warnings: Array<{ field: string; message: string; suggestion: string }> = []
      const errors: Array<{ field: string; message: string; code: string }> = []
      
      // Validate security deposit
      const leaseTerms = formData.leaseTerms
      if (leaseTerms?.securityDeposit?.amount && leaseTerms.rentAmount) {
        const depositAmount = leaseTerms.securityDeposit.amount / 100 // Convert from cents
        const rentAmount = leaseTerms.rentAmount / 100
        const maxDeposit = requirements.securityDeposit.maxAmount.value * rentAmount
        
        if (depositAmount > maxDeposit) {
          errors.push({
            field: 'leaseTerms.securityDeposit.amount',
            message: `Security deposit cannot exceed ${requirements.securityDeposit.maxAmount.value}x monthly rent in ${requirements.stateName}`,
            code: 'DEPOSIT_TOO_HIGH'
          })
        }
      }
      
      // Validate late fee rules
      if (leaseTerms?.lateFee?.enabled && leaseTerms.lateFee.amount && leaseTerms.rentAmount && requirements.lateFeeRules.maxAmount) {
        const lateFeeAmount = leaseTerms.lateFee.amount / 100
        const rentAmount = leaseTerms.rentAmount / 100
        
        if (requirements.lateFeeRules.maxAmount.type === 'percentage') {
          const maxFee = rentAmount * requirements.lateFeeRules.maxAmount.value
          if (lateFeeAmount > maxFee) {
            errors.push({
              field: 'leaseTerms.lateFee.amount',
              message: `Late fee cannot exceed ${requirements.lateFeeRules.maxAmount.value * 100}% of monthly rent`,
              code: 'LATE_FEE_TOO_HIGH'
            })
          }
        }
        
        if (leaseTerms.lateFee.gracePeriod !== undefined && leaseTerms.lateFee.gracePeriod < requirements.lateFeeRules.gracePeriod) {
          warnings.push({
            field: 'leaseTerms.lateFee.gracePeriod',
            message: `${requirements.stateName} requires minimum ${requirements.lateFeeRules.gracePeriod}-day grace period`,
            suggestion: `Increase grace period to ${requirements.lateFeeRules.gracePeriod} days`
          })
        }
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings,
        stateRequirements: requirements,
      }
    },
    enabled: !!(formData && requirements && state),
  })
}

/**
 * Get all supported states
 */
export function useSupportedStates() {
  return useQuery({
    queryKey: ['supported-states'],
    queryFn: async () => {
      return ALL_STATES.map(state => ({
        code: state,
        name: getStateName(state),
        hasCustomRequirements: !!STATE_REQUIREMENTS[state],
      }))
    },
    staleTime: Infinity, // This doesn't change
  })
}