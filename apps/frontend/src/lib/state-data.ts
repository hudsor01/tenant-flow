/**
 * State-specific data for lease generation
 */

export interface StateData {
  name: string
  code: string
  hasStateSpecificClauses: boolean
  requiredClauses?: string[]
  legalRequirements?: {
    securityDepositLimit?: string
    noticePeriod?: string
    rentIncreaseNotice?: string
    defaultClauses?: string[]
    keyDisclosures?: string
    noticeToEnter?: string
  }
  marketSize?: number
  searchVolume?: number
}

export const supportedStates: StateData[] = [
  {
    name: 'California',
    code: 'CA',
    hasStateSpecificClauses: true,
    requiredClauses: ['security-deposit-limit', 'rent-control', 'habitability']
  },
  {
    name: 'New York',
    code: 'NY',
    hasStateSpecificClauses: true,
    requiredClauses: ['security-deposit-limit', 'rent-stabilization', 'warranty-of-habitability']
  },
  {
    name: 'Texas',
    code: 'TX',
    hasStateSpecificClauses: true,
    requiredClauses: ['security-deposit-return', 'repair-and-deduct']
  },
  {
    name: 'Florida',
    code: 'FL',
    hasStateSpecificClauses: true,
    requiredClauses: ['security-deposit-interest', 'hurricane-provisions']
  },
  {
    name: 'Illinois',
    code: 'IL',
    hasStateSpecificClauses: true,
    requiredClauses: ['security-deposit-return', 'landlord-disclosure']
  }
]

export const getStateByCode = (code: string): StateData | undefined => {
  return supportedStates.find(state => state.code === code)
}

export const isStateSupported = (code: string): boolean => {
  return supportedStates.some(state => state.code === code)
}

export const getAllStates = (): { value: string; label: string; slug: string; name: string; code: string }[] => {
  return supportedStates.map(state => ({
    value: state.code,
    label: state.name,
    slug: state.name.toLowerCase().replace(/\s+/g, '-'),
    name: state.name,
    code: state.code
  }))
}

// Alias for backward compatibility
export const isValidState = isStateSupported

export const getStateFromSlug = (slug: string): StateData | undefined => {
  // Convert slug format (e.g., "ca", "new-york") to state code
  const normalizedSlug = slug.toUpperCase().replace(/-/g, '')
  
  // First try to match by code
  const stateByCode = supportedStates.find(state => state.code === normalizedSlug)
  if (stateByCode) return stateByCode
  
  // Then try to match by name (handle multi-word states)
  return supportedStates.find(state => 
    state.name.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase()
  )
}