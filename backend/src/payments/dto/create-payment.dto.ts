import { PaymentType, PaymentStatus } from '@prisma/client';

export class CreatePaymentDto {
  leaseId: string;
  amount: number;
  date: string;
  type: PaymentType;
  status?: PaymentStatus;
  notes?: string;
}

export class UpdatePaymentDto {
  amount?: number;
  date?: string;
  type?: PaymentType;
  status?: PaymentStatus;
  notes?: string;
}

export interface PaymentQuery {
  page?: number;
  limit?: number;
  leaseId?: string;
  status?: PaymentStatus;
  startDate?: string;
  endDate?: string;
}
