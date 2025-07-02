import { useCallback } from 'react';
import {
  initGTM,
  trackGTMPageView,
  trackGTMSignup,
  trackGTMLogin,
  trackGTMPurchase,
  trackGTMTrialStart,
  trackGTMLeaseGenerated,
  trackGTMPlanView,
  trackGTMCustomEvent,
  trackGTMLeadMagnetEvent,
  trackGTMFunnelStep,
  trackGTMLeadQuality
} from '@/lib/google-tag-manager';

export const useGTM = () => {
  const initGTMCallback = useCallback(() => {
    initGTM();
  }, []);

  const trackPageViewCallback = useCallback((page: string, title?: string) => {
    trackGTMPageView(page, title);
  }, []);

  const trackSignupCallback = useCallback((method = 'email') => {
    trackGTMSignup(method);
  }, []);

  const trackLoginCallback = useCallback((method = 'email') => {
    trackGTMLogin(method);
  }, []);

  const trackPurchaseCallback = useCallback((
    transactionId: string,
    value: number,
    currency = 'USD',
    items: Array<{
      item_id: string;
      item_name: string;
      price: number;
      quantity: number;
    }> = []
  ) => {
    trackGTMPurchase(transactionId, value, currency, items);
  }, []);

  const trackTrialStartCallback = useCallback((planName: string, value?: number) => {
    trackGTMTrialStart(planName, value);
  }, []);

  const trackLeaseGeneratedCallback = useCallback((state: string, outputFormat: string) => {
    trackGTMLeaseGenerated(state, outputFormat);
  }, []);

  const trackPlanViewCallback = useCallback((planName: string, planPrice: number) => {
    trackGTMPlanView(planName, planPrice);
  }, []);

  const trackCustomEventCallback = useCallback((
    eventName: string,
    parameters: Record<string, string | number | boolean | undefined> = {}
  ) => {
    trackGTMCustomEvent(eventName, parameters);
  }, []);

  const trackLeadMagnetEventCallback = useCallback((
    step: 'viewed' | 'form_started' | 'form_completed' | 'email_shown' | 'email_captured' | 'downloaded' | 'upgrade_clicked',
    properties: {
      invoice_total?: number;
      user_tier?: string;
      usage_count?: number;
      email_domain?: string;
      time_on_page?: number;
    } = {}
  ) => {
    trackGTMLeadMagnetEvent(step, properties);
  }, []);

  const trackFunnelStepCallback = useCallback((
    funnel_name: string,
    step_name: string,
    step_number: number,
    properties?: Record<string, string | number | boolean | undefined>
  ) => {
    trackGTMFunnelStep(funnel_name, step_name, step_number, properties);
  }, []);

  const trackLeadQualityCallback = useCallback((
    email: string,
    score: number,
    factors: {
      company_email?: boolean;
      invoice_value?: number;
      completion_time?: number;
      engagement_score?: number;
    }
  ) => {
    trackGTMLeadQuality(email, score, factors);
  }, []);

  return {
    initGTM: initGTMCallback,
    trackPageView: trackPageViewCallback,
    trackSignup: trackSignupCallback,
    trackLogin: trackLoginCallback,
    trackPurchase: trackPurchaseCallback,
    trackTrialStart: trackTrialStartCallback,
    trackLeaseGenerated: trackLeaseGeneratedCallback,
    trackPlanView: trackPlanViewCallback,
    trackCustomEvent: trackCustomEventCallback,
    trackLeadMagnetEvent: trackLeadMagnetEventCallback,
    trackFunnelStep: trackFunnelStepCallback,
    trackLeadQuality: trackLeadQualityCallback,
  };
};