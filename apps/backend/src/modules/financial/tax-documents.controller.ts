import {
	BadRequestException,
	Controller,
	Get,
	Query,
	Request,
	UnauthorizedException,
	UseGuards
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { TaxDocumentsService } from './tax-documents.service'

@ApiTags('Financials')
@ApiBearerAuth('supabase-auth')
@Controller('financials/tax-documents')
@UseGuards(JwtAuthGuard)
export class TaxDocumentsController {
	constructor(private readonly taxDocumentsService: TaxDocumentsService) {}

	@ApiOperation({ summary: 'Get tax documents', description: 'Generate tax documents and summaries for a tax year' })
	@ApiQuery({ name: 'taxYear', required: false, type: Number, description: 'Tax year (defaults to current year)' })
	@ApiResponse({ status: 200, description: 'Tax documents generated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid tax year' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get()
	async getTaxDocuments(
		@Request() req: AuthenticatedRequest,
		@Query('taxYear') taxYear?: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token || !req.user?.id) {
			throw new UnauthorizedException('Authentication token is required')
		}

		// Default to current year if no tax year provided
		const defaultYear = new Date().getFullYear()
		const finalYear = taxYear ? parseInt(taxYear, 10) : defaultYear

		// Validate year
		if (isNaN(finalYear) || finalYear < 2000 || finalYear > 2100) {
			throw new BadRequestException('Invalid tax year')
		}

		const data = await this.taxDocumentsService.generateTaxDocuments(
			token,
			req.user.id,
			finalYear
		)

		return {
			success: true,
			data
		}
	}
}
