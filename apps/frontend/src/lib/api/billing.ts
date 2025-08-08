/**
 * Billing/Stripe API
 * Handles all billing and subscription operations with NestJS backend
 */
import { api } from './endpoints';
import type {
  CreateCheckoutSessionRequest,
  CreatePortalInput,
  UpdateSubscriptionParams,
  Subscription,
  Invoice,
  PaymentMethod
} from '@repo/shared';

export class BillingApi {
  /**
   * Create Stripe checkout session
   */
  static async createCheckoutSession(data: CreateCheckoutSessionRequest): Promise<{
    sessionId: string;
    url: string;
  }> {
    const response = await api.billing.createCheckoutSession(data);
    return response.data as { sessionId: string; url: string };
  }

  /**
   * Create Stripe customer portal session
   */
  static async createPortalSession(data: CreatePortalInput): Promise<{
    url: string;
  }> {
    const response = await api.billing.createPortalSession(data);
    return response.data as { url: string };
  }

  /**
   * Get current subscription
   */
  static async getSubscription(): Promise<Subscription> {
    const response = await api.billing.getSubscription();
    return response.data as Subscription;
  }

  /**
   * Update subscription
   */
  static async updateSubscription(params: UpdateSubscriptionParams): Promise<Subscription> {
    const response = await api.billing.updateSubscription(params);
    return response.data as Subscription;
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(): Promise<{ message: string }> {
    const response = await api.billing.cancelSubscription();
    return response.data as { message: string };
  }

  /**
   * Get payment methods
   */
  static async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await api.billing.getPaymentMethods();
    return response.data as PaymentMethod[];
  }

  /**
   * Add payment method
   */
  static async addPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    const response = await api.billing.addPaymentMethod(paymentMethodId);
    return response.data as PaymentMethod;
  }

  /**
   * Set default payment method
   */
  static async setDefaultPaymentMethod(paymentMethodId: string): Promise<{ message: string }> {
    const response = await api.billing.setDefaultPaymentMethod(paymentMethodId);
    return response.data as { message: string };
  }

  /**
   * Get invoices
   */
  static async getInvoices(): Promise<Invoice[]> {
    const response = await api.billing.getInvoices();
    return response.data as Invoice[];
  }

  /**
   * Download invoice
   */
  static async downloadInvoice(invoiceId: string): Promise<{ url: string }> {
    const response = await api.billing.downloadInvoice(invoiceId);
    return response.data as { url: string };
  }

  /**
   * Get usage statistics
   */
  static async getUsage(): Promise<{
    properties: number;
    tenants: number;
    leases: number;
    maintenanceRequests: number;
    limits: {
      properties: number;
      tenants: number;
      leases: number;
      maintenanceRequests: number;
    };
  }> {
    const response = await api.billing.getUsage();
    return response.data as {
      properties: number;
      tenants: number;
      leases: number;
      maintenanceRequests: number;
      limits: {
        properties: number;
        tenants: number;
        leases: number;
        maintenanceRequests: number;
      };
    };
  }
}

// Export type aliases
export type CheckoutParams = CreateCheckoutSessionRequest;
export type PortalParams = CreatePortalInput;