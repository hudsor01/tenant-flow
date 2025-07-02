import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInDays, format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { logger } from '@/lib/logger';

interface LeaseExpirationAlert {
  id: string;
  leaseId: string;
  tenantId: string;
  propertyName: string;
  unitNumber: string;
  tenantName: string;
  tenantEmail: string;
  currentRentAmount: number;
  leaseStartDate: string;
  leaseEndDate: string;
  daysUntilExpiration: number;
  alertType: 'renewal_opportunity' | 'expiring_soon' | 'expired' | 'notice_period';
  status: 'pending' | 'sent' | 'acknowledged' | 'action_taken';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  sentAt?: string;
  acknowledgedAt?: string;
}

interface LeaseExpirationSettings {
  enableAlerts: boolean;
  renewalNoticeAdvance: number; // Days before expiration to start renewal process
  expirationWarningAdvance: number; // Days before expiration for urgent alerts
  autoSendAlerts: boolean;
  includeWeekends: boolean;
  escalationThreshold: number; // Days before expiration for escalation
}

const DEFAULT_SETTINGS: LeaseExpirationSettings = {
  enableAlerts: true,
  renewalNoticeAdvance: 90, // 3 months advance notice
  expirationWarningAdvance: 30, // 1 month urgent warning
  autoSendAlerts: false,
  includeWeekends: true,
  escalationThreshold: 14, // 2 weeks for critical escalation
};

export function useLeaseExpirationAlerts() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Get all leases and calculate expiration alerts
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['leaseExpirationAlerts', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      // Get all active leases with tenant and property information
      const { data: leases, error } = await supabase
        .from('Lease')
        .select(`
          *,
          tenant:Tenant!inner (
            id,
            name,
            email,
            phone
          ),
          unit:Unit!inner (
            id,
            unitNumber,
            rent,
            property:Property!inner (
              id,
              name,
              address,
              ownerId
            )
          )
        `)
        .eq('status', 'ACTIVE')
        .eq('unit.property.ownerId', user.id)
        .order('endDate', { ascending: true });

      if (error) {
        logger.error('Failed to fetch leases for expiration alerts', error);
        throw error;
      }

      const today = new Date();
      const alerts: LeaseExpirationAlert[] = [];
      const settings = DEFAULT_SETTINGS; // TODO: Get from user preferences

      leases?.forEach((lease) => {
        const endDate = new Date(lease.endDate);
        const daysUntilExpiration = differenceInDays(endDate, today);
        
        // Skip leases that are already expired beyond grace period
        if (daysUntilExpiration < -30) return;

        let alertType: LeaseExpirationAlert['alertType'];
        let priority: LeaseExpirationAlert['priority'];

        if (daysUntilExpiration < 0) {
          alertType = 'expired';
          priority = 'critical';
        } else if (daysUntilExpiration <= settings.escalationThreshold) {
          alertType = 'expiring_soon';
          priority = 'critical';
        } else if (daysUntilExpiration <= settings.expirationWarningAdvance) {
          alertType = 'notice_period';
          priority = 'high';
        } else if (daysUntilExpiration <= settings.renewalNoticeAdvance) {
          alertType = 'renewal_opportunity';
          priority = 'medium';
        } else {
          // Too early for alerts
          return;
        }

        alerts.push({
          id: `${lease.id}-${format(endDate, 'yyyy-MM-dd')}`,
          leaseId: lease.id,
          tenantId: lease.tenantId,
          propertyName: lease.unit.property.name,
          unitNumber: lease.unit.unitNumber,
          tenantName: lease.tenant.name,
          tenantEmail: lease.tenant.email,
          currentRentAmount: lease.rentAmount,
          leaseStartDate: lease.startDate,
          leaseEndDate: lease.endDate,
          daysUntilExpiration,
          alertType,
          status: 'pending', // TODO: Check if alert already sent
          priority,
          createdAt: new Date().toISOString(),
        });
      });

      return alerts.sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
    },
    enabled: !!user?.id,
    refetchInterval: 1000 * 60 * 60 * 6, // Refetch every 6 hours
  });

  // Send lease expiration alert
  const sendAlertMutation = useMutation({
    mutationFn: async (alert: LeaseExpirationAlert) => {
      const { error } = await supabase.functions.invoke('send-lease-expiration-alert', {
        body: {
          tenantEmail: alert.tenantEmail,
          tenantName: alert.tenantName,
          propertyName: alert.propertyName,
          unitNumber: alert.unitNumber,
          currentRentAmount: alert.currentRentAmount,
          leaseEndDate: alert.leaseEndDate,
          daysUntilExpiration: alert.daysUntilExpiration,
          alertType: alert.alertType,
          priority: alert.priority,
        },
      });

      if (error) {
        logger.error('Failed to send lease expiration alert', error);
        throw new Error(error.message);
      }

      return { ...alert, status: 'sent' as const, sentAt: new Date().toISOString() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaseExpirationAlerts'] });
      logger.info('Lease expiration alert sent successfully');
    },
  });

  // Send bulk alerts
  const sendBulkAlertsMutation = useMutation({
    mutationFn: async (alertIds: string[]) => {
      const targetAlerts = alerts.filter(a => alertIds.includes(a.id));
      const results = await Promise.allSettled(
        targetAlerts.map(alert => sendAlertMutation.mutateAsync(alert))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { successful, failed, total: targetAlerts.length };
    },
    onSuccess: (results) => {
      if (results.failed === 0) {
        logger.info(`Successfully sent ${results.successful} lease expiration alerts`);
      } else {
        logger.warn(`Sent ${results.successful} alerts, ${results.failed} failed`);
      }
    },
  });

  // Mark alert as acknowledged (tenant responded or action taken)
  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      // TODO: Update alert status in database
      logger.info('Lease expiration alert acknowledged', undefined, { alertId });
      return alertId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaseExpirationAlerts'] });
    },
  });

  // Statistics for dashboard
  const stats = {
    totalAlerts: alerts.length,
    renewalOpportunities: alerts.filter(a => a.alertType === 'renewal_opportunity').length,
    noticePeriod: alerts.filter(a => a.alertType === 'notice_period').length,
    expiringSoon: alerts.filter(a => a.alertType === 'expiring_soon').length,
    expired: alerts.filter(a => a.alertType === 'expired').length,
    criticalAlerts: alerts.filter(a => a.priority === 'critical').length,
    totalRentAtRisk: alerts
      .filter(a => a.daysUntilExpiration <= 30)
      .reduce((sum, a) => sum + a.currentRentAmount, 0),
    avgLeaseLength: alerts.length > 0 
      ? alerts.reduce((sum, a) => {
          const start = new Date(a.leaseStartDate);
          const end = new Date(a.leaseEndDate);
          return sum + differenceInDays(end, start);
        }, 0) / alerts.length / 365 
      : 0,
  };

  return {
    alerts,
    stats,
    isLoading,
    sendAlert: sendAlertMutation.mutate,
    sendBulkAlerts: sendBulkAlertsMutation.mutate,
    acknowledgeAlert: acknowledgeAlertMutation.mutate,
    isSending: sendAlertMutation.isPending || sendBulkAlertsMutation.isPending,
  };
}

export function useLeaseExpirationSettings() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Get user's lease expiration settings
  const { data: settings = DEFAULT_SETTINGS } = useQuery({
    queryKey: ['leaseExpirationSettings', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      // TODO: Get from user_settings table
      return DEFAULT_SETTINGS;
    },
    enabled: !!user?.id,
  });

  // Update settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<LeaseExpirationSettings>) => {
      // TODO: Update user_settings table
      logger.info('Lease expiration settings updated', undefined, { settings: newSettings });
      return { ...settings, ...newSettings };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaseExpirationSettings'] });
      queryClient.invalidateQueries({ queryKey: ['leaseExpirationAlerts'] });
    },
  });

  return {
    settings,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
  };
}

// Helper function to get recommended actions for each alert type
export function getRecommendedActions(alert: LeaseExpirationAlert): string[] {
  switch (alert.alertType) {
    case 'renewal_opportunity':
      return [
        'Contact tenant to discuss lease renewal',
        'Review market rates for rent adjustment',
        'Prepare renewal lease documents',
        'Schedule property inspection if needed',
      ];
    case 'notice_period':
      return [
        'Send formal lease renewal notice',
        'Negotiate new lease terms',
        'Set deadline for tenant response',
        'Begin preparing for potential vacancy',
      ];
    case 'expiring_soon':
      return [
        'Urgent: Contact tenant immediately',
        'Finalize renewal or prepare for move-out',
        'Schedule move-out inspection if not renewing',
        'List property for new tenants if needed',
      ];
    case 'expired':
      return [
        'Critical: Address holdover tenancy',
        'Review local tenant laws',
        'Consult legal counsel if necessary',
        'Document all communications',
      ];
    default:
      return ['Review lease status and take appropriate action'];
  }
}