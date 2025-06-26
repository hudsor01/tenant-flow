import { useCallback } from 'react';
import * as FacebookPixel from '@/lib/facebook-pixel';

/**
 * Custom hook for Facebook Pixel tracking with TypeScript support
 * Provides easy access to all Facebook Pixel events with proper typing
 */
export function useFacebookPixel() {
  // Standard Events
  const trackPurchase = useCallback((value: number, currency = 'USD', contentIds?: string[]) => {
    FacebookPixel.trackPurchase(value, currency, contentIds);
  }, []);

  const trackCompleteRegistration = useCallback((registrationMethod?: string) => {
    FacebookPixel.trackCompleteRegistration(registrationMethod);
  }, []);

  const trackLead = useCallback((contentName?: string, value?: number) => {
    FacebookPixel.trackLead(contentName, value);
  }, []);

  const trackInitiateCheckout = useCallback((value: number, currency = 'USD', contentIds?: string[]) => {
    FacebookPixel.trackInitiateCheckout(value, currency, contentIds);
  }, []);

  const trackAddToCart = useCallback((contentName: string, value: number, currency = 'USD') => {
    FacebookPixel.trackAddToCart(contentName, value, currency);
  }, []);

  const trackViewContent = useCallback((contentName: string, contentType = 'product', value?: number) => {
    FacebookPixel.trackViewContent(contentName, contentType, value);
  }, []);

  const trackSearch = useCallback((searchTerm: string, contentCategory?: string) => {
    FacebookPixel.trackSearch(searchTerm, contentCategory);
  }, []);

  const trackStartTrial = useCallback((trialType: string, value?: number) => {
    FacebookPixel.trackStartTrial(trialType, value);
  }, []);

  // Custom Events
  const trackCustomEvent = useCallback((eventName: string, parameters: Record<string, string | number | boolean> = {}) => {
    FacebookPixel.trackCustomEvent(eventName, parameters);
  }, []);

  const trackLeaseGenerated = useCallback((format: string, requiresPayment: boolean, value?: number) => {
    FacebookPixel.trackLeaseGenerated(format, requiresPayment, value);
  }, []);

  const trackPricingPageView = useCallback((planSelected?: string, billingPeriod?: string) => {
    FacebookPixel.trackPricingPageView(planSelected, billingPeriod);
  }, []);

  const trackPlanSelection = useCallback((planId: string, planName: string, price: number, billingPeriod: string) => {
    FacebookPixel.trackPlanSelection(planId, planName, price, billingPeriod);
  }, []);

  const trackFeatureUsage = useCallback((featureName: string, featureCategory?: string) => {
    FacebookPixel.trackFeatureUsage(featureName, featureCategory);
  }, []);

  const trackSubscriptionCancellation = useCallback((planId: string, reason?: string) => {
    FacebookPixel.trackSubscriptionCancellation(planId, reason);
  }, []);

  const trackUpgrade = useCallback((fromPlan: string, toPlan: string, value: number) => {
    FacebookPixel.trackUpgrade(fromPlan, toPlan, value);
  }, []);

  const trackDowngrade = useCallback((fromPlan: string, toPlan: string) => {
    FacebookPixel.trackDowngrade(fromPlan, toPlan);
  }, []);

  const trackPageView = useCallback(() => {
    FacebookPixel.trackPageView();
  }, []);

  return {
    // Standard Events
    trackPurchase,
    trackCompleteRegistration,
    trackLead,
    trackInitiateCheckout,
    trackAddToCart,
    trackViewContent,
    trackSearch,
    trackStartTrial,
    trackPageView,
    
    // Custom Events
    trackCustomEvent,
    trackLeaseGenerated,
    trackPricingPageView,
    trackPlanSelection,
    trackFeatureUsage,
    trackSubscriptionCancellation,
    trackUpgrade,
    trackDowngrade,
  };
}