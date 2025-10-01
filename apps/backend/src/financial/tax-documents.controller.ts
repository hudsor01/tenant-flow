import {
	BadRequestException,
	Controller,
	Get,
	Query,
	Req,
	UseGuards
} from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../shared/auth/jwt-auth.guard'
import { TaxDocumentsService } from './tax-documents.service'

interface AuthenticatedRequest extends Request {
	user?: {
		id: string
		email: string
	}
}

@Controller('financials/tax-documents')
@UseGuards(JwtAuthGuard)
export class TaxDocumentsController {
	constructor(private readonly taxDocumentsService: TaxDocumentsService) {}

	@Get()
	async getTaxDocuments(
		@Req() req: AuthenticatedRequest,
		@Query('taxYear') taxYear?: string
	) {
		const userId = req.user?.id

		if (!userId) {
			throw new BadRequestException('User ID is required')
		}

		// Default to current year if no tax year provided
		const defaultYear = new Date().getFullYear()
		const finalYear = taxYear ? parseInt(taxYear, 10) : defaultYear

		// Validate year
		if (isNaN(finalYear) || finalYear < 2000 || finalYear > 2100) {
			throw new BadRequestException('Invalid tax year')
		}

		const data = await this.taxDocumentsService.generateTaxDocuments(
			userId,
			finalYear
		)

		return {
			success: true,
			data
		}
	}
}
