/**
 * State-specific data for lease generators
 * Prioritized by rental market size and search volume
 */

export interface StateLeaseData {
  code: string;
  name: string;
  marketSize: number; // Estimated rental units (thousands)
  searchVolume: number; // Monthly Google searches
  legalRequirements: {
    securityDepositLimit: string;
    noticeToEnter: string;
    noticePeriod: string;
    keyDisclosures: string[];
  };
  seoKeywords: string[];
  metaDescription: string;
}

export const STATE_LEASE_DATA: Record<string, StateLeaseData> = {
  california: {
    code: 'CA',
    name: 'California',
    marketSize: 5800,
    searchVolume: 8900,
    legalRequirements: {
      securityDepositLimit: '1 month rent (effective July 1, 2024), 2 months for small landlords with exceptions',
      noticeToEnter: '24 hours written notice required',
      noticePeriod: '30 days for month-to-month tenancies',
      keyDisclosures: [
        'Lead-based paint disclosure (pre-1978 properties)',
        'Mold disclosure and information booklet',
        'Bedbug disclosure',
        'Military ordnance disclosure (if applicable)',
        'Death disclosure (if applicable)',
        'Security deposit return within 21 days with itemized statement'
      ]
    },
    seoKeywords: ['california lease agreement', 'CA rental lease', 'california landlord forms', 'residential lease california'],
    metaDescription: 'Generate compliant California lease agreements with 2024 security deposit law updates. Includes all required disclosures, CA-specific legal requirements. Free template download.'
  },
  florida: {
    code: 'FL',
    name: 'Florida',
    marketSize: 3200,
    searchVolume: 6200,
    legalRequirements: {
      securityDepositLimit: 'No statutory limit',
      noticeToEnter: '12 hours notice, except emergencies',
      noticePeriod: '15 days for month-to-month tenancies',
      keyDisclosures: [
        'Lead-based paint disclosure (pre-1978 properties)',
        'Radon gas disclosure',
        'Fire sprinkler disclosure',
        'Mold disclosure (if known)'
      ]
    },
    seoKeywords: ['florida lease agreement', 'FL rental lease', 'florida landlord forms', 'residential lease florida'],
    metaDescription: 'Create Florida-compliant lease agreements with required disclosures. Includes FL-specific legal requirements, radon notices, and fire safety provisions.'
  },
  texas: {
    code: 'TX',
    name: 'Texas',
    marketSize: 3800,
    searchVolume: 7100,
    legalRequirements: {
      securityDepositLimit: 'No statutory limit',
      noticeToEnter: 'No specific statute, reasonable notice required',
      noticePeriod: '30 days for month-to-month tenancies',
      keyDisclosures: [
        'Lead-based paint disclosure (pre-1978 properties)',
        'Previous flooding disclosure',
        'Swimming pool safety features',
        'Smoke detector disclosure'
      ]
    },
    seoKeywords: ['texas lease agreement', 'TX rental lease', 'texas landlord forms', 'residential lease texas'],
    metaDescription: 'Generate Texas residential lease agreements with required flooding disclosures and safety notices. TAR-approved format with TX-specific legal protections.'
  },
  newyork: {
    code: 'NY',
    name: 'New York',
    marketSize: 4100,
    searchVolume: 9800,
    legalRequirements: {
      securityDepositLimit: '1 month rent (unless tenant is 62+ years old)',
      noticeToEnter: 'Reasonable notice required, typically 24 hours',
      noticePeriod: '30 days for month-to-month tenancies',
      keyDisclosures: [
        'Lead-based paint disclosure (pre-1978 properties)',
        'Window guard disclosure (buildings 3+ stories with children under 11)',
        'Bedbug infestation history (if any)',
        'Right to request reasonable accommodations'
      ]
    },
    seoKeywords: ['new york lease agreement', 'NY rental lease', 'new york landlord forms', 'residential lease ny'],
    metaDescription: 'NY-compliant lease agreements with required window guard notices and bedbug disclosures. Includes New York tenant protection provisions and legal requirements.'
  },
  illinois: {
    code: 'IL',
    name: 'Illinois',
    marketSize: 1800,
    searchVolume: 3400,
    legalRequirements: {
      securityDepositLimit: 'No statutory limit',
      noticeToEnter: '2 days notice for non-emergency entry',
      noticePeriod: '30 days for month-to-month tenancies',
      keyDisclosures: [
        'Lead-based paint disclosure (pre-1978 properties)',
        'Radon disclosure (if applicable)',
        'Utility payment disclosure',
        'Fire damage disclosure'
      ]
    },
    seoKeywords: ['illinois lease agreement', 'IL rental lease', 'illinois landlord forms', 'residential lease illinois'],
    metaDescription: 'Illinois residential lease agreements with required utility disclosures and radon notices. IL-specific landlord-tenant law compliance included.'
  }
};

// All 50 US states - prioritized by rental market size and search volume
export const ALL_US_STATES: Record<string, StateLeaseData> = {
  ...STATE_LEASE_DATA,
  // Western States
  washington: {
    code: 'WA', name: 'Washington', marketSize: 1200, searchVolume: 2800,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: '2 days notice', noticePeriod: '20 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['washington lease agreement', 'WA rental lease'], metaDescription: 'Generate Washington state lease agreements with required legal disclosures.'
  },
  oregon: {
    code: 'OR', name: 'Oregon', marketSize: 800, searchVolume: 1900,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: '24 hours notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['oregon lease agreement', 'OR rental lease'], metaDescription: 'Create Oregon residential lease agreements with state-specific requirements.'
  },
  arizona: {
    code: 'AZ', name: 'Arizona', marketSize: 1100, searchVolume: 2400,
    legalRequirements: { securityDepositLimit: '1.5 months rent', noticeToEnter: '2 days notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['arizona lease agreement', 'AZ rental lease'], metaDescription: 'Arizona residential lease agreements with state-compliant security deposit limits.'
  },
  nevada: {
    code: 'NV', name: 'Nevada', marketSize: 600, searchVolume: 1400,
    legalRequirements: { securityDepositLimit: '3 months rent', noticeToEnter: '24 hours notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['nevada lease agreement', 'NV rental lease'], metaDescription: 'Nevada lease agreements with 3-month security deposit limits.'
  },
  colorado: {
    code: 'CO', name: 'Colorado', marketSize: 950, searchVolume: 2100,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: 'Reasonable notice', noticePeriod: '21 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['colorado lease agreement', 'CO rental lease'], metaDescription: 'Colorado residential lease agreements with state requirements.'
  },
  utah: {
    code: 'UT', name: 'Utah', marketSize: 450, searchVolume: 980,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: '24 hours notice', noticePeriod: '15 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['utah lease agreement', 'UT rental lease'], metaDescription: 'Utah lease templates with required state disclosures.'
  },
  idaho: {
    code: 'ID', name: 'Idaho', marketSize: 280, searchVolume: 620,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: 'Reasonable notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['idaho lease agreement', 'ID rental lease'], metaDescription: 'Idaho residential lease agreements and rental forms.'
  },
  montana: {
    code: 'MT', name: 'Montana', marketSize: 180, searchVolume: 410,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: '24 hours notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['montana lease agreement', 'MT rental lease'], metaDescription: 'Montana lease agreement templates with state requirements.'
  },
  wyoming: {
    code: 'WY', name: 'Wyoming', marketSize: 120, searchVolume: 280,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: 'Reasonable notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['wyoming lease agreement', 'WY rental lease'], metaDescription: 'Wyoming residential lease forms and rental agreements.'
  },
  alaska: {
    code: 'AK', name: 'Alaska', marketSize: 150, searchVolume: 340,
    legalRequirements: { securityDepositLimit: '2 months rent', noticeToEnter: '24 hours notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['alaska lease agreement', 'AK rental lease'], metaDescription: 'Alaska lease agreements with 2-month security deposit limits.'
  },
  hawaii: {
    code: 'HI', name: 'Hawaii', marketSize: 320, searchVolume: 750,
    legalRequirements: { securityDepositLimit: '1 month rent', noticeToEnter: '2 days notice', noticePeriod: '28 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['hawaii lease agreement', 'HI rental lease'], metaDescription: 'Hawaii residential lease agreements with state-specific requirements.'
  },
  newmexico: {
    code: 'NM', name: 'New Mexico', marketSize: 380, searchVolume: 720,
    legalRequirements: { securityDepositLimit: '1 month rent', noticeToEnter: '24 hours notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['new mexico lease agreement', 'NM rental lease'], metaDescription: 'New Mexico lease templates with security deposit limits.'
  },
  // Southeast States
  georgia: {
    code: 'GA', name: 'Georgia', marketSize: 1500, searchVolume: 3200,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: 'No specific requirement', noticePeriod: '60 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['georgia lease agreement', 'GA rental lease'], metaDescription: 'Georgia lease agreement templates with required state disclosures.'
  },
  northcarolina: {
    code: 'NC', name: 'North Carolina', marketSize: 1400, searchVolume: 2600,
    legalRequirements: { securityDepositLimit: '1.5 months rent (month-to-month), 2 months (longer terms)', noticeToEnter: 'No specific requirement', noticePeriod: '7 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['north carolina lease agreement', 'NC rental lease'], metaDescription: 'North Carolina lease templates with security deposit limits and state requirements.'
  },
  southcarolina: {
    code: 'SC', name: 'South Carolina', marketSize: 850, searchVolume: 1600,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: '24 hours notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['south carolina lease agreement', 'SC rental lease'], metaDescription: 'South Carolina residential lease agreements with state requirements.'
  },
  tennessee: {
    code: 'TN', name: 'Tennessee', marketSize: 1100, searchVolume: 2000,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: 'No specific requirement', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['tennessee lease agreement', 'TN rental lease'], metaDescription: 'Tennessee lease agreement templates and rental forms.'
  },
  kentucky: {
    code: 'KY', name: 'Kentucky', marketSize: 750, searchVolume: 1400,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: '2 days notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['kentucky lease agreement', 'KY rental lease'], metaDescription: 'Kentucky residential lease agreements with state requirements.'
  },
  alabama: {
    code: 'AL', name: 'Alabama', marketSize: 820, searchVolume: 1500,
    legalRequirements: { securityDepositLimit: '1 month rent', noticeToEnter: '2 days notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['alabama lease agreement', 'AL rental lease'], metaDescription: 'Alabama lease templates with 1-month security deposit limits.'
  },
  mississippi: {
    code: 'MS', name: 'Mississippi', marketSize: 480, searchVolume: 890,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: 'Reasonable notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['mississippi lease agreement', 'MS rental lease'], metaDescription: 'Mississippi residential lease agreements and rental forms.'
  },
  louisiana: {
    code: 'LA', name: 'Louisiana', marketSize: 780, searchVolume: 1450,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: 'No specific requirement', noticePeriod: '10 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['louisiana lease agreement', 'LA rental lease'], metaDescription: 'Louisiana lease agreement templates with civil law requirements.'
  },
  arkansas: {
    code: 'AR', name: 'Arkansas', marketSize: 520, searchVolume: 980,
    legalRequirements: { securityDepositLimit: '2 months rent', noticeToEnter: 'No specific requirement', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['arkansas lease agreement', 'AR rental lease'], metaDescription: 'Arkansas lease templates with 2-month security deposit limits.'
  },
  virginia: {
    code: 'VA', name: 'Virginia', marketSize: 1300, searchVolume: 2400,
    legalRequirements: { securityDepositLimit: '2 months rent', noticeToEnter: '24 hours notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['virginia lease agreement', 'VA rental lease'], metaDescription: 'Virginia residential lease agreements with security deposit limits.'
  },
  westvirginia: {
    code: 'WV', name: 'West Virginia', marketSize: 280, searchVolume: 520,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: 'No specific requirement', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['west virginia lease agreement', 'WV rental lease'], metaDescription: 'West Virginia lease agreement templates and rental forms.'
  },
  maryland: {
    code: 'MD', name: 'Maryland', marketSize: 980, searchVolume: 1800,
    legalRequirements: { securityDepositLimit: '2 months rent', noticeToEnter: 'Reasonable notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['maryland lease agreement', 'MD rental lease'], metaDescription: 'Maryland lease agreements with 2-month security deposit limits.'
  },
  delaware: {
    code: 'DE', name: 'Delaware', marketSize: 180, searchVolume: 340,
    legalRequirements: { securityDepositLimit: '1 month rent', noticeToEnter: '48 hours notice', noticePeriod: '60 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['delaware lease agreement', 'DE rental lease'], metaDescription: 'Delaware residential lease agreements with state requirements.'
  },
  // Northeast States
  pennsylvania: {
    code: 'PA', name: 'Pennsylvania', marketSize: 2100, searchVolume: 3800,
    legalRequirements: { securityDepositLimit: '2 months rent first year, 1 month thereafter', noticeToEnter: 'Reasonable notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['pennsylvania lease agreement', 'PA rental lease'], metaDescription: 'Pennsylvania lease templates with security deposit requirements.'
  },
  newjersey: {
    code: 'NJ', name: 'New Jersey', marketSize: 1600, searchVolume: 3200,
    legalRequirements: { securityDepositLimit: '1.5 months rent', noticeToEnter: 'Reasonable notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['new jersey lease agreement', 'NJ rental lease'], metaDescription: 'New Jersey lease agreements with 1.5-month security deposit limits.'
  },
  connecticut: {
    code: 'CT', name: 'Connecticut', marketSize: 620, searchVolume: 1200,
    legalRequirements: { securityDepositLimit: '2 months rent', noticeToEnter: 'Reasonable notice', noticePeriod: '3 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['connecticut lease agreement', 'CT rental lease'], metaDescription: 'Connecticut residential lease agreements with security deposit limits.'
  },
  massachusetts: {
    code: 'MA', name: 'Massachusetts', marketSize: 1200, searchVolume: 2400,
    legalRequirements: { securityDepositLimit: '1 month rent', noticeToEnter: 'Reasonable notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['massachusetts lease agreement', 'MA rental lease'], metaDescription: 'Massachusetts lease templates with 1-month security deposit limits.'
  },
  rhodeisland: {
    code: 'RI', name: 'Rhode Island', marketSize: 190, searchVolume: 380,
    legalRequirements: { securityDepositLimit: '1 month rent', noticeToEnter: '2 days notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['rhode island lease agreement', 'RI rental lease'], metaDescription: 'Rhode Island lease agreement templates with state requirements.'
  },
  vermont: {
    code: 'VT', name: 'Vermont', marketSize: 120, searchVolume: 240,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: '48 hours notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['vermont lease agreement', 'VT rental lease'], metaDescription: 'Vermont residential lease agreements and rental forms.'
  },
  newhampshire: {
    code: 'NH', name: 'New Hampshire', marketSize: 220, searchVolume: 420,
    legalRequirements: { securityDepositLimit: '1 month rent', noticeToEnter: 'Notice required', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['new hampshire lease agreement', 'NH rental lease'], metaDescription: 'New Hampshire lease templates with 1-month security deposit limits.'
  },
  maine: {
    code: 'ME', name: 'Maine', marketSize: 250, searchVolume: 480,
    legalRequirements: { securityDepositLimit: '2 months rent', noticeToEnter: '24 hours notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['maine lease agreement', 'ME rental lease'], metaDescription: 'Maine lease agreements with 2-month security deposit limits.'
  },
  // Midwest States
  ohio: {
    code: 'OH', name: 'Ohio', marketSize: 1900, searchVolume: 3400,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: '24 hours notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['ohio lease agreement', 'OH rental lease'], metaDescription: 'Ohio residential lease agreements with state requirements.'
  },
  michigan: {
    code: 'MI', name: 'Michigan', marketSize: 1600, searchVolume: 2900,
    legalRequirements: { securityDepositLimit: '1.5 months rent', noticeToEnter: 'Reasonable notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['michigan lease agreement', 'MI rental lease'], metaDescription: 'Michigan lease templates with 1.5-month security deposit limits.'
  },
  indiana: {
    code: 'IN', name: 'Indiana', marketSize: 1100, searchVolume: 2000,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: 'Reasonable notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['indiana lease agreement', 'IN rental lease'], metaDescription: 'Indiana residential lease agreements and rental forms.'
  },
  wisconsin: {
    code: 'WI', name: 'Wisconsin', marketSize: 950, searchVolume: 1700,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: '12 hours notice', noticePeriod: '28 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['wisconsin lease agreement', 'WI rental lease'], metaDescription: 'Wisconsin lease agreement templates with state requirements.'
  },
  minnesota: {
    code: 'MN', name: 'Minnesota', marketSize: 900, searchVolume: 1600,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: 'Reasonable notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['minnesota lease agreement', 'MN rental lease'], metaDescription: 'Minnesota residential lease agreements with state requirements.'
  },
  iowa: {
    code: 'IA', name: 'Iowa', marketSize: 520, searchVolume: 950,
    legalRequirements: { securityDepositLimit: '2 months rent', noticeToEnter: '24 hours notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['iowa lease agreement', 'IA rental lease'], metaDescription: 'Iowa lease templates with 2-month security deposit limits.'
  },
  missouri: {
    code: 'MO', name: 'Missouri', marketSize: 1000, searchVolume: 1800,
    legalRequirements: { securityDepositLimit: '2 months rent', noticeToEnter: 'Reasonable notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['missouri lease agreement', 'MO rental lease'], metaDescription: 'Missouri lease agreements with 2-month security deposit limits.'
  },
  kansas: {
    code: 'KS', name: 'Kansas', marketSize: 480, searchVolume: 870,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: 'Reasonable notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['kansas lease agreement', 'KS rental lease'], metaDescription: 'Kansas residential lease agreements and rental forms.'
  },
  nebraska: {
    code: 'NE', name: 'Nebraska', marketSize: 320, searchVolume: 580,
    legalRequirements: { securityDepositLimit: '1 month rent', noticeToEnter: '1 day notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['nebraska lease agreement', 'NE rental lease'], metaDescription: 'Nebraska lease templates with 1-month security deposit limits.'
  },
  southdakota: {
    code: 'SD', name: 'South Dakota', marketSize: 180, searchVolume: 330,
    legalRequirements: { securityDepositLimit: '1 month rent', noticeToEnter: 'Reasonable notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['south dakota lease agreement', 'SD rental lease'], metaDescription: 'South Dakota lease agreement templates with state requirements.'
  },
  northdakota: {
    code: 'ND', name: 'North Dakota', marketSize: 140, searchVolume: 260,
    legalRequirements: { securityDepositLimit: '1 month rent', noticeToEnter: 'Reasonable notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['north dakota lease agreement', 'ND rental lease'], metaDescription: 'North Dakota residential lease agreements and rental forms.'
  },
  // Additional States
  oklahoma: {
    code: 'OK', name: 'Oklahoma', marketSize: 650, searchVolume: 1200,
    legalRequirements: { securityDepositLimit: 'No statutory limit', noticeToEnter: '1 day notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['oklahoma lease agreement', 'OK rental lease'], metaDescription: 'Oklahoma lease agreement templates with state requirements.'
  },
  // DC (District of Columbia)
  washington_dc: {
    code: 'DC', name: 'District of Columbia', marketSize: 420, searchVolume: 890,
    legalRequirements: { securityDepositLimit: '1 month rent', noticeToEnter: '48 hours notice', noticePeriod: '30 days', keyDisclosures: ['Lead-based paint disclosure'] },
    seoKeywords: ['washington dc lease agreement', 'DC rental lease'], metaDescription: 'Washington DC lease agreements with 1-month security deposit limits.'
  }
};

// International Territories
export const INTERNATIONAL_LEASE_DATA: Record<string, StateLeaseData> = {
  philippines: {
    code: 'PH',
    name: 'Philippines',
    marketSize: 2500, // Estimated rental units in thousands
    searchVolume: 1800, // Monthly searches
    legalRequirements: {
      securityDepositLimit: '2 months rent maximum (Rent Control Act)',
      noticeToEnter: 'Reasonable notice required',
      noticePeriod: '30 days written notice',
      keyDisclosures: [
        'Security deposit receipt required immediately',
        'Deposit must be held in bank account under landlord name',
        'Rent increase limitations: 2% (below ₱5,000), 7% (₱5,000-₱8,999), 11% (₱9,000-₱10,000)',
        'Deposit return within 30 days of lease end',
        'Interest earned on deposit belongs to tenant',
        'Rent Control Act applies to units ₱10,000/month or below in Metro Manila'
      ]
    },
    seoKeywords: [
      'philippines lease agreement',
      'rental contract philippines',
      'philippine rent control act',
      'residential lease philippines',
      'rental agreement template philippines'
    ],
    metaDescription: 'Create Philippines-compliant residential lease agreements following Rent Control Act (RA 9653). Includes security deposit limits, rent increase caps, and required disclosures.'
  }
};

// Combined data for all supported regions
export const ALL_LEASE_DATA: Record<string, StateLeaseData> = {
  ...ALL_US_STATES,
  ...INTERNATIONAL_LEASE_DATA
};

export const TOP_5_STATES = ['california', 'newyork', 'texas', 'florida', 'illinois'] as const;
export const SUPPORTED_STATES = Object.keys(ALL_US_STATES);
export const SUPPORTED_REGIONS = Object.keys(ALL_LEASE_DATA);

export function getStateData(stateKey: string): StateLeaseData | undefined {
  return ALL_LEASE_DATA[stateKey.toLowerCase()];
}

export function isValidState(stateKey: string): boolean {
  return SUPPORTED_REGIONS.includes(stateKey.toLowerCase());
}

export function getStateUrlSlug(stateName: string): string {
  return stateName.toLowerCase().replace(/\s+/g, '-');
}

export function getStateFromSlug(slug: string): StateLeaseData | undefined {
  const stateKey = slug.replace(/-/g, '');
  return getStateData(stateKey);
}

export function getAllSupportedRegions(): StateLeaseData[] {
  return Object.values(ALL_LEASE_DATA);
}

export function getRegionsByMarketSize(): StateLeaseData[] {
  return Object.values(ALL_LEASE_DATA).sort((a, b) => b.marketSize - a.marketSize);
}