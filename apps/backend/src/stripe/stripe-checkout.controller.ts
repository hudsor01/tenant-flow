import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { StripeCheckoutService } from './stripe-checkout.service'
import type { 
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreatePortalSessionRequest,
  CreatePortalSessionResponse
} from '@tenantflow/shared/types/stripe-pricing'

interface AuthenticatedUser {
  id: string
  email: string
  stripeCustomerId?: string
}

@ApiTags('stripe-checkout')
@Controller('stripe')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StripeCheckoutController {
  private readonly logger = new Logger(StripeCheckoutController.name)

  constructor(
    private readonly stripeCheckoutService: StripeCheckoutService,
  ) {}

  @Post('create-checkout-session')
  @ApiOperation({ summary: 'Create a Stripe checkout session for subscription' })
  @ApiResponse({ 
    status: 200, 
    description: 'Checkout session created successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        sessionId: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createCheckoutSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: CreateCheckoutSessionRequest
  ): Promise<CreateCheckoutSessionResponse> {
    this.logger.log(`Creating checkout session for user: ${user.id}`)

    // Use existing customer ID if available, otherwise use email
    const enhancedRequest: CreateCheckoutSessionRequest = {
      ...request,
      customerId: request.customerId || user.stripeCustomerId,
      customerEmail: request.customerEmail || user.email,
    }

    return this.stripeCheckoutService.createCheckoutSession(user.id, enhancedRequest)
  }

  @Post('create-portal-session')
  @ApiOperation({ summary: 'Create a Stripe customer portal session' })
  @ApiResponse({ 
    status: 200, 
    description: 'Portal session created successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Customer ID required' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPortalSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: CreatePortalSessionRequest
  ): Promise<CreatePortalSessionResponse> {
    this.logger.log(`Creating portal session for user: ${user.id}`)

    // Use user's stripe customer ID if not provided in request
    const customerId = request.customerId || user.stripeCustomerId

    if (!customerId) {
      throw new Error('No Stripe customer ID found. Please subscribe to a plan first.')
    }

    const enhancedRequest: CreatePortalSessionRequest = {
      ...request,
      customerId,
    }

    return this.stripeCheckoutService.createPortalSession(user.id, enhancedRequest)
  }
}