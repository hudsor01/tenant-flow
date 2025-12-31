import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Param,
	Post,
	Req,
	Res,
	UnauthorizedException
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
import type { Response, Request } from 'express'
import { PDFGeneratorService } from './pdf-generator.service'
import { SupabaseService } from '../../database/supabase.service'
import { DocumentTemplateStorageService } from '../documents/document-template-storage.service'

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

interface DocumentTemplatePayload {
	templateTitle?: string
	state?: string
	branding?: Record<string, unknown>
	customFields?: Array<{ label: string; value: string }>
	clauses?: Array<{ text: string }>
	data?: Record<string, unknown>
}

@ApiTags('Document Templates')
@ApiBearerAuth('supabase-auth')
@Controller('documents/templates')
export class DocumentTemplateController {
	constructor(
		private readonly pdfGenerator: PDFGeneratorService,
		private readonly supabase: SupabaseService,
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
	@ApiBody({
		schema: { type: 'object', additionalProperties: true }
	})
	@ApiProduces('application/pdf')
	@ApiResponse({ status: 200, description: 'Template preview PDF generated' })
	@Post(':template/preview')
	async previewTemplate(
		@Param('template') template: string,
		@Body() body: DocumentTemplatePayload,
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
	@ApiBody({
		schema: { type: 'object', additionalProperties: true }
	})
	@ApiResponse({ status: 200, description: 'Template PDF uploaded' })
	@Post(':template/export')
	async exportTemplate(
		@Req() req: Request,
		@Param('template') template: string,
		@Body() body: DocumentTemplatePayload
	) {
		const templateConfig = TEMPLATE_MAP[template]
		if (!templateConfig) {
			throw new BadRequestException('Unsupported template type')
		}

		const user = await this.supabase.getUser(req)
		if (!user) {
			throw new UnauthorizedException('Authorization token required')
		}

		const payload = this.buildTemplatePayload(templateConfig.title, body)
		const pdfBuffer = await this.pdfGenerator.generatePDFWithTemplate(
			templateConfig.name,
			payload
		)

		const uploadResult = await this.storage.uploadTemplatePdf(
			user.id,
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
	@Get(':template/definition')
	async getTemplateDefinition(
		@Req() req: Request,
		@Param('template') template: string
	) {
		const templateConfig = TEMPLATE_MAP[template]
		if (!templateConfig) {
			throw new BadRequestException('Unsupported template type')
		}

		const user = await this.supabase.getUser(req)
		if (!user) {
			throw new UnauthorizedException('Authorization token required')
		}

		const definition = await this.storage.getTemplateDefinition(
			user.id,
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
	@ApiBody({ schema: { type: 'object', properties: { fields: { type: 'array' } } } })
	@ApiResponse({ status: 200, description: 'Template definition saved' })
	@Post(':template/definition')
	async saveTemplateDefinition(
		@Req() req: Request,
		@Param('template') template: string,
		@Body() body: { fields?: unknown[] }
	) {
		const templateConfig = TEMPLATE_MAP[template]
		if (!templateConfig) {
			throw new BadRequestException('Unsupported template type')
		}

		const user = await this.supabase.getUser(req)
		if (!user) {
			throw new UnauthorizedException('Authorization token required')
		}

		const fields = Array.isArray(body?.fields) ? body.fields : []
		const uploadResult = await this.storage.uploadTemplateDefinition(
			user.id,
			templateConfig.name,
			{ fields }
		)

		return {
			path: uploadResult.path,
			bucket: uploadResult.bucket
		}
	}

	private buildTemplatePayload(
		fallbackTitle: string,
		body: DocumentTemplatePayload
	): Record<string, unknown> {
		return {
			templateTitle: body.templateTitle || fallbackTitle,
			generatedAt: new Date().toISOString().split('T')[0],
			state: body.state || 'CA',
			branding: body.branding || {},
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
