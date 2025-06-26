/**
 * Google Tag Manager Hook
 * 
 * Custom hook for easy GTM integration across components
 * Provides type-safe methods for tracking events
 */

import { useCallback } from 'react';
import {
  trackGTMPageView,
  trackGTMSignup,
  trackGTMLogin,
  trackGTMPurchase,
  trackGTMTrialStart,
  trackGTMLeaseGenerated,
  trackGTMPlanView,
  trackGTMCustomEvent,
  setGTMUserProperties
} from '@/lib/google-tag-manager';

export function useGTM() {
  const trackPageView = useCallback((page: string, title?: string) => {
    trackGTMPageView(page, title);
  }, []);

  const trackSignup = useCallback((method: string = 'email') => {
    trackGTMSignup(method);
  }, []);

  const trackLogin = useCallback((method: string = 'email') => {
    trackGTMLogin(method);
  }, []);

  const trackPurchase = useCallback((
    transactionId: string,
    value: number,
    currency: string = 'USD',
    items: Array<{
      item_id: string;
      item_name: string;
      price: number;
      quantity: number;
    }> = []
  ) => {
    trackGTMPurchase(transactionId, value, currency, items);
  }, []);

  const trackTrialStart = useCallback((planName: string, value?: number) => {
    trackGTMTrialStart(planName, value);
  }, []);

  const trackLeaseGenerated = useCallback((state: string, outputFormat: string) => {
    trackGTMLeaseGenerated(state, outputFormat);
  }, []);

  const trackPlanView = useCallback((planName: string, planPrice: number) => {
    trackGTMPlanView(planName, planPrice);
  }, []);

  const trackCustomEvent = useCallback((
    eventName: string,
    parameters: Record<string, any> = {}
  ) => {
    trackGTMCustomEvent(eventName, parameters);
  }, []);

  const setUserProperties = useCallback((
    userId: string,
    properties: Record<string, any> = {}
  ) => {
    setGTMUserProperties(userId, properties);
  }, []);

  return {
    trackPageView,
    trackSignup,
    trackLogin,
    trackPurchase,
    trackTrialStart,
    trackLeaseGenerated,
    trackPlanView,
    trackCustomEvent,
    setUserProperties
  };
}