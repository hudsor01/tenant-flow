import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async create(createInvoiceDto: CreateInvoiceDto, request?: Request) {
    const {
      items,
      emailCapture,
      userTier = 'FREE_TIER',
      taxRate = 0,
      ...invoiceData
    } = createInvoiceDto;

    // Validate required fields
    if (!invoiceData.businessName || !invoiceData.clientName) {
      throw new BadRequestException(
        'Business name and client name are required',
      );
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('At least one invoice item is required');
    }

    // Check usage limits for free tier
    if (userTier === 'FREE_TIER' && request) {
      const ip =
        request.ip ??
        (request.connection as { remoteAddress?: string })?.remoteAddress;
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const monthlyUsage = await this.prisma.customerInvoice.count({
        where: {
          ipAddress: ip,
          createdAt: {
            gte: startOfMonth,
          },
        },
      });

      if (monthlyUsage >= 5) {
        throw new ConflictException(
          'Monthly invoice limit reached. Please upgrade to Starter.',
        );
      }
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      return sum + item.quantity * item.unitPrice;
    }, 0);

    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Generate unique invoice number if not provided
    const invoiceNumber =
      invoiceData.invoiceNumber ||
      `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create invoice with items in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the invoice
      const invoice = await tx.customerInvoice.create({
        data: {
          invoiceNumber,
          businessName: invoiceData.businessName,
          businessEmail: invoiceData.businessEmail,
          businessAddress: invoiceData.businessAddress,
          businessCity: invoiceData.businessCity,
          businessState: invoiceData.businessState,
          businessZip: invoiceData.businessZip,
          businessPhone: invoiceData.businessPhone,
          clientName: invoiceData.clientName,
          clientEmail: invoiceData.clientEmail,
          clientAddress: invoiceData.clientAddress,
          clientCity: invoiceData.clientCity,
          clientState: invoiceData.clientState,
          clientZip: invoiceData.clientZip,
          dueDate:
            invoiceData.dueDate ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: new Decimal(subtotal),
          taxRate: new Decimal(taxRate),
          taxAmount: new Decimal(taxAmount),
          total: new Decimal(total),
          notes: invoiceData.notes,
          terms: invoiceData.terms,
          emailCaptured: emailCapture?.email,
          isProVersion: userTier === 'PRO_TIER',
          ipAddress:
            request?.ip ||
            (request?.connection as { remoteAddress?: string })?.remoteAddress,
          userAgent: request?.headers?.['user-agent'] as string,
          status: 'DRAFT',
        },
      });

      // Create invoice items
      const invoiceItems = await Promise.all(
        items.map((item) =>
          tx.customerInvoiceItem.create({
            data: {
              invoiceId: invoice.id,
              description: item.description,
              quantity: new Decimal(item.quantity),
              unitPrice: new Decimal(item.unitPrice),
              total: new Decimal(item.quantity * item.unitPrice),
            },
          }),
        ),
      );

      // Create lead capture record if email provided
      if (emailCapture?.email) {
        await tx.invoiceLeadCapture
          .create({
            data: {
              email: emailCapture.email,
              invoiceId: invoice.id,
              firstName: emailCapture.firstName,
              lastName: emailCapture.lastName,
              company: emailCapture.company,
              source: emailCapture.source || 'invoice-generator',
              medium: 'organic',
            },
          })
          .catch((error) => {
            // Don't fail the transaction if lead capture fails
            console.warn(
              'Failed to create lead capture:',
              error instanceof Error ? error.message : 'Unknown error',
            );
          });
      }

      return {
        ...invoice,
        items: invoiceItems,
      };
    });

    // Send welcome email if email captured (don't await to avoid blocking)
    if (emailCapture?.email) {
      try {
        this.sendWelcomeEmail(emailCapture, invoiceNumber, total);
      } catch (error) {
        console.warn(
          'Failed to send welcome email:',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
    }

    return {
      success: true,
      id: result.id,
      invoiceNumber: result.invoiceNumber,
      downloadUrl: `/api/invoices/${result.id}/pdf`,
      total: result.total,
      status: result.status,
    };
  }

  async findOne(id: string) {
    return this.prisma.customerInvoice.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });
  }

  async findAll(skip = 0, take = 10) {
    return this.prisma.customerInvoice.findMany({
      skip,
      take,
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private sendWelcomeEmail(
    emailCapture: { email: string; firstName?: string },
    invoiceNumber: string,
    total: number,
  ): void {
    // This would integrate with your email service (Resend, etc.)
    // For now, just log
    console.log('Sending welcome email to:', emailCapture.email, {
      invoiceNumber,
      total,
      firstName: emailCapture.firstName,
    });

    // TODO: Implement actual email sending
    // await this.emailService.sendWelcomeEmail({
    //   to: emailCapture.email,
    //   firstName: emailCapture.firstName,
    //   invoiceNumber,
    //   total,
    // });
  }
}
