import { useState } from 'react';
import type { LeaseOutputFormat } from '@/types/lease-generator';

/**
 * Custom hook for managing lease generator static data and state
 * Separates data concerns from UI components
 */
export function useLeaseGeneratorData() {
  const [selectedFormat, setSelectedFormat] = useState<LeaseOutputFormat>('pdf');
  const [selectedUtilities, setSelectedUtilities] = useState<string[]>([]);

  // Static data constants
  const utilitiesOptions = [
    'Water', 'Electricity', 'Gas', 'Internet', 'Cable TV', 'Trash', 'Sewer', 'Heat'
  ];

  const usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  // Utility management functions
  const handleUtilityToggle = (utility: string, setValue: (name: string, value: string[]) => void) => {
    const updated = selectedUtilities.includes(utility)
      ? selectedUtilities.filter(u => u !== utility)
      : [...selectedUtilities, utility];
    
    setSelectedUtilities(updated);
    setValue('utilitiesIncluded', updated);
  };

  const resetUtilities = () => {
    setSelectedUtilities([]);
  };

  return {
    // Format state
    selectedFormat,
    setSelectedFormat,
    
    // Utilities state
    selectedUtilities,
    setSelectedUtilities,
    handleUtilityToggle,
    resetUtilities,
    
    // Static data
    utilitiesOptions,
    usStates,
  };
}