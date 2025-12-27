'use client'

import { CreditCard, CheckCircle, Download } from 'lucide-react'
import Link from 'next/link'
import { BlurFade } from '#components/ui/blur-fade'
import { Button } from '#components/ui/button'
import { formatCurrency } from '#lib/formatters/currency'
import { formatDate } from '#lib/formatters/date'

interface PaymentHistoryItem {
  id: string
  amount: number
  paidDate: string
  receiptUrl?: string | undefined
}

interface PaymentHistoryCardProps {
  payments: PaymentHistoryItem[]
  onDownloadReceipt?: ((paymentId: string) => void) | undefined
}

export function PaymentHistoryCard({ payments, onDownloadReceipt }: PaymentHistoryCardProps) {
  return (
    <BlurFade delay={0.45} inView>
      <div className="bg-card border border-border rounded-lg">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-medium text-foreground">Payment History</h3>
            <p className="text-sm text-muted-foreground">Your recent payments</p>
          </div>
          <Link
            href="/tenant/payments/history"
            className="text-sm text-primary hover:underline font-medium"
          >
            View All
          </Link>
        </div>
        <div className="divide-y divide-border">
          {payments.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="text-muted-foreground">No payment history yet</p>
            </div>
          ) : (
            payments.slice(0, 5).map((payment, idx) => (
              <BlurFade key={payment.id} delay={0.5 + idx * 0.05} inView>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-success" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {formatCurrency(payment.amount / 100)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(payment.paidDate)}
                      </p>
                    </div>
                  </div>
                  {payment.receiptUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDownloadReceipt?.(payment.id)}
                      className="text-muted-foreground hover:text-primary hover:bg-primary/5"
                      aria-label={`Download receipt for payment of ${formatCurrency(payment.amount / 100)}`}
                    >
                      <Download className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </BlurFade>
            ))
          )}
        </div>
      </div>
    </BlurFade>
  )
}
