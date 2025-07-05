import {
	Controller,
	Post,
	Get,
	Param,
	Body,
	Req,
	Res,
	HttpException,
	HttpStatus
} from '@nestjs/common'
import type { Response, Request } from 'express'
import type { InvoicesService } from './invoices.service'
import type { CreateInvoiceDto } from './dto/create-invoice.dto'

@Controller('api/invoices')
export class InvoicesController {
	constructor(private readonly invoicesService: InvoicesService) {}

	@Post('generate')
	async generate(
		@Body() createInvoiceDto: CreateInvoiceDto,
		@Req() request: Request
	) {
		try {
			return await this.invoicesService.create(createInvoiceDto, request)
} catch (error) {
if (
error &&
typeof error === 'object' &&
'code' in error &&
(error as { code: string }).code === 'P2002'
) {
throw new HttpException(
'Invoice number already exists',
HttpStatus.CONFLICT
)
}
throw error
}
	}

	@Post()
	async create(
		@Body() createInvoiceDto: CreateInvoiceDto,
		@Req() request: Request
	) {
		return this.generate(createInvoiceDto, request)
	}

	@Get()
	async findAll() {
		return this.invoicesService.findAll()
	}

	@Get(':id')
	async findOne(@Param('id') id: string) {
		const invoice = await this.invoicesService.findOne(id)
		if (!invoice) {
			throw new HttpException('Invoice not found', HttpStatus.NOT_FOUND)
		}
		return invoice
	}

	@Get(':id/pdf')
	async downloadPdf(@Param('id') id: string, @Res() res: Response) {
		const invoice = await this.invoicesService.findOne(id)

		if (!invoice) {
			throw new HttpException('Invoice not found', HttpStatus.NOT_FOUND)
		}

		try {
			const pdfBuffer = await this.invoicesService.generatePdf(invoice)
			
			res.set({
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
				'Content-Length': pdfBuffer.length.toString(),
				'Cache-Control': 'private, max-age=0, no-cache'
			})
			
			res.send(pdfBuffer)
} catch {
throw new HttpException(
'Failed to generate PDF',
HttpStatus.INTERNAL_SERVER_ERROR
)
}
	}
}
