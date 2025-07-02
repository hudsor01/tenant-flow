import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isBefore, format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { logger } from '@/lib/logger';

interface RentReminder {
  id: string;
  leaseId: string;
  tenantId: string;
  propertyName: string;
  tenantName: string;
  tenantEmail: string;
  rentAmount: number;
  dueDate: string;
  reminderType: 'upcoming' | 'due' | 'overdue';
  daysToDue: number;
  status: 'pending' | 'sent' | 'paid';
  createdAt: string;
  sentAt?: string;
}

interface RentReminderSettings {
  enableReminders: boolean;
  daysBeforeDue: number; // Days before rent is due to send reminder
  enableOverdueReminders: boolean;
  overdueGracePeriod: number; // Days after due date before overdue reminders
  autoSendReminders: boolean;
}

const DEFAULT_SETTINGS: RentReminderSettings = {
  enableReminders: true,
  daysBeforeDue: 3,
  enableOverdueReminders: true,
  overdueGracePeriod: 5,
  autoSendReminders: false, // Manual approval by default
};

export function useRentReminders() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Get all active leases and calculate rent reminders needed
  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['rentReminders', user?.id],
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
            email
          ),
          unit:Unit!inner (
            id,
            unitNumber,
            property:Property!inner (
              id,
              name,
              address,
              ownerId
            )
          )
        `)
        .eq('status', 'ACTIVE')
        .eq('unit.property.ownerId', user.id);

      if (error) {
        logger.error('Failed to fetch leases for rent reminders', error);
        throw error;
      }

      const today = new Date();
      const reminders: RentReminder[] = [];

      leases?.forEach((lease) => {
        // Calculate next rent due date (assuming monthly rent on the same day each month)
        const leaseStart = new Date(lease.startDate);
        const dayOfMonth = leaseStart.getDate();
        
        // Get current month's due date
        let currentDueDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
        
        // If this month's due date has passed, calculate next month
        if (isBefore(currentDueDate, today)) {
          currentDueDate = new Date(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
        }

        const daysToDue = Math.ceil((currentDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let reminderType: 'upcoming' | 'due' | 'overdue';
        if (daysToDue < 0) {
          reminderType = 'overdue';
        } else if (daysToDue === 0) {
          reminderType = 'due';
        } else {
          reminderType = 'upcoming';
        }

        // Only create reminders for upcoming (within threshold) or overdue rents
        const settings = DEFAULT_SETTINGS; // TODO: Get from user preferences
        const shouldCreateReminder = 
          (reminderType === 'upcoming' && daysToDue <= settings.daysBeforeDue) ||
          (reminderType === 'due') ||
          (reminderType === 'overdue' && Math.abs(daysToDue) <= settings.overdueGracePeriod);

        if (shouldCreateReminder) {
          reminders.push({
            id: `${lease.id}-${format(currentDueDate, 'yyyy-MM-dd')}`,
            leaseId: lease.id,
            tenantId: lease.tenantId,
            propertyName: lease.unit.property.name,
            tenantName: lease.tenant.name,
            tenantEmail: lease.tenant.email,
            rentAmount: lease.rentAmount,
            dueDate: currentDueDate.toISOString(),
            reminderType,
            daysToDue,
            status: 'pending', // TODO: Check if reminder already sent
            createdAt: new Date().toISOString(),
          });
        }
      });

      return reminders.sort((a, b) => a.daysToDue - b.daysToDue);
    },
    enabled: !!user?.id,
    refetchInterval: 1000 * 60 * 60, // Refetch every hour
  });

  // Send rent reminder email
  const sendReminderMutation = useMutation({
    mutationFn: async (reminder: RentReminder) => {
      const { error } = await supabase.functions.invoke('send-rent-reminder', {
        body: {
          tenantEmail: reminder.tenantEmail,
          tenantName: reminder.tenantName,
          propertyName: reminder.propertyName,
          rentAmount: reminder.rentAmount,
          dueDate: reminder.dueDate,
          reminderType: reminder.reminderType,
          daysToDue: reminder.daysToDue,
        },
      });

      if (error) {
        logger.error('Failed to send rent reminder', error);
        throw new Error(error.message);
      }

      return { ...reminder, status: 'sent' as const, sentAt: new Date().toISOString() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentReminders'] });
      logger.info('Rent reminder sent successfully');
    },
  });

  // Send multiple reminders
  const sendBulkRemindersMutation = useMutation({
    mutationFn: async (reminderIds: string[]) => {
      const targetReminders = reminders.filter(r => reminderIds.includes(r.id));
      const results = await Promise.allSettled(
        targetReminders.map(reminder => sendReminderMutation.mutateAsync(reminder))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { successful, failed, total: targetReminders.length };
    },
    onSuccess: (results) => {
      if (results.failed === 0) {
        logger.info(`Successfully sent ${results.successful} rent reminders`);
      } else {
        logger.warn(`Sent ${results.successful} reminders, ${results.failed} failed`);
      }
    },
  });

  // Statistics for the dashboard
  const stats = {
    totalReminders: reminders.length,
    upcomingReminders: reminders.filter(r => r.reminderType === 'upcoming').length,
    dueToday: reminders.filter(r => r.reminderType === 'due').length,
    overdue: reminders.filter(r => r.reminderType === 'overdue').length,
    totalRentAmount: reminders.reduce((sum, r) => sum + r.rentAmount, 0),
    overdueAmount: reminders
      .filter(r => r.reminderType === 'overdue')
      .reduce((sum, r) => sum + r.rentAmount, 0),
  };

  return {
    reminders,
    stats,
    isLoading,
    sendReminder: sendReminderMutation.mutate,
    sendBulkReminders: sendBulkRemindersMutation.mutate,
    isSending: sendReminderMutation.isPending || sendBulkRemindersMutation.isPending,
  };
}

export function useRentReminderSettings() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Get user's rent reminder settings
  const { data: settings = DEFAULT_SETTINGS } = useQuery({
    queryKey: ['rentReminderSettings', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      // TODO: Create a user_settings table to store preferences
      // For now, return default settings
      return DEFAULT_SETTINGS;
    },
    enabled: !!user?.id,
  });

  // Update rent reminder settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<RentReminderSettings>) => {
      // TODO: Update user_settings table
      logger.info('Rent reminder settings updated', undefined, { settings: newSettings });
      return { ...settings, ...newSettings };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentReminderSettings'] });
    },
  });

  return {
    settings,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
  };
}