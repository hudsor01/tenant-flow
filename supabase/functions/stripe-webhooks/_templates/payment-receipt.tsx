// Tenant payment receipt email template.
// Shows amount paid, property address, unit, payment date, period, and payment method.
// Includes itemized breakdown when a late fee was included.
// Uses "Payment Successful" messaging regardless of overdue status.

import * as React from 'npm:react@18.3.1'
import {
  Text,
  Heading,
  Hr,
  Section,
} from 'npm:@react-email/components@0.0.22'
import { EmailLayout } from './email-layout.tsx'

export interface PaymentReceiptProps {
  tenantName: string
  amount: string
  propertyAddress: string
  unitNumber: string | null
  paymentDate: string
  periodMonth: string
  periodYear: string
  paymentMethodLast4: string | null
  lateFeeAmount: string | null
  baseRentAmount: string | null
}

export const PaymentReceipt = ({
  tenantName,
  amount,
  propertyAddress,
  unitNumber,
  paymentDate,
  periodMonth,
  periodYear,
  paymentMethodLast4,
  lateFeeAmount,
  baseRentAmount,
}: PaymentReceiptProps) => {
  const hasLateFee = lateFeeAmount !== null && baseRentAmount !== null
  const locationText = unitNumber
    ? `${propertyAddress} - ${unitNumber}`
    : propertyAddress

  return (
    <EmailLayout previewText={`Payment Receipt - ${periodMonth} ${periodYear}`}>
      <Heading style={heading}>Payment Successful</Heading>

      <Text style={greeting}>Hi {tenantName},</Text>
      <Text style={paragraph}>
        Your rent payment has been processed successfully. Here are the details:
      </Text>

      <Section style={detailsBox}>
        {hasLateFee ? (
          <>
            <Text style={detailRow}>
              <span style={detailLabel}>Base rent:</span>{' '}
              <span style={detailValue}>{baseRentAmount}</span>
            </Text>
            <Text style={detailRow}>
              <span style={detailLabel}>Late fee:</span>{' '}
              <span style={detailValue}>{lateFeeAmount}</span>
            </Text>
            <Hr style={thinDivider} />
            <Text style={detailRow}>
              <span style={detailLabel}>Total paid:</span>{' '}
              <span style={totalValue}>{amount}</span>
            </Text>
          </>
        ) : (
          <Text style={detailRow}>
            <span style={detailLabel}>Amount paid:</span>{' '}
            <span style={totalValue}>{amount}</span>
          </Text>
        )}
        <Text style={detailRow}>
          <span style={detailLabel}>Property:</span>{' '}
          <span style={detailValue}>{locationText}</span>
        </Text>
        <Text style={detailRow}>
          <span style={detailLabel}>Period:</span>{' '}
          <span style={detailValue}>{periodMonth} {periodYear}</span>
        </Text>
        <Text style={detailRow}>
          <span style={detailLabel}>Date:</span>{' '}
          <span style={detailValue}>{paymentDate}</span>
        </Text>
        {paymentMethodLast4 ? (
          <Text style={detailRow}>
            <span style={detailLabel}>Paid with:</span>{' '}
            <span style={detailValue}>Card ending in {paymentMethodLast4}</span>
          </Text>
        ) : null}
      </Section>

      <Text style={closingText}>
        Thank you for your payment. No further action is needed.
      </Text>
    </EmailLayout>
  )
}

const heading: React.CSSProperties = {
  color: '#1e3a5f',
  fontSize: '20px',
  fontWeight: '600',
  margin: '16px 0 8px 0',
}

const greeting: React.CSSProperties = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 8px 0',
}

const paragraph: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 16px 0',
}

const detailsBox: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
  padding: '16px 20px',
  margin: '0 0 16px 0',
}

const detailRow: React.CSSProperties = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '28px',
  margin: '0',
}

const detailLabel: React.CSSProperties = {
  color: '#6b7280',
  fontWeight: '400',
}

const detailValue: React.CSSProperties = {
  color: '#374151',
  fontWeight: '500',
}

const totalValue: React.CSSProperties = {
  color: '#1e3a5f',
  fontWeight: '700',
  fontSize: '16px',
}

const thinDivider: React.CSSProperties = {
  borderColor: '#e5e7eb',
  borderWidth: '1px 0 0 0',
  margin: '8px 0',
}

const closingText: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
}
