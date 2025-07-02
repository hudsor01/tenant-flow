/**
 * State-specific lease generator that creates compliant lease agreements
 * for all 50 US states and international territories
 */

import { generateBaseLease, LeaseTemplateData, StateLeaseRequirements } from './base-lease-template';
import { getStateData, ALL_LEASE_DATA } from '@/lib/state-data';

export interface GenerateLeaseOptions {
  data: LeaseTemplateData;
  stateKey: string;
  format: 'pdf' | 'docx' | 'html';
}

export interface LeaseGenerationResult {
  content: string;
  fileName: string;
  stateCode: string;
  isCompliant: boolean;
  warnings: string[];
}

/**
 * Generates a state-compliant lease agreement
 */
export function generateStateLease(options: GenerateLeaseOptions): LeaseGenerationResult {
  const { data, stateKey, format } = options;
  const stateData = getStateData(stateKey);
  
  if (!stateData) {
    throw new Error(`Unsupported state or region: ${stateKey}`);
  }

  // Convert state data to lease requirements format
  const stateRequirements: StateLeaseRequirements = {
    securityDepositLimit: stateData.legalRequirements.securityDepositLimit,
    noticeToEnter: stateData.legalRequirements.noticeToEnter,
    noticePeriod: stateData.legalRequirements.noticePeriod,
    requiredDisclosures: stateData.legalRequirements.keyDisclosures,
    mandatoryClauses: getStateMandatoryClauses(stateKey),
    prohibitedClauses: getStateProhibitedClauses(stateKey)
  };

  // Add state-specific clauses to the lease data
  const enhancedData: LeaseTemplateData = {
    ...data,
    stateSpecificClauses: getStateSpecificClauses(stateKey, data),
    requiredDisclosures: stateRequirements.requiredDisclosures
  };

  // Generate the lease content
  const content = generateBaseLease(enhancedData, stateRequirements);
  
  // Validate compliance
  const { isCompliant, warnings } = validateLeaseCompliance(data, stateRequirements, stateKey);

  // Generate appropriate filename
  const fileName = generateFileName(data, stateData.code, format);

  return {
    content,
    fileName,
    stateCode: stateData.code,
    isCompliant,
    warnings
  };
}

/**
 * Gets state-specific mandatory clauses
 */
function getStateMandatoryClauses(stateKey: string): string[] {
  const clauses: Record<string, string[]> = {
    california: [
      'Landlord must provide 24-hour written notice before entering the premises except in emergencies.',
      'Security deposits exceeding $10,000 must be held in an interest-bearing account.',
      'Tenant has the right to request repairs in writing.'
    ],
    newyork: [
      'Window guards are required in buildings 3+ stories when children under 11 reside in the unit.',
      'Lead-based paint disclosure required for pre-1978 properties.',
      'Rent-controlled units subject to additional regulations.'
    ],
    texas: [
      'Landlord must provide copy of lease within 3 business days of signing.',
      'Smoke detectors must be installed and maintained.',
      'Previous flooding disclosure required if applicable.'
    ],
    florida: [
      'Landlord must maintain premises in habitable condition.',
      'Fire sprinkler disclosure required.',
      'Radon gas disclosure required.'
    ],
    philippines: [
      'Security deposit cannot exceed 2 months rent (Rent Control Act).',
      'Deposit must be held in bank account under landlord name.',
      'Written receipt required for all deposit payments.',
      'Rent increases limited by Rent Control Act provisions.',
      'Deposit return required within 30 days of lease termination.'
    ]
  };

  return clauses[stateKey] || [];
}

/**
 * Gets clauses that are prohibited in specific states
 */
function getStateProhibitedClauses(stateKey: string): string[] {
  const prohibited: Record<string, string[]> = {
    california: [
      'Tenant waiver of right to jury trial',
      'Automatic renewal clauses without proper notice',
      'Waiver of habitability warranties'
    ],
    newyork: [
      'Waiver of rent stabilization rights',
      'Excessive late fees (over $50 or 5% of rent)',
      'Automatic lease renewal without proper notice'
    ],
    texas: [
      'Waiver of right to repair and deduct',
      'Waiver of security device rights',
      'Waiver of right to terminate for family violence'
    ]
  };

  return prohibited[stateKey] || [];
}

/**
 * Gets state-specific clauses based on lease data
 */
function getStateSpecificClauses(stateKey: string, data: LeaseTemplateData): string[] {
  const clauses: string[] = [];

  // California-specific
  if (stateKey === 'california') {
    if (data.securityDeposit > data.rentAmount) {
      clauses.push('Security deposit exceeds one month rent - additional regulations apply per California Civil Code Section 1950.5.');
    }
    clauses.push('Tenant has the right to request installation of security devices.');
  }

  // New York-specific
  if (stateKey === 'newyork') {
    if (data.securityDeposit > data.rentAmount) {
      clauses.push('Security deposit limited to one month rent per New York General Obligations Law.');
    }
    clauses.push('Landlord must provide written receipt for security deposit.');
  }

  // Texas-specific
  if (stateKey === 'texas') {
    clauses.push('Tenant has the right to terminate lease early for family violence situations.');
    if (data.propertyAddress.toLowerCase().includes('flood')) {
      clauses.push('FLOOD DISCLOSURE: This property may have been subject to flooding. See attached disclosure.');
    }
  }

  // Florida-specific
  if (stateKey === 'florida') {
    clauses.push('Landlord must give 12 hours notice before entry except in emergencies.');
    clauses.push('Month-to-month tenancies require 15 days notice for termination.');
  }

  // Philippines-specific
  if (stateKey === 'philippines') {
    clauses.push('This lease agreement is subject to the Rent Control Act (Republic Act No. 9653).');
    clauses.push('Rent increases are limited by law and cannot exceed statutory maximums.');
    clauses.push('Interest earned on security deposit belongs to tenant.');
    if (data.rentAmount <= 10000) {
      clauses.push('This unit falls under Rent Control Act coverage (monthly rent ≤ ₱10,000).');
    }
  }

  return clauses;
}

/**
 * Validates lease compliance with state requirements
 */
function validateLeaseCompliance(
  data: LeaseTemplateData, 
  requirements: StateLeaseRequirements, 
  stateKey: string
): { isCompliant: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let isCompliant = true;

  // Check security deposit limits
  if (requirements.securityDepositLimit !== 'No statutory limit') {
    const limit = parseSecurityDepositLimit(requirements.securityDepositLimit, data.rentAmount);
    if (limit && data.securityDeposit > limit) {
      warnings.push(`Security deposit exceeds state limit of ${requirements.securityDepositLimit}`);
      isCompliant = false;
    }
  }

  // State-specific validations
  switch (stateKey) {
    case 'california':
      if (data.securityDeposit > data.rentAmount * 2) {
        warnings.push('California limits security deposits to 1-2 months rent depending on circumstances');
        isCompliant = false;
      }
      break;
      
    case 'newyork':
      if (data.securityDeposit > data.rentAmount) {
        warnings.push('New York limits security deposits to one month rent');
        isCompliant = false;
      }
      break;
      
    case 'philippines':
      if (data.securityDeposit > data.rentAmount * 2) {
        warnings.push('Philippines Rent Control Act limits security deposits to 2 months rent');
        isCompliant = false;
      }
      break;
  }

  // Validate required disclosures are present
  if (requirements.requiredDisclosures.length === 0) {
    warnings.push('Consider adding standard disclosures even if not legally required');
  }

  return { isCompliant, warnings };
}

/**
 * Parses security deposit limit string to numeric value
 */
function parseSecurityDepositLimit(limitString: string, monthlyRent: number): number | null {
  const monthsMatch = limitString.match(/(\d+(?:\.\d+)?)\s*months?\s*rent/i);
  if (monthsMatch) {
    return parseFloat(monthsMatch[1]) * monthlyRent;
  }
  
  const dollarMatch = limitString.match(/\$?([\d,]+)/);
  if (dollarMatch) {
    return parseInt(dollarMatch[1].replace(/,/g, ''));
  }
  
  return null;
}

/**
 * Generates appropriate filename for the lease document
 */
function generateFileName(data: LeaseTemplateData, stateCode: string, format: string): string {
  const cleanAddress = data.propertyAddress.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  const date = new Date().toISOString().split('T')[0];
  return `${stateCode}_Lease_${cleanAddress}_${date}.${format}`;
}

/**
 * Gets all supported states for lease generation
 */
export function getSupportedStates(): Array<{ key: string; name: string; code: string }> {
  return Object.entries(ALL_LEASE_DATA).map(([key, data]) => ({
    key,
    name: data.name,
    code: data.code
  }));
}

/**
 * Gets lease generation statistics for a state
 */
export function getStateLeaseStats(stateKey: string) {
  const stateData = getStateData(stateKey);
  if (!stateData) return null;

  return {
    marketSize: stateData.marketSize,
    searchVolume: stateData.searchVolume,
    seoKeywords: stateData.seoKeywords,
    metaDescription: stateData.metaDescription
  };
}