import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Param,
	Post,
	Req,
	Res,
	UseGuards
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiParam,
	ApiProduces,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { Response } from 'express'
import { PDFGeneratorService } from './pdf-generator.service'
import { DocumentTemplateStorageService } from '../documents/document-template-storage.service'
import {
	DocumentTemplatePayloadDto,
	TemplateDefinitionDto
} from './dto/document-template.dto'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'

const TEMPLATE_MAP: Record<string, { name: string; title: string }> = {
	'property-inspection': {
		name: 'property-inspection',
		title: 'Property Inspection Report'
	},
	'rental-application': {
		name: 'rental-application',
		title: 'Rental Application'
	},
	'tenant-notice': {
		name: 'tenant-notice',
		title: 'Tenant Notice'
	},
	'maintenance-request': {
		name: 'maintenance-request',
		title: 'Maintenance Request Form'
	}
}

/** Default color used when branding color is invalid or missing */
const DEFAULT_BRAND_COLOR = '#1f3b66'

/** Regex to validate safe CSS color values */
const SAFE_COLOR_PATTERN = /^(oklch\([0-9.\s/]+\)|#[0-9a-fA-F]{3,8}|[a-zA-Z]+)$/

@ApiTags('Document Templates')
@ApiBearerAuth('supabase-auth')
@Controller('documents/templates')
export class DocumentTemplateController {
	constructor(
		private readonly pdfGenerator: PDFGeneratorService,
		private readonly storage: DocumentTemplateStorageService
	) {}

	@ApiOperation({
		summary: 'Preview document template PDF',
		description: 'Generate a PDF preview for a document template.'
	})
	@ApiParam({
		name: 'template',
		required: true,
		enum: Object.keys(TEMPLATE_MAP)
	})
	@ApiBody({ type: DocumentTemplatePayloadDto })
	@ApiProduces('application/pdf')
	@ApiResponse({ status: 200, description: 'Template preview PDF generated' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@UseGuards(JwtAuthGuard)
	@Post(':template/preview')
	async previewTemplate(
		@Param('template') template: string,
		@Body() body: DocumentTemplatePayloadDto,
		@Res() res: Response
	): Promise<void> {
		const templateConfig = TEMPLATE_MAP[template]
		if (!templateConfig) {
			throw new BadRequestException('Unsupported template type')
		}

		const payload = this.buildTemplatePayload(templateConfig.title, body)
		const pdfBuffer = await this.pdfGenerator.generatePDFWithTemplate(
			templateConfig.name,
			payload
		)

		const filename = this.buildFilename(templateConfig.name)
		res.setHeader('Content-Type', 'application/pdf')
		res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
		res.setHeader('Content-Length', pdfBuffer.length)
		res.setHeader('Cache-Control', 'no-cache')
		res.send(pdfBuffer)
	}

	@ApiOperation({
		summary: 'Export document template PDF',
		description:
			'Generate a PDF for a document template and upload it to storage.'
	})
	@ApiParam({
		name: 'template',
		required: true,
		enum: Object.keys(TEMPLATE_MAP)
	})
	@ApiBody({ type: DocumentTemplatePayloadDto })
	@ApiResponse({ status: 200, description: 'Template PDF uploaded' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@UseGuards(JwtAuthGuard)
	@Post(':template/export')
	async exportTemplate(
		@Req() req: AuthenticatedRequest,
		@Param('template') template: string,
		@Body() body: DocumentTemplatePayloadDto
	) {
		const templateConfig = TEMPLATE_MAP[template]
		if (!templateConfig) {
			throw new BadRequestException('Unsupported template type')
		}

		const payload = this.buildTemplatePayload(templateConfig.title, body)
		const pdfBuffer = await this.pdfGenerator.generatePDFWithTemplate(
			templateConfig.name,
			payload
		)

		const uploadResult = await this.storage.uploadTemplatePdf(
			req.user.id,
			templateConfig.name,
			pdfBuffer
		)

		return {
			downloadUrl: uploadResult.publicUrl,
			path: uploadResult.path,
			bucket: uploadResult.bucket
		}
	}

	@ApiOperation({
		summary: 'Get document template definition',
		description: 'Fetch saved form builder fields for a template.'
	})
	@ApiParam({ name: 'template', required: true, enum: Object.keys(TEMPLATE_MAP) })
	@ApiResponse({ status: 200, description: 'Template definition fetched' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@UseGuards(JwtAuthGuard)
	@Get(':template/definition')
	async getTemplateDefinition(
		@Req() req: AuthenticatedRequest,
		@Param('template') template: string
	) {
		const templateConfig = TEMPLATE_MAP[template]
		if (!templateConfig) {
			throw new BadRequestException('Unsupported template type')
		}

		const definition = await this.storage.getTemplateDefinition(
			req.user.id,
			templateConfig.name
		)

		return {
			fields: (definition?.fields as unknown[]) ?? []
		}
	}

	@ApiOperation({
		summary: 'Save document template definition',
		description: 'Persist form builder fields for a template.'
	})
	@ApiParam({ name: 'template', required: true, enum: Object.keys(TEMPLATE_MAP) })
	@ApiBody({ type: TemplateDefinitionDto })
	@ApiResponse({ status: 200, description: 'Template definition saved' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@UseGuards(JwtAuthGuard)
	@Post(':template/definition')
	async saveTemplateDefinition(
		@Req() req: AuthenticatedRequest,
		@Param('template') template: string,
		@Body() body: TemplateDefinitionDto
	) {
		const templateConfig = TEMPLATE_MAP[template]
		if (!templateConfig) {
			throw new BadRequestException('Unsupported template type')
		}

		const fields = body.fields ?? []
		const uploadResult = await this.storage.uploadTemplateDefinition(
			req.user.id,
			templateConfig.name,
			{ fields }
		)

		return {
			path: uploadResult.path,
			bucket: uploadResult.bucket
		}
	}

	/**
	 * Sanitize branding data to prevent CSS injection
	 */
	private sanitizeBranding(
		branding?: DocumentTemplatePayloadDto['branding']
	): Record<string, unknown> {
		const rawColor = branding?.primaryColor
		const isSafeColor =
			typeof rawColor === 'string' && SAFE_COLOR_PATTERN.test(rawColor)

		return {
			companyName: String(branding?.companyName ?? '').slice(0, 200),
			logoUrl: branding?.logoUrl ?? null,
			primaryColor: isSafeColor ? rawColor : DEFAULT_BRAND_COLOR
		}
	}

	private buildTemplatePayload(
		fallbackTitle: string,
		body: DocumentTemplatePayloadDto
	): Record<string, unknown> {
		return {
			templateTitle: body.templateTitle || fallbackTitle,
			generatedAt: new Date().toISOString().split('T')[0],
			state: body.state || 'CA',
			branding: this.sanitizeBranding(body.branding),
			customFields: body.customFields || [],
			clauses: body.clauses || [],
			...(body.data || {})
		}
	}

	private buildFilename(templateName: string): string {
		const date = new Date().toISOString().split('T')[0]
		return `${templateName}-${date}.pdf`
	}
}
