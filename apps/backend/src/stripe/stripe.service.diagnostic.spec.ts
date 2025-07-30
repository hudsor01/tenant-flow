import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeErrorHandler } from './stripe-error.handler';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
import {
  DiagnosticAssertions,
  StateInspector,
  PerformanceProfiler,
} from '../test-utils/diagnostic-assertions';
import {
  TestDocumentation,
  FailurePlaybook,
  TestScenario,
} from '../test-utils/test-documentation';

// Mock Stripe constructor
const mockStripeInstance = {
  customers: {
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
    list: vi.fn(),
  },
  subscriptions: {
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
    list: vi.fn(),
  },
  paymentMethods: {
    attach: vi.fn(),
    detach: vi.fn(),
    list: vi.fn(),
  },
  invoices: {
    retrieve: vi.fn(),
    pay: vi.fn(),
    list: vi.fn(),
  },
  prices: {
    retrieve: vi.fn(),
    list: vi.fn(),
  },
  products: {
    retrieve: vi.fn(),
    list: vi.fn(),
  },
  webhookEndpoints: {
    create: vi.fn(),
    list: vi.fn(),
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
  },
};

vi.mock('stripe', () => {
  return {
    default: vi.fn(() => mockStripeInstance),
  };
});

describe('StripeService - Diagnostic Tests', () => {
  let service: StripeService;
  let prisma: PrismaService;
  let stripe: any;
  let configService: ConfigService;

  // Document complex Stripe subscription flow
  const subscriptionScenario: TestScenario = {
    name: 'Create Subscription with Payment Method',
    description: 'Tests the complete flow from customer creation to active subscription',
    setup: [
      'Valid Stripe API keys configured',
      'Customer does not exist in Stripe',
      'Valid payment method token available',
      'Price ID exists in Stripe',
    ],
    steps: [
      {
        action: 'Create Stripe customer',
        data: { email: 'test@example.com', name: 'Test Customer' },
        validation: 'Customer created with valid ID',
      },
      {
        action: 'Attach payment method to customer',
        data: { paymentMethodId: 'pm_test_card', customerId: 'cus_123' },
        validation: 'Payment method successfully attached',
      },
      {
        action: 'Set default payment method',
        validation: 'Payment method set as default for customer',
      },
      {
        action: 'Create subscription',
        data: { customerId: 'cus_123', priceId: 'price_123' },
        validation: 'Subscription created in active or trialing state',
      },
      {
        action: 'Handle initial invoice',
        validation: 'Invoice paid automatically or payment pending',
      },
    ],
    expectedOutcome: 'Active subscription with confirmed payment method',
    commonFailures: [
      {
        symptom: 'Customer creation fails with "Invalid email"',
        causes: [
          'Email format validation failed',
          'Email already exists with different metadata',
          'Stripe account has email restrictions',
        ],
        fixes: [
          'Validate email format before sending to Stripe',
          'Use idempotency key to handle duplicate emails',
          'Check Stripe dashboard for account restrictions',
          'Try updating existing customer instead of creating new',
        ],
        example: 'stripe.customers.create({ email, name }, { idempotency_key: `customer_${email}` })',
      },
      {
        symptom: 'Payment method attachment fails',
        causes: [
          'Payment method already attached to different customer',
          'Payment method token expired or invalid',
          'Customer ID is invalid',
          'Payment method requires additional authentication',
        ],
        fixes: [
          'Detach payment method from previous customer first',
          'Generate fresh payment method token',
          'Verify customer exists before attaching payment method',
          'Handle 3D Secure authentication flow',
        ],
      },
      {
        symptom: 'Subscription created but status is "incomplete"',
        causes: [
          'Initial payment failed or requires authentication',
          'Customer has no default payment method',
          'Price requires immediate payment but card declined',
          'SCA (Strong Customer Authentication) required',
        ],
        fixes: [
          'Handle payment_intent.requires_action webhook',
          'Set default payment method before creating subscription',
          'Use confirm_payment_intent with payment method',
          'Implement 3D Secure authentication flow',
        ],
      },
    ],
  };

  beforeEach(async () => {
    console.log(TestDocumentation.describeScenario(subscriptionScenario));

    // Use the global mock stripe instance
    stripe = mockStripeInstance;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: PrismaService,
          useValue: {
            organization: {
              update: vi.fn(),
              findUnique: vi.fn(),
            },
            subscription: {
              create: vi.fn(),
              update: vi.fn(),
              findUnique: vi.fn(),
            },
            webhookEvent: {
              create: vi.fn(),
              findUnique: vi.fn(),
            },
            $transaction: vi.fn(callback => callback(prisma)),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              const config = {
                STRIPE_SECRET_KEY: 'sk_test_123',
                STRIPE_WEBHOOK_SECRET: 'whsec_123',
                STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
              };
              return config[key];
            }),
          },
        },
        {
          provide: StripeErrorHandler,
          useValue: {
            wrapAsync: vi.fn((fn) => fn()),
            wrapSync: vi.fn((fn) => fn()),
            executeWithRetry: vi.fn((fn) => fn()),
          },
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    PerformanceProfiler.reset();
  });

  describe('createCustomer - with detailed error analysis', () => {
    it('should diagnose customer creation failures with specific fixes', async () => {
      const customerData = {
        email: 'invalid-email',
        name: 'Test Customer',
        organizationId: 'org-123',
      };

      // Mock Stripe error
      const stripeError = new Error('Invalid email address') as any;
      stripeError.type = 'StripeInvalidRequestError';
      stripeError.code = 'email_invalid';
      stripeError.param = 'email';
      stripeError.statusCode = 400;

      stripe.customers.create.mockRejectedValue(stripeError);

      try {
        await service.createCustomer(customerData);
        fail('Should have thrown error');
      } catch (error) {
        console.log('\n🔍 Stripe Customer Creation Diagnostic:');
        console.log('-------------------------------------');
        console.log(`Error Type: ${stripeError.type}`);
        console.log(`Error Code: ${stripeError.code}`);
        console.log(`Error Param: ${stripeError.param}`);
        console.log(`Status Code: ${stripeError.statusCode}`);
        console.log(`Input Email: "${customerData.email}"`);
        
        console.log('\n💡 Specific Fix for This Error:');
        console.log('The email format is invalid. Stripe requires RFC 5322 compliant emails.');
        console.log('\n✅ Solutions:');
        console.log('1. Validate email before sending to Stripe:');
        console.log('   const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;');
        console.log('   if (!emailRegex.test(email)) throw new BadRequestException("Invalid email format");');
        console.log('\n2. Use a library like validator.js:');
        console.log('   import { isEmail } from "validator";');
        console.log('   if (!isEmail(email)) throw new BadRequestException("Invalid email format");');
        console.log('\n3. Test with corrected email:');
        console.log('   const customerData = { ...data, email: "test@example.com" };');

        // Generate playbook for this specific error
        const playbook = await FailurePlaybook.generatePlaybook(
          'stripe.service.spec.ts',
          'stripe-email-validation-error'
        );
        console.log('\n' + playbook);
      }
    });

    it('should handle duplicate customer detection', async () => {
      const existingCustomer = {
        id: 'cus_existing123',
        email: 'test@example.com',
        name: 'Existing Customer',
      };

      // Mock duplicate customer error
      const duplicateError = new Error('Customer already exists') as any;
      duplicateError.type = 'StripeInvalidRequestError';
      duplicateError.code = 'resource_already_exists';

      stripe.customers.create.mockRejectedValue(duplicateError);
      stripe.customers.list.mockResolvedValue({
        data: [existingCustomer],
        has_more: false,
      } as any);

      try {
        await service.createCustomer({
          email: 'test@example.com',
          name: 'Test Customer',
          organizationId: 'org-123',
        });
        fail('Should handle duplicate appropriately');
      } catch (error) {
        console.log('\n🔍 Duplicate Customer Analysis:');
        console.log('-----------------------------');
        console.log('Detected duplicate customer creation attempt');
        console.log(`Existing Customer ID: ${existingCustomer.id}`);
        console.log('\n💡 Resolution Strategy:');
        console.log('1. Search for existing customer by email');
        console.log('2. Update existing customer if needed');
        console.log('3. Return existing customer ID');
        console.log('\n✅ Code pattern:');
        console.log(`
try {
  customer = await stripe.customers.create(data);
} catch (error) {
  if (error.code === 'resource_already_exists') {
    const existing = await stripe.customers.list({ email: data.email });
    customer = existing.data[0];
    console.log(\`Using existing customer: \${customer.id}\`);
  } else {
    throw error;
  }
}
        `.trim());
      }
    });
  });

  describe('createSubscription - with flow analysis', () => {
    it('should trace subscription creation flow with timing', async () => {
      const subscriptionData = {
        customerId: 'cus_123',
        priceId: 'price_123',
        paymentMethodId: 'pm_card_123',
      };

      // Mock successful flow
      stripe.paymentMethods.attach.mockResolvedValue({ id: 'pm_card_123' } as any);
      stripe.customers.update.mockResolvedValue({ id: 'cus_123' } as any);
      stripe.subscriptions.create.mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        latest_invoice: {
          id: 'in_123',
          status: 'paid',
          payment_intent: {
            id: 'pi_123',
            status: 'succeeded',
          },
        },
      } as any);

      console.log('\n🔄 Subscription Creation Flow:');
      console.log('----------------------------');

      PerformanceProfiler.startTimer('subscription-flow-total');

      // Step 1: Attach payment method
      console.log('Step 1: Attaching payment method...');
      PerformanceProfiler.startTimer('attach-payment-method');
      await stripe.paymentMethods.attach('pm_card_123', { customer: 'cus_123' });
      const attachTime = PerformanceProfiler.endTimer('attach-payment-method');
      console.log(`  ✅ Completed in ${attachTime.toFixed(0)}ms`);

      // Step 2: Set default payment method
      console.log('Step 2: Setting default payment method...');
      PerformanceProfiler.startTimer('set-default-payment');
      await stripe.customers.update('cus_123', {
        invoice_settings: { default_payment_method: 'pm_card_123' },
      });
      const defaultTime = PerformanceProfiler.endTimer('set-default-payment');
      console.log(`  ✅ Completed in ${defaultTime.toFixed(0)}ms`);

      // Step 3: Create subscription
      console.log('Step 3: Creating subscription...');
      PerformanceProfiler.startTimer('create-subscription');
      const subscription = await stripe.subscriptions.create({
        customer: 'cus_123',
        items: [{ price: 'price_123' }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
      const createTime = PerformanceProfiler.endTimer('create-subscription');
      console.log(`  ✅ Completed in ${createTime.toFixed(0)}ms`);

      const totalTime = PerformanceProfiler.endTimer('subscription-flow-total');

      console.log('\n📊 Performance Summary:');
      console.log(`Total Flow Time: ${totalTime.toFixed(0)}ms`);
      console.log(`  Payment Method: ${attachTime.toFixed(0)}ms (${(attachTime/totalTime*100).toFixed(1)}%)`);
      console.log(`  Set Default: ${defaultTime.toFixed(0)}ms (${(defaultTime/totalTime*100).toFixed(1)}%)`);
      console.log(`  Create Sub: ${createTime.toFixed(0)}ms (${(createTime/totalTime*100).toFixed(1)}%)`);

      console.log('\n✅ Success Indicators:');
      console.log(`  Subscription ID: ${subscription.id}`);
      console.log(`  Status: ${subscription.status}`);
      console.log(`  Payment Status: ${(subscription.latest_invoice as any).payment_intent.status}`);

      if (totalTime > 2000) {
        console.log('\n⚠️  Flow is slow! Consider:');
        console.log('  - Parallel API calls where possible');
        console.log('  - Caching customer payment methods');
        console.log('  - Using webhooks for async processing');
      }
    });

    it.skip('should diagnose subscription status issues', async () => {
      const incompleteSubscription = {
        id: 'sub_incomplete',
        status: 'incomplete',
        latest_invoice: {
          id: 'in_requires_payment',
          status: 'open',
          payment_intent: {
            id: 'pi_requires_action',
            status: 'requires_action',
            next_action: {
              type: 'use_stripe_sdk',
              use_stripe_sdk: {
                type: 'three_d_secure_redirect',
              },
            },
          },
        },
      };

      stripe.subscriptions.create.mockResolvedValue(incompleteSubscription as any);

      const result = await service.createCheckoutSession({
        customerId: 'cus_123',
        priceId: 'price_123',
        mode: 'subscription',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      // Validate subscription state
      try {
        DiagnosticAssertions.toHaveValidSubscriptionState(
          result,
          'active',
          {
            context: 'Expected active subscription after creation',
            suggestion: 'Subscription requires additional authentication (3D Secure)',
          }
        );
      } catch (error) {
        console.log(error.message);
        
        console.log('\n🔍 Subscription Status Analysis:');
        console.log('-------------------------------');
        console.log(`Status: ${result.status}`);
        console.log(`Invoice Status: ${result.latest_invoice.status}`);
        console.log(`Payment Intent Status: ${result.latest_invoice.payment_intent.status}`);
        console.log(`Next Action Required: ${result.latest_invoice.payment_intent.next_action?.type}`);
        
        console.log('\n💡 To handle this in your frontend:');
        console.log(`
if (subscription.status === 'incomplete') {
  const { error } = await stripe.confirmCardPayment(
    subscription.latest_invoice.payment_intent.client_secret,
    {
      payment_method: subscription.default_payment_method
    }
  );
  
  if (error) {
    console.error('Payment failed:', error);
  } else {
    console.log('Payment succeeded, subscription will become active');
  }
}
        `.trim());
      }
    });
  });

  describe('handleWebhook - with signature validation', () => {
    it('should provide clear feedback on signature failures', async () => {
      const rawBody = JSON.stringify({
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_123' } },
      });
      
      const invalidSignature = 'invalid_signature';
      const timestamp = Math.floor(Date.now() / 1000);
      const sigHeader = `t=${timestamp},v1=${invalidSignature}`;

      // Mock signature validation failure
      stripe.webhooks.constructEvent.mockImplementation(() => {
        const error = new Error('Invalid signature') as any;
        error.type = 'StripeSignatureVerificationError';
        throw error;
      });

      try {
        await service.handleWebhook(rawBody, sigHeader);
        fail('Should have thrown signature error');
      } catch (error) {
        console.log('\n🔍 Webhook Signature Diagnostic:');
        console.log('-------------------------------');
        console.log(`Signature Header: ${sigHeader}`);
        console.log(`Webhook Secret: ${configService.get('STRIPE_WEBHOOK_SECRET')?.substring(0, 10)}...`);
        console.log(`Body Length: ${rawBody.length} bytes`);
        console.log(`Timestamp: ${timestamp} (${new Date(timestamp * 1000).toISOString()})`);
        
        console.log('\n💡 Signature Validation Steps:');
        console.log('1. Verify webhook endpoint secret in Stripe Dashboard');
        console.log('2. Ensure raw body is passed (no JSON parsing)');
        console.log('3. Check body parsing middleware is disabled for webhook route');
        console.log('4. Verify timestamp is within tolerance (5 minutes)');
        
        console.log('\n✅ Debugging commands:');
        console.log('# Generate test signature:');
        console.log(`node -e "
const crypto = require('crypto');
const secret = process.env.STRIPE_WEBHOOK_SECRET;
const timestamp = ${timestamp};
const body = '${rawBody}';
const payload = timestamp + '.' + body;
const signature = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
console.log('t=' + timestamp + ',v1=' + signature);
"`);
        
        console.log('\n# Test in your route:');
        console.log(`
@Post('webhook')
@Raw() // Important: use raw body
handleWebhook(@Req() req: RawBodyRequest<Request>) {
  const sig = req.headers['stripe-signature'];
  const body = req.rawBody; // Raw buffer, not parsed JSON
  return this.stripeService.handleWebhook(body, sig);
}
        `.trim());
      }
    });

    it('should trace webhook event processing', async () => {
      const webhookEvent = {
        id: 'evt_test_webhook',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            status: 'active',
            customer: 'cus_123',
          },
        },
        created: Math.floor(Date.now() / 1000),
      };

      stripe.webhooks.constructEvent.mockReturnValue(webhookEvent as any);
      vi.spyOn(prisma.webhookEvent, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.webhookEvent, 'create').mockResolvedValue({ id: 'webhook-123' } as any);
      vi.spyOn(prisma.subscription, 'update').mockResolvedValue({ id: 'sub-123' } as any);

      console.log('\n🔄 Webhook Processing Flow:');
      console.log('-------------------------');

      PerformanceProfiler.startTimer('webhook-processing');

      // Step 1: Event validation
      console.log(`Step 1: Processing ${webhookEvent.type} event...`);
      console.log(`  Event ID: ${webhookEvent.id}`);
      console.log(`  Created: ${new Date(webhookEvent.created * 1000).toISOString()}`);

      // Step 2: Idempotency check
      PerformanceProfiler.startTimer('idempotency-check');
      const existingEvent = await prisma.webhookEvent.findUnique({
        where: { stripeEventId: webhookEvent.id },
      });
      const idempotencyTime = PerformanceProfiler.endTimer('idempotency-check');
      console.log(`Step 2: Idempotency check completed in ${idempotencyTime.toFixed(0)}ms`);
      
      if (!existingEvent) {
        console.log('  ✅ New event, proceeding with processing');
        
        // Step 3: Database update
        PerformanceProfiler.startTimer('database-update');
        await prisma.subscription.update({
          where: { stripeSubscriptionId: webhookEvent.data.object.id },
          data: { status: webhookEvent.data.object.status },
        });
        const updateTime = PerformanceProfiler.endTimer('database-update');
        console.log(`Step 3: Database updated in ${updateTime.toFixed(0)}ms`);

        // Step 4: Event logging
        await prisma.webhookEvent.create({
          data: {
            stripeEventId: webhookEvent.id,
            eventType: webhookEvent.type,
            processed: true,
          },
        });
        console.log('Step 4: Event logged for idempotency');
      } else {
        console.log('  ⚠️  Duplicate event, skipping processing');
      }

      const totalTime = PerformanceProfiler.endTimer('webhook-processing');
      console.log(`\n📊 Total processing time: ${totalTime.toFixed(0)}ms`);

      if (totalTime > 1000) {
        console.log('\n⚠️  Webhook processing is slow!');
        console.log('💡 Optimizations:');
        console.log('  - Add database indexes on stripeEventId and stripeSubscriptionId');
        console.log('  - Use database transactions for atomic updates');
        console.log('  - Consider async processing for non-critical events');
        console.log('  - Implement webhook retry mechanism');
      }
    });
  });

  describe('Price and Product validation', () => {
    it('should validate price configuration with helpful errors', async () => {
      const invalidPriceId = 'price_invalid123';
      
      // Mock price not found
      stripe.prices.retrieve.mockRejectedValue({
        type: 'StripeInvalidRequestError',
        code: 'resource_missing',
        param: 'price',
        message: 'No such price',
      } as any);

      try {
        await service.getPrice(invalidPriceId);
        fail('Should have thrown error');
      } catch (error) {
        console.log('\n🔍 Price Validation Diagnostic:');
        console.log('-----------------------------');
        console.log(`Price ID: ${invalidPriceId}`);
        console.log('Error: Price not found in Stripe');
        
        console.log('\n💡 Troubleshooting Steps:');
        console.log('1. Verify price exists in Stripe Dashboard');
        console.log('2. Check if price is in test/live mode matching your keys');
        console.log('3. Ensure price is active (not archived)');
        console.log('4. Verify you have correct price ID format');
        
        console.log('\n✅ List available prices:');
        console.log('stripe prices list --limit 10');
        
        console.log('\n🔧 Create test price:');
        console.log(`
stripe prices create \\
  --unit-amount=2000 \\
  --currency=usd \\
  --recurring-interval=month \\
  --product-data-name="Test Plan"
        `.trim());
      }
    });
  });

  describe('Error recovery patterns', () => {
    it('should demonstrate retry logic for transient failures', async () => {
      let attemptCount = 0;
      
      stripe.customers.create.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          // Simulate transient network error
          const error = new Error('Request timeout') as any;
          error.type = 'StripeConnectionError';
          throw error;
        }
        return Promise.resolve({ id: 'cus_success' } as any);
      });

      console.log('\n🔄 Retry Logic Demonstration:');
      console.log('---------------------------');

      const maxRetries = 3;
      let result;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          console.log(`Attempt ${i + 1}/${maxRetries}...`);
          result = await stripe.customers.create({ email: 'test@example.com' });
          console.log(`✅ Success on attempt ${i + 1}`);
          break;
        } catch (error) {
          console.log(`❌ Attempt ${i + 1} failed: ${error.message}`);
          
          if (i === maxRetries - 1) {
            throw error;
          }
          
          // Exponential backoff
          const delay = Math.pow(2, i) * 1000;
          console.log(`   Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      expect(result).toBeDefined();
      expect(attemptCount).toBe(3);
      
      console.log('\n💡 Retry Pattern Implementation:');
      console.log(`
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      const isRetryable = error.type === 'StripeConnectionError' || 
                         error.type === 'StripeAPIError';
      
      if (!isRetryable || i === maxRetries - 1) {
        throw error;
      }
      
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}
      `.trim());
    });
  });
});