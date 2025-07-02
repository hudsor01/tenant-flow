import { IsString, IsEmail, IsOptional, IsNumber, IsArray, ValidateNested, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class EmailCaptureDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  source?: string;
}

export class CreateInvoiceDto {
  // Invoice Details
  @IsString()
  invoiceNumber: string;

  @IsOptional()
  dueDate?: Date;

  // Business Information
  @IsString()
  businessName: string;

  @IsEmail()
  businessEmail: string;

  @IsOptional()
  @IsString()
  businessAddress?: string;

  @IsOptional()
  @IsString()
  businessCity?: string;

  @IsOptional()
  @IsString()
  businessState?: string;

  @IsOptional()
  @IsString()
  businessZip?: string;

  @IsOptional()
  @IsString()
  businessPhone?: string;

  // Client Information
  @IsString()
  clientName: string;

  @IsEmail()
  clientEmail: string;

  @IsOptional()
  @IsString()
  clientAddress?: string;

  @IsOptional()
  @IsString()
  clientCity?: string;

  @IsOptional()
  @IsString()
  clientState?: string;

  @IsOptional()
  @IsString()
  clientZip?: string;

  // Items
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  // Financial
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  // Lead Magnet
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailCaptureDto)
  emailCapture?: EmailCaptureDto;

  @IsOptional()
  @IsString()
  userTier?: string;

  @IsOptional()
  @IsBoolean()
  isProVersion?: boolean;
}
