import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LeaseGenerator, downloadBlob } from '@/lib/lease-generator';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import type { 
  LeaseGeneratorForm, 
  LeaseGeneratorUsage, 
  LeaseOutputFormat,
  LeaseGenerationResult 
} from '@/types/lease-generator';

interface UseLeaseGeneratorOptions {
  onSuccess?: (result: LeaseGenerationResult) => void;
  onError?: (error: Error) => void;
}

export function useLeaseGenerator(options: UseLeaseGeneratorOptions = {}) {
  const [currentUsage, setCurrentUsage] = useState<LeaseGeneratorUsage | null>(null);
  const { user } = useAuthStore();

  // Get client information for usage tracking
  const getClientInfo = () => ({
    ipAddress: 'unknown', // Will be determined by server
    userAgent: navigator.userAgent,
    email: '', // Will be collected from form
  });

  // Check current usage status from database or localStorage
  const { data: usageData, refetch: refetchUsage } = useQuery({
    queryKey: ['lease-generator-usage', user?.id],
    queryFn: async () => {
      // For authenticated users, check database first
      if (user?.id) {
        const { data: dbUsage, error } = await supabase
          .from('LeaseGeneratorUsage')
          .select('*')
          .eq('userId', user.id)
          .order('createdAt', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          logger.error('Failed to fetch lease generator usage from database', error);
          // Fall back to localStorage
        } else if (dbUsage) {
          // Database already uses camelCase
          return {
            id: dbUsage.id,
            email: dbUsage.email,
            ipAddress: dbUsage.ipAddress,
            userAgent: dbUsage.userAgent,
            usageCount: dbUsage.usageCount,
            lastUsedAt: dbUsage.lastUsedAt,
            paymentStatus: dbUsage.paymentStatus,
            createdAt: dbUsage.createdAt,
            updatedAt: dbUsage.updatedAt,
            accessExpiresAt: dbUsage.accessExpiresAt,
          };
        }
      }

      // Fallback to localStorage for anonymous users
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

  // Create or update usage record in database or localStorage
  const updateUsageMutation = useMutation({
    mutationFn: async (email: string) => {
      const clientInfo = getClientInfo();
      
      // For authenticated users, use database
      if (user?.id) {
        const usage = usageData;
        
        if (usage && usage.id && !usage.id.startsWith('local_')) {
          // Update existing database record
          const { data: updatedUsage, error } = await supabase
            .from('LeaseGeneratorUsage')
            .update({
              usageCount: usage.usageCount + 1,
              lastUsedAt: new Date().toISOString(),
              email: email || usage.email,
            })
            .eq('id', usage.id)
            .select()
            .single();

          if (error) {
            logger.error('Failed to update lease generator usage in database', error);
            throw error;
          }

          return {
            id: updatedUsage.id,
            email: updatedUsage.email,
            ipAddress: updatedUsage.ipAddress,
            userAgent: updatedUsage.userAgent,
            usageCount: updatedUsage.usageCount,
            lastUsedAt: updatedUsage.lastUsedAt,
            paymentStatus: updatedUsage.paymentStatus,
            createdAt: updatedUsage.createdAt,
            updatedAt: updatedUsage.updatedAt,
            accessExpiresAt: updatedUsage.accessExpiresAt,
          };
        } else {
          // Create new database record
          const { data: newUsage, error } = await supabase
            .from('LeaseGeneratorUsage')
            .insert({
              userId: user.id,
              email,
              ipAddress: 'unknown',
              userAgent: clientInfo.userAgent,
              usageCount: 1,
              lastUsedAt: new Date().toISOString(),
              paymentStatus: 'free_trial',
            })
            .select()
            .single();

          if (error) {
            logger.error('Failed to create lease generator usage in database', error);
            throw error;
          }

          return {
            id: newUsage.id,
            email: newUsage.email,
            ipAddress: newUsage.ipAddress,
            userAgent: newUsage.userAgent,
            usageCount: newUsage.usageCount,
            lastUsedAt: newUsage.lastUsedAt,
            paymentStatus: newUsage.paymentStatus,
            createdAt: newUsage.createdAt,
            updatedAt: newUsage.updatedAt,
            accessExpiresAt: newUsage.accessExpiresAt,
          };
        }
      }

      // Fallback to localStorage for anonymous users
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
      logger.debug('Lease generator usage tracked locally');
      
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
      const currentUsageCount = usage?.usageCount || 0;
      const currentPaymentStatus = usage?.paymentStatus || 'free_trial';
      const currentAccessExpiresAt = usage?.accessExpiresAt;
      
      // Check if paid access has expired
      const isCurrentPaidAccessExpired = currentPaymentStatus === 'paid' && 
        currentAccessExpiresAt && 
        new Date(currentAccessExpiresAt) < new Date();
      
      // Determine effective payment status for usage check
      const effectiveStatus = isCurrentPaidAccessExpired ? 'free_trial' : currentPaymentStatus;

      // Free trial allows 1 use, paid allows unlimited for 24 hours
      if (effectiveStatus === 'free_trial' && currentUsageCount >= 1) {
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
        usageRemaining: effectiveStatus === 'free_trial' 
          ? Math.max(0, 1 - (currentUsageCount + 1))
          : 999,
        requiresPayment: effectiveStatus === 'free_trial' && currentUsageCount >= 0,
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
  const accessExpiresAt = usageData?.accessExpiresAt;
  
  // Check if paid access has expired
  const isPaidAccessExpired = paymentStatus === 'paid' && 
    accessExpiresAt && 
    new Date(accessExpiresAt) < new Date();
  
  // Determine effective payment status
  const effectivePaymentStatus = isPaidAccessExpired ? 'free_trial' : paymentStatus;
  
  const usageRemaining = effectivePaymentStatus === 'free_trial' 
    ? Math.max(0, 1 - usageCount) 
    : 999; // Unlimited for paid users within 24 hours
    
  const requiresPayment = effectivePaymentStatus === 'free_trial' && usageCount >= 1;

  // Payment handling with Stripe integration
  const initiatePayment = async () => {
    try {
      toast.info('Creating payment session...');
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: 'price_1234567890_lease_generator', // Will be replaced with actual Stripe price ID
          successUrl: `${window.location.origin}/lease-generator?payment=success`,
          cancelUrl: `${window.location.origin}/lease-generator?payment=cancelled`,
          metadata: {
            type: 'lease_generator_access',
            userId: user?.id,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      logger.error('Failed to initiate lease generator payment', error as Error);
      toast.error('Failed to start payment process. Please try again.');
    }
  };

  return {
    generateLease: generateLeaseMutation.mutate,
    isGenerating: generateLeaseMutation.isPending,
    usageRemaining,
    requiresPayment,
    paymentStatus: effectivePaymentStatus,
    initiatePayment,
    error: generateLeaseMutation.error,
    isSuccess: generateLeaseMutation.isSuccess,
    result: generateLeaseMutation.data,
    refetchUsage,
  };
}