import { Controller, Post, Get, Param, Body, Req, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Controller('api/invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('generate')
  async generate(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @Req() request: Request,
  ) {
    try {
      return await this.invoicesService.create(createInvoiceDto, request);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new HttpException(
          'Invoice number already exists',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  @Post()
  async create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @Req() request: Request,
  ) {
    return this.generate(createInvoiceDto, request);
  }

  @Get()
  async findAll() {
    return this.invoicesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const invoice = await this.invoicesService.findOne(id);
    if (!invoice) {
      throw new HttpException('Invoice not found', HttpStatus.NOT_FOUND);
    }
    return invoice;
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const invoice = await this.invoicesService.findOne(id);
    
    if (!invoice) {
      throw new HttpException('Invoice not found', HttpStatus.NOT_FOUND);
    }

    // For now, return a simple response
    // TODO: Implement actual PDF generation
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
    });
    
    res.json({
      message: 'PDF generation not implemented yet',
      invoice: invoice.invoiceNumber,
      downloadUrl: `/api/invoices/${id}/pdf`,
    });
  }
}
