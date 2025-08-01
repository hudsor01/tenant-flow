import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger
} from '@nestjs/common'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { StripeBillingService } from '../stripe/stripe-billing.service'
import { StripeService } from '../stripe/stripe.service'
import { SubscriptionsManagerService } from '../subscriptions/subscriptions-manager.service'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger'
import type { PlanType } from '@prisma/client'
import { 
  CreateCheckoutSessionDto,
  CreatePortalSessionDto,
  PreviewSubscriptionUpdateDto,
  UpdatePaymentMethodDto
} from './dto'

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name)

  constructor(
    private readonly stripeBillingService: StripeBillingService,
    private readonly stripeService: StripeService,
    private readonly subscriptionsService: SubscriptionsManagerService,
    private readonly errorHandler: ErrorHandlerService
  ) {}

  /**
   * Create a checkout session for new subscriptions or upgrades
   */
  @Post('checkout/session')
  @ApiOperation({ summary: 'Create a Stripe checkout session for subscription' })
  @ApiBody({ type: CreateCheckoutSessionDto })
  @ApiResponse({ status: 201, description: 'Checkout session created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 409, description: 'User already has an active subscription' })
  async createCheckoutSession(
    @CurrentUser() user: { id: string; email: string },
    @Body() dto: CreateCheckoutSessionDto
  ) {
    try {
      // Check if user already has an active subscription
      const existingSubscription = await this.subscriptionsService.getSubscription(user.id)
      if (existingSubscription && ['ACTIVE', 'TRIALING'].includes(existingSubscription.status)) {
        // Allow upgrades but not duplicate subscriptions
        const currentPlan = await this.subscriptionsService.getPlanById(existingSubscription.planType!)
        const newPlan = await this.subscriptionsService.getPlanById(dto.planType)
        
        if (!newPlan || !currentPlan) {
          throw this.errorHandler.createNotFoundError('Plan', dto.planType)
        }

        // Prevent downgrade through checkout (should use billing portal)
        if (newPlan.price.monthly <= currentPlan.price.monthly) {
          throw this.errorHandler.createBusinessError(
            ErrorCode.CONFLICT,
            'Please use the billing portal to manage your existing subscription',
            { metadata: { userId: user.id, currentPlan: existingSubscription.planType } }
          )
        }
      }

      // Create checkout session
      const session = await this.stripeBillingService.createCheckoutSession({
        userId: user.id,
        planType: dto.planType,
        billingInterval: dto.billingInterval,
        successUrl: dto.successUrl || `${this.getBaseUrl()}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: dto.cancelUrl || `${this.getBaseUrl()}/billing/cancel`,
        couponId: dto.couponId
      })

      this.logger.log('Checkout session created', {
        userId: user.id,
        sessionId: session.sessionId,
        planType: dto.planType
      })

      return {
        sessionId: session.sessionId,
        url: session.url
      }
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'BillingController.createCheckoutSession',
        metadata: { userId: user.id, planType: dto.planType }
      })
    }
  }

  /**
   * Create a billing portal session for subscription management
   */
  @Post('portal/session')
  @ApiOperation({ summary: 'Create a Stripe billing portal session' })
  @ApiBody({ type: CreatePortalSessionDto })
  @ApiResponse({ status: 201, description: 'Portal session created successfully' })
  @ApiResponse({ status: 404, description: 'No subscription found for user' })
  async createPortalSession(
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePortalSessionDto
  ) {
    try {
      const subscription = await this.subscriptionsService.getSubscription(user.id)
      if (!subscription || !subscription.stripeCustomerId) {
        throw this.errorHandler.createNotFoundError('Subscription', user.id)
      }

      const session = await this.stripeBillingService.createCustomerPortalSession({
        userId: user.id,
        returnUrl: dto.returnUrl || `${this.getBaseUrl()}/billing`
      })

      this.logger.log('Portal session created', {
        userId: user.id,
        customerId: subscription.stripeCustomerId
      })

      return {
        url: session.url
      }
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'BillingController.createPortalSession',
        metadata: { userId: user.id }
      })
    }
  }

  /**
   * Preview subscription update to show prorated amounts
   */
  @Post('subscription/preview')
  @ApiOperation({ summary: 'Preview subscription plan change with proration' })
  @ApiBody({ type: PreviewSubscriptionUpdateDto })
  @ApiResponse({ status: 200, description: 'Preview generated successfully' })
  @ApiResponse({ status: 404, description: 'No subscription found' })
  async previewSubscriptionUpdate(
    @CurrentUser() user: { id: string },
    @Body() dto: PreviewSubscriptionUpdateDto
  ) {
    try {
      const subscription = await this.subscriptionsService.getSubscription(user.id)
      if (!subscription || !subscription.stripeSubscriptionId) {
        throw this.errorHandler.createNotFoundError('Subscription', user.id)
      }

      // Get the new price ID
      const newPlan = await this.subscriptionsService.getPlanById(dto.newPlanType)
      if (!newPlan) {
        throw this.errorHandler.createNotFoundError('Plan', dto.newPlanType)
      }

      const newPriceId = dto.newBillingInterval === 'annual' 
        ? newPlan.stripeAnnualPriceId 
        : newPlan.stripeMonthlyPriceId

      if (!newPriceId) {
        throw this.errorHandler.createValidationError(
          `No ${dto.newBillingInterval} price configured for plan: ${dto.newPlanType}`
        )
      }

      // Create preview invoice
      const stripeSubscription = await this.stripeService.getSubscription(subscription.stripeSubscriptionId)
      if (!stripeSubscription) {
        throw this.errorHandler.createNotFoundError('Stripe subscription', subscription.stripeSubscriptionId)
      }

      const preview = await this.stripeService.createPreviewInvoice({
        customerId: subscription.stripeCustomerId!,
        subscriptionId: subscription.stripeSubscriptionId,
        subscriptionItems: [{
          id: stripeSubscription.items.data[0]?.id,
          price: newPriceId
        }]
      })

      const currentAmount = stripeSubscription.items.data[0]?.price.unit_amount || 0
      const newAmount = preview.lines.data[0]?.amount || 0
      const prorationAmount = preview.lines.data
        .filter((line) => line.description?.includes('unused time') || line.amount < 0)
        .reduce((sum: number, line) => sum + line.amount, 0)

      return {
        currentPlan: subscription.planType,
        newPlan: dto.newPlanType,
        currentBillingInterval: await this.getBillingInterval(subscription.stripePriceId),
        newBillingInterval: dto.newBillingInterval,
        currentAmount: currentAmount / 100, // Convert from cents
        newAmount: newAmount / 100,
        prorationAmount: prorationAmount / 100,
        immediatePayment: prorationAmount > 0 ? prorationAmount / 100 : 0,
        nextBillingDate: subscription.currentPeriodEnd,
        currency: preview.currency
      }
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'BillingController.previewSubscriptionUpdate',
        metadata: { userId: user.id, newPlanType: dto.newPlanType }
      })
    }
  }

  /**
   * Get customer's payment methods
   */
  @Get('payment-methods')
  @ApiOperation({ summary: 'Get user payment methods' })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved successfully' })
  async getPaymentMethods(@CurrentUser() user: { id: string }) {
    try {
      const subscription = await this.subscriptionsService.getSubscription(user.id)
      if (!subscription || !subscription.stripeCustomerId) {
        return { paymentMethods: [] }
      }

      const customer = await this.stripeService.getCustomer(subscription.stripeCustomerId)
      if (!customer) {
        return { paymentMethods: [] }
      }

      // Get payment methods from Stripe
      const paymentMethods = await this.stripeService.client.paymentMethods.list({
        customer: subscription.stripeCustomerId,
        type: 'card'
      })

      const defaultPaymentMethodId = typeof customer.invoice_settings?.default_payment_method === 'string'
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings?.default_payment_method?.id

      return {
        paymentMethods: paymentMethods.data.map(pm => ({
          id: pm.id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year,
          isDefault: pm.id === defaultPaymentMethodId
        })),
        defaultPaymentMethodId
      }
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'BillingController.getPaymentMethods',
        metadata: { userId: user.id }
      })
    }
  }

  /**
   * Update default payment method
   */
  @Post('payment-methods/update')
  @ApiOperation({ summary: 'Update default payment method' })
  @ApiBody({ type: UpdatePaymentMethodDto })
  @ApiResponse({ status: 200, description: 'Payment method updated successfully' })
  @HttpCode(HttpStatus.OK)
  async updatePaymentMethod(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePaymentMethodDto
  ) {
    try {
      const subscription = await this.subscriptionsService.getSubscription(user.id)
      if (!subscription || !subscription.stripeCustomerId) {
        throw this.errorHandler.createNotFoundError('Subscription', user.id)
      }

      // Attach payment method to customer if needed
      try {
        await this.stripeService.client.paymentMethods.attach(dto.paymentMethodId, {
          customer: subscription.stripeCustomerId
        })
      } catch (error) {
        // Ignore if already attached
        if (!(error as Error).message?.includes('already attached')) {
          throw error
        }
      }

      // Update default payment method
      if (dto.setAsDefault) {
        await this.stripeService.client.customers.update(subscription.stripeCustomerId, {
          invoice_settings: {
            default_payment_method: dto.paymentMethodId
          }
        })

        // Update subscription default payment method
        if (subscription.stripeSubscriptionId) {
          await this.stripeService.updateSubscription(subscription.stripeSubscriptionId, {
            default_payment_method: dto.paymentMethodId
          })
        }
      }

      this.logger.log('Payment method updated', {
        userId: user.id,
        paymentMethodId: dto.paymentMethodId,
        setAsDefault: dto.setAsDefault
      })

      return {
        success: true,
        message: 'Payment method updated successfully'
      }
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'BillingController.updatePaymentMethod',
        metadata: { userId: user.id }
      })
    }
  }

  /**
   * Handle successful checkout completion
   */
  @Get('checkout/success')
  @ApiOperation({ summary: 'Handle successful checkout redirect' })
  @ApiResponse({ status: 200, description: 'Checkout success handled' })
  async handleCheckoutSuccess(
    @CurrentUser() user: { id: string },
    @Query('session_id') sessionId: string
  ) {
    try {
      if (!sessionId) {
        throw this.errorHandler.createValidationError('Session ID is required')
      }

      // Retrieve checkout session from Stripe
      const session = await this.stripeService.client.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer']
      })

      if (!session.subscription) {
        throw this.errorHandler.createBusinessError(
          ErrorCode.INVALID_INPUT,
          'Checkout session does not contain a subscription'
        )
      }

      // Verify the session belongs to the current user
      const subscription = await this.subscriptionsService.getSubscription(user.id)
      if (subscription?.stripeCustomerId !== session.customer) {
        throw this.errorHandler.createBusinessError(
          ErrorCode.FORBIDDEN,
          'Checkout session does not belong to current user'
        )
      }

      this.logger.log('Checkout completed successfully', {
        userId: user.id,
        sessionId,
        subscriptionId: typeof session.subscription === 'string' 
          ? session.subscription 
          : session.subscription.id
      })

      return {
        success: true,
        subscriptionId: typeof session.subscription === 'string' 
          ? session.subscription 
          : session.subscription.id,
        message: 'Thank you for your subscription!'
      }
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'BillingController.handleCheckoutSuccess',
        metadata: { userId: user.id, sessionId }
      })
    }
  }

  private getBaseUrl(): string {
    const frontendUrl = process.env.FRONTEND_URL || 'https://tenantflow.app'
    return frontendUrl
  }

  private async getBillingInterval(stripePriceId?: string | null): Promise<'monthly' | 'annual' | null> {
    if (!stripePriceId) return null
    
    // Check all plans to find matching price ID
    const plans = ['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'] as PlanType[]
    for (const planType of plans) {
      const plan = await this.subscriptionsService.getPlanById(planType)
      if (plan?.stripeMonthlyPriceId === stripePriceId) return 'monthly'
      if (plan?.stripeAnnualPriceId === stripePriceId) return 'annual'
    }
    
    return null
  }
}