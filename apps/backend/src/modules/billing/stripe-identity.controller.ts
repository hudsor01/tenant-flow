import {
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Req,
	Post,
	UseGuards
} from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { StripeIdentityService } from './stripe-identity.service'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'

@Controller('identity')
@UseGuards(JwtAuthGuard)
export class StripeIdentityController {
	constructor(private readonly stripeIdentityService: StripeIdentityService) {}

	@Post('verification-session')
	@HttpCode(HttpStatus.CREATED)
	async createVerificationSession(@Req() req: AuthenticatedRequest) {
		const payload = await this.stripeIdentityService.createVerificationSession(
			req.user.id
		)

		return {
			success: true,
			data: payload
		}
	}

	@Get('verification-status')
	async getVerificationStatus(@Req() req: AuthenticatedRequest) {
		const status = await this.stripeIdentityService.getIdentityStatus(req.user.id)

		return {
			success: true,
			data: status
		}
	}
}
