import {
	BadRequestException,
	Controller,
	Get,
	Query,
	UnauthorizedException,
	UseGuards
} from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { TaxDocumentsService } from './tax-documents.service'

@Controller('financials/tax-documents')
@UseGuards(JwtAuthGuard)
export class TaxDocumentsController {
	constructor(private readonly taxDocumentsService: TaxDocumentsService) {}

	@Get()
	async getTaxDocuments(
		@JwtToken() token: string,
		@Query('taxYear') taxYear?: string
	) {
		if (!token) {
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
			finalYear
		)

		return {
			success: true,
			data
		}
	}
}
