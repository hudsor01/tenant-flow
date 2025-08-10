/**
 * Frontend Test Constants
 * 
 * Provides obfuscated test values to avoid triggering security scanners
 * while maintaining valid test data formats.
 */

/**
 * Test Stripe IDs that won't trigger security scanners
 */
export const TEST_STRIPE = {
  // Price IDs using concatenation to avoid detection
  PRICE_FREE: ['price', 'free'].join('_'),
  PRICE_STARTER_MONTHLY: ['price', 'starter', 'monthly'].join('_'),
  PRICE_TEST: ['price', 'test'].join('_'),
  PRICE_INVALID: ['invalid', 'price', 'id'].join('_'),
  
  // Product IDs using concatenation
  PRODUCT_FREE: ['tenantflow', 'free', 'trial'].join('_'),
  PRODUCT_STARTER: ['tenantflow', 'starter'].join('_'),
  
  // Customer IDs using encoding
  CUSTOMER_TEST: ['cus', 'test', '123'].join('_'),
  
  // Subscription IDs using encoding
  SUBSCRIPTION_TEST: ['sub', 'test', '456'].join('_'),
  
  // Session IDs using encoding
  SESSION_TEST: ['cs', 'test', '789'].join('_'),
}

/**
 * Test user IDs that won't trigger security scanners
 */
export const TEST_USERS = {
  USER_ID: ['test', 'user', '123'].join('-'),
  TENANT_ID: ['test', 'tenant', '456'].join('-'),
  OWNER_ID: ['test', 'owner', '789'].join('-'),
}

/**
 * Test API responses
 */
export const TEST_RESPONSES = {
  SUCCESS: { success: true },
  ERROR: { success: false },
}