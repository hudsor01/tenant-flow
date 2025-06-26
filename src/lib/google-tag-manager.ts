/**
 * Google Tag Manager Integration
 * 
 * Provides typed interface for pushing events to GTM dataLayer
 * Works alongside PostHog and Facebook Pixel for comprehensive tracking
 */

interface GTMEvent {
  event: string;
  [key: string]: any;
}

interface GTMDataLayer {
  push: (event: GTMEvent) => void;
}

declare global {
  interface Window {
    dataLayer: GTMDataLayer;
  }
}

/**
 * Initialize Google Tag Manager dataLayer if not already present
 */
export function initGTM(): void {
  if (typeof window !== 'undefined') {
    // Initialize dataLayer if not already present
    if (!window.dataLayer) {
      window.dataLayer = [];
    }
    
    // Only enable GTM tracking if ID is configured and not a placeholder
    const gtmId = import.meta.env.VITE_GTM_ID;
    if (!gtmId || gtmId === 'YOUR_GTM_ID') {
      console.log('GTM: Container ID not configured, events will be logged only');
      window.dataLayer.push = (event: GTMEvent) => {
        if (import.meta.env.DEV) {
          console.log('GTM Event (dev):', event);
        }
      };
    }
  }
}

/**
 * Push event to GTM dataLayer
 */
export function pushGTMEvent(event: GTMEvent): void {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push(event);
  }
}

/**
 * Track page views
 */
export function trackGTMPageView(page: string, title?: string): void {
  pushGTMEvent({
    event: 'page_view',
    page_location: window.location.href,
    page_path: page,
    page_title: title || document.title
  });
}

/**
 * Track user registration
 */
export function trackGTMSignup(method: string = 'email'): void {
  pushGTMEvent({
    event: 'sign_up',
    method: method
  });
}

/**
 * Track user login
 */
export function trackGTMLogin(method: string = 'email'): void {
  pushGTMEvent({
    event: 'login',
    method: method
  });
}

/**
 * Track subscription purchase
 */
export function trackGTMPurchase(
  transactionId: string,
  value: number,
  currency: string = 'USD',
  items: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
  }> = []
): void {
  pushGTMEvent({
    event: 'purchase',
    transaction_id: transactionId,
    value: value,
    currency: currency,
    items: items
  });
}

/**
 * Track trial start
 */
export function trackGTMTrialStart(planName: string, value?: number): void {
  pushGTMEvent({
    event: 'begin_checkout',
    currency: 'USD',
    value: value || 0,
    plan_name: planName
  });
}

/**
 * Track lease generation
 */
export function trackGTMLeaseGenerated(state: string, outputFormat: string): void {
  pushGTMEvent({
    event: 'generate_lead',
    lead_type: 'lease_generation',
    state: state,
    output_format: outputFormat
  });
}

/**
 * Track pricing page interactions
 */
export function trackGTMPlanView(planName: string, planPrice: number): void {
  pushGTMEvent({
    event: 'view_item',
    currency: 'USD',
    value: planPrice,
    items: [{
      item_id: planName.toLowerCase(),
      item_name: `TenantFlow ${planName} Plan`,
      price: planPrice,
      quantity: 1
    }]
  });
}

/**
 * Track custom events
 */
export function trackGTMCustomEvent(
  eventName: string,
  parameters: Record<string, any> = {}
): void {
  pushGTMEvent({
    event: eventName,
    ...parameters
  });
}

/**
 * Set user properties
 */
export function setGTMUserProperties(userId: string, properties: Record<string, any> = {}): void {
  pushGTMEvent({
    event: 'user_properties',
    user_id: userId,
    ...properties
  });
}