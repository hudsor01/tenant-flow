import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LeaseGenerator, downloadBlob } from '@/lib/lease-generator';

import { toast } from 'sonner';
import type { 
  LeaseGeneratorForm, 
  LeaseGeneratorUsage, 
  LeaseOutputFormat,
  LeaseGenerationResult 
} from '@/types/lease-generator';

// const supabase = createClient(); // Not currently used

interface UseLeaseGeneratorOptions {
  onSuccess?: (result: LeaseGenerationResult) => void;
  onError?: (error: Error) => void;
}

export function useLeaseGenerator(options: UseLeaseGeneratorOptions = {}) {
  const [currentUsage, setCurrentUsage] = useState<LeaseGeneratorUsage | null>(null);

  // Get client information for usage tracking
  const getClientInfo = () => ({
    ipAddress: 'unknown', // Will be determined by server
    userAgent: navigator.userAgent,
    email: '', // Will be collected from form
  });

  // Check current usage status using localStorage for testing
  const { data: usageData, refetch: refetchUsage } = useQuery({
    queryKey: ['lease-generator-usage'],
    queryFn: async () => {
      // Use localStorage for testing without database
      const clientInfo = getClientInfo();
      const storageKey = `lease_usage_${btoa(clientInfo.userAgent).slice(0, 20)}`;
      const storedUsage = localStorage.getItem(storageKey);
      
      if (storedUsage) {
        return JSON.parse(storedUsage);
      }
      
      return null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create or update usage record using localStorage for testing
  const updateUsageMutation = useMutation({
    mutationFn: async (email: string) => {
      const clientInfo = getClientInfo();
      const storageKey = `lease_usage_${btoa(clientInfo.userAgent).slice(0, 20)}`;
      
      let usage = usageData;
      if (usage) {
        // Update existing usage
        usage = {
          ...usage,
          usageCount: usage.usageCount + 1,
          lastUsedAt: new Date().toISOString(),
          email: email || usage.email,
        };
      } else {
        // Create new usage record
        usage = {
          id: `local_${Date.now()}`,
          email,
          ipAddress: 'localhost',
          userAgent: clientInfo.userAgent,
          usageCount: 1,
          lastUsedAt: new Date().toISOString(),
          paymentStatus: 'free_trial',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      
      localStorage.setItem(storageKey, JSON.stringify(usage));
      // Usage tracked (removed PII from logs)
      
      return usage;
    },
    onSuccess: (data) => {
      setCurrentUsage(data);
      refetchUsage();
    },
  });

  // Generate lease documents
  const generateLeaseMutation = useMutation({
    mutationFn: async ({ 
      formData, 
      format 
    }: { 
      formData: LeaseGeneratorForm; 
      format: LeaseOutputFormat 
    }) => {
      // Check usage limits
      const usage = usageData || currentUsage;
      const usageCount = usage?.usageCount || 0;
      const paymentStatus = usage?.paymentStatus || 'free_trial';

      // Free trial allows 1 use, paid allows unlimited for 24 hours
      if (paymentStatus === 'free_trial' && usageCount >= 1) {
        throw new Error('Usage limit exceeded. Payment required for additional lease generations.');
      }

      // Update usage count
      await updateUsageMutation.mutateAsync(formData.landlordEmail);

      // Generate lease documents
      const generator = new LeaseGenerator(formData);
      
      let pdfUrl: string | undefined;
      let docxUrl: string | undefined;
      let zipUrl: string | undefined;

      const fileName = `lease_${formData.propertyAddress.replace(/\s+/g, '_').toLowerCase()}`;

      switch (format) {
        case 'pdf': {
          // Use lightweight PDF generation (browser print-to-PDF)
          const pdfBlob = await generator.generatePDF(true);
          // Note: Lightweight mode downloads HTML with print instructions
          // Users can then use browser's "Print to PDF" feature
          if (pdfBlob.size > 0) {
            downloadBlob(pdfBlob, `${fileName}.pdf`);
            pdfUrl = URL.createObjectURL(pdfBlob);
          }
          break;
        }
        case 'docx': {
          const docxBlob = await generator.generateDOCX();
          downloadBlob(docxBlob, `${fileName}.docx`);
          docxUrl = URL.createObjectURL(docxBlob);
          break;
        }
        case 'both': {
          const zipBlob = await generator.generateZIP();
          downloadBlob(zipBlob, `${fileName}.zip`);
          zipUrl = URL.createObjectURL(zipBlob);
          break;
        }
      }

      const result: LeaseGenerationResult = {
        success: true,
        pdfUrl,
        docxUrl,
        zipUrl,
        usageRemaining: Math.max(0, 1 - (usageCount + 1)),
        requiresPayment: paymentStatus === 'free_trial' && usageCount >= 0,
      };

      return result;
    },
    onSuccess: (result) => {
      toast.success('Lease agreement generated successfully!');
      options.onSuccess?.(result);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate lease agreement');
      options.onError?.(error as Error);
    },
  });

  // Calculate current usage status
  const usageCount = usageData?.usageCount || 0;
  const paymentStatus = usageData?.paymentStatus || 'free_trial';
  const usageRemaining = paymentStatus === 'free_trial' ? Math.max(0, 1 - usageCount) : 999;
  const requiresPayment = paymentStatus === 'free_trial' && usageCount >= 1;

  // Payment handling (placeholder for Stripe integration)
  const initiatePayment = async () => {
    toast.info('Payment integration coming soon! For now, this is a demo.');
    // TODO: Integrate with Stripe for $9.99 24-hour access
    // This would update the usage record to paymentStatus: 'paid'
  };

  return {
    generateLease: generateLeaseMutation.mutate,
    isGenerating: generateLeaseMutation.isPending,
    usageRemaining,
    requiresPayment,
    paymentStatus,
    initiatePayment,
    error: generateLeaseMutation.error,
    isSuccess: generateLeaseMutation.isSuccess,
    result: generateLeaseMutation.data,
    refetchUsage,
  };
}