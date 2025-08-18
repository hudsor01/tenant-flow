import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { StripeFdwService } from './stripe-fdw.service'
import { USER_ROLE } from '@repo/shared'

@Controller('stripe-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(USER_ROLE.ADMIN) // Only admins can access Stripe analytics
export class StripeAnalyticsController {
	constructor(private readonly stripeFdwService: StripeFdwService) {}

	/**
	 * Get all customers from Stripe via FDW
	 * GET /stripe-analytics/customers
	 */
	@Get('customers')
	async getCustomers(@Query('limit') limit?: string) {
		const customerLimit = limit ? parseInt(limit, 10) : 50
		return this.stripeFdwService.getCustomers(customerLimit)
	}

	/**
	 * Get specific customer by ID
	 * GET /stripe-analytics/customers/:id
	 */
	@Get('customers/:id')
	async getCustomerById(@Param('id') customerId: string) {
		return this.stripeFdwService.getCustomerById(customerId)
	}

	/**
	 * Get customer payment history
	 * GET /stripe-analytics/customers/:id/payment-history
	 */
	@Get('customers/:id/payment-history')
	async getCustomerPaymentHistory(@Param('id') customerId: string) {
		return this.stripeFdwService.getCustomerPaymentHistory(customerId)
	}

	/**
	 * Get all subscriptions
	 * GET /stripe-analytics/subscriptions
	 */
	@Get('subscriptions')
	async getSubscriptions(
		@Query('customer_id') customerId?: string,
		@Query('limit') limit?: string
	) {
		const subscriptionLimit = limit ? parseInt(limit, 10) : 50
		return this.stripeFdwService.getSubscriptions(
			customerId,
			subscriptionLimit
		)
	}

	/**
	 * Get subscription analytics
	 * GET /stripe-analytics/subscriptions/analytics
	 */
	@Get('subscriptions/analytics')
	async getSubscriptionAnalytics() {
		return this.stripeFdwService.getSubscriptionAnalytics()
	}

	/**
	 * Get payment intents
	 * GET /stripe-analytics/payment-intents
	 */
	@Get('payment-intents')
	async getPaymentIntents(
		@Query('customer_id') customerId?: string,
		@Query('limit') limit?: string
	) {
		const intentLimit = limit ? parseInt(limit, 10) : 50
		return this.stripeFdwService.getPaymentIntents(customerId, intentLimit)
	}

	/**
	 * Get all products
	 * GET /stripe-analytics/products
	 */
	@Get('products')
	async getProducts(
		@Query('active_only') activeOnly?: string,
		@Query('limit') limit?: string
	) {
		const isActiveOnly = activeOnly !== 'false'
		const productLimit = limit ? parseInt(limit, 10) : 50
		return this.stripeFdwService.getProducts(isActiveOnly, productLimit)
	}

	/**
	 * Get all prices
	 * GET /stripe-analytics/prices
	 */
	@Get('prices')
	async getPrices(
		@Query('product_id') productId?: string,
		@Query('active_only') activeOnly?: string,
		@Query('limit') limit?: string
	) {
		const isActiveOnly = activeOnly !== 'false'
		const priceLimit = limit ? parseInt(limit, 10) : 50
		return this.stripeFdwService.getPrices(
			productId,
			isActiveOnly,
			priceLimit
		)
	}

	/**
	 * Get prices for a specific product
	 * GET /stripe-analytics/products/:id/prices
	 */
	@Get('products/:id/prices')
	async getProductPrices(
		@Param('id') productId: string,
		@Query('active_only') activeOnly?: string,
		@Query('limit') limit?: string
	) {
		const isActiveOnly = activeOnly !== 'false'
		const priceLimit = limit ? parseInt(limit, 10) : 50
		return this.stripeFdwService.getPrices(
			productId,
			isActiveOnly,
			priceLimit
		)
	}
}
