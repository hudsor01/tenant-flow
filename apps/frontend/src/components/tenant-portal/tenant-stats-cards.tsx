'use client'

import {
  CreditCard,
  Wrench,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import { NumberTicker } from '#components/ui/number-ticker'
import {
  Stat,
  StatLabel,
  StatValue,
  StatDescription,
  StatIndicator,
} from '#components/ui/stat'
import { formatDate } from '#lib/formatters/date'

export type RentStatus = 'upcoming' | 'due_today' | 'overdue' | 'paid'

interface TenantStatsCardsProps {
  nextPaymentAmount: number
  nextPaymentDueDate: string
  rentStatus: RentStatus
  daysUntilDue: number
  openRequestsCount: number
  documentsCount: number
}

function getRentStatusIndicator(status: RentStatus) {
  const config = {
    upcoming: {
      className: 'text-muted-foreground',
      icon: Clock,
      label: 'Upcoming',
    },
    due_today: {
      className: 'text-warning',
      icon: AlertCircle,
      label: 'Due Today',
    },
    overdue: {
      className: 'text-destructive',
      icon: AlertCircle,
      label: 'Overdue',
    },
    paid: {
      className: 'text-success',
      icon: CheckCircle,
      label: 'Paid',
    },
  }

  const { className, icon: Icon, label } = config[status]

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${className}`}>
      <Icon className="w-4 h-4" aria-hidden="true" />
      {label}
    </span>
  )
}

function getRentStatusText(status: RentStatus, daysUntilDue: number): string {
  switch (status) {
    case 'upcoming':
      return `Due in ${daysUntilDue} days`
    case 'due_today':
      return 'Due today'
    case 'overdue':
      return `${Math.abs(daysUntilDue)} days overdue`
    case 'paid':
      return 'Paid'
  }
}

export function TenantStatsCards({
  nextPaymentAmount,
  nextPaymentDueDate,
  rentStatus,
  daysUntilDue,
  openRequestsCount,
  documentsCount,
}: TenantStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Next Payment Card */}
      <BlurFade delay={0.2} inView>
        <Stat className="relative overflow-hidden">
          {rentStatus !== 'paid' && (
            <BorderBeam
              size={80}
              duration={8}
              colorFrom="hsl(var(--primary))"
              colorTo="hsl(var(--primary) / 0.3)"
            />
          )}
          <StatLabel>Next Payment</StatLabel>
          <StatValue className="flex items-baseline gap-0.5">
            <span className="text-lg">$</span>
            <NumberTicker value={nextPaymentAmount / 100} duration={1000} />
          </StatValue>
          <StatIndicator variant="icon" color="primary">
            <CreditCard aria-hidden="true" />
          </StatIndicator>
          <StatDescription>Due {formatDate(nextPaymentDueDate)}</StatDescription>
        </Stat>
      </BlurFade>

      {/* Payment Status Card */}
      <BlurFade delay={0.25} inView>
        <Stat className="relative overflow-hidden">
          {rentStatus === 'overdue' && (
            <BorderBeam
              size={80}
              duration={4}
              colorFrom="hsl(var(--destructive))"
              colorTo="hsl(var(--destructive) / 0.3)"
            />
          )}
          {rentStatus === 'due_today' && (
            <BorderBeam
              size={80}
              duration={6}
              colorFrom="hsl(45 93% 47%)"
              colorTo="hsl(45 93% 47% / 0.3)"
            />
          )}
          {rentStatus === 'paid' && (
            <BorderBeam
              size={80}
              duration={10}
              colorFrom="hsl(142 76% 36%)"
              colorTo="hsl(142 76% 36% / 0.3)"
            />
          )}
          <StatLabel>Payment Status</StatLabel>
          <StatValue
            className={`text-xl ${
              rentStatus === 'paid'
                ? 'text-success'
                : rentStatus === 'overdue'
                  ? 'text-destructive'
                  : rentStatus === 'due_today'
                    ? 'text-warning'
                    : ''
            }`}
          >
            {getRentStatusIndicator(rentStatus)}
          </StatValue>
          <StatIndicator
            variant="icon"
            color={
              rentStatus === 'paid'
                ? 'success'
                : rentStatus === 'overdue'
                  ? 'error'
                  : rentStatus === 'due_today'
                    ? 'warning'
                    : 'muted'
            }
          >
            {rentStatus === 'paid' ? (
              <CheckCircle aria-hidden="true" />
            ) : (
              <Clock aria-hidden="true" />
            )}
          </StatIndicator>
          <StatDescription>{getRentStatusText(rentStatus, daysUntilDue)}</StatDescription>
        </Stat>
      </BlurFade>

      {/* Open Requests Card */}
      <BlurFade delay={0.3} inView>
        <Stat className="relative overflow-hidden">
          {openRequestsCount > 0 && (
            <BorderBeam
              size={80}
              duration={6}
              colorFrom="hsl(45 93% 47%)"
              colorTo="hsl(45 93% 47% / 0.3)"
            />
          )}
          <StatLabel>Open Requests</StatLabel>
          <StatValue
            className={`flex items-baseline ${openRequestsCount > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}
          >
            <NumberTicker value={openRequestsCount} duration={800} />
          </StatValue>
          <StatIndicator variant="icon" color={openRequestsCount > 0 ? 'warning' : 'muted'}>
            <Wrench aria-hidden="true" />
          </StatIndicator>
          <StatDescription>Maintenance requests</StatDescription>
        </Stat>
      </BlurFade>

      {/* Documents Card */}
      <BlurFade delay={0.35} inView>
        <Stat>
          <StatLabel>Documents</StatLabel>
          <StatValue className="flex items-baseline">
            <NumberTicker value={documentsCount} duration={800} />
          </StatValue>
          <StatIndicator variant="icon" color="muted">
            <FileText aria-hidden="true" />
          </StatIndicator>
          <StatDescription>Available files</StatDescription>
        </Stat>
      </BlurFade>
    </div>
  )
}
