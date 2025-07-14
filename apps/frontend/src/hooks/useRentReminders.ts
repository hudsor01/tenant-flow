// Refactored: useRentReminders now uses tRPC hooks instead of legacy apiClient

import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "../lib/trpcClient";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

interface RentReminder {
	id: string;
	leaseId: string;
	tenantId: string;
	propertyName: string;
	tenantName: string;
	tenantEmail: string;
	rentAmount: number;
	dueDate: string;
	reminderType: "upcoming" | "due" | "overdue";
	daysToDue: number;
	status: "pending" | "sent" | "paid";
	createdAt: string;
	sentAt?: string;
}

interface RentReminderSettings {
	enableReminders: boolean;
	daysBeforeDue: number;
	enableOverdueReminders: boolean;
	overdueGracePeriod: number;
	autoSendReminders: boolean;
}

const DEFAULT_SETTINGS: RentReminderSettings = {
	enableReminders: true,
	daysBeforeDue: 3,
	enableOverdueReminders: true,
	overdueGracePeriod: 5,
	autoSendReminders: false,
};

export function useRentReminders() {
	const { user } = useAuth();
	const queryClient = useQueryClient();

	// Get rent reminders from backend
	const { data: rentRemindersData, isLoading } = trpc.leases.getRentReminders.useQuery(undefined, {
		enabled: !!user?.id,
		refetchInterval: 1000 * 60 * 60,
	});

	const reminders = rentRemindersData?.reminders || [];
	const backendStats = rentRemindersData?.stats;

	// Send rent reminder email
	const sendReminderMutation = trpc.leases.sendRentReminder.useMutation({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["rentReminders"] });
		},
		onError: (error) => {
			logger.error("Failed to send rent reminder", error instanceof Error ? error : new Error(String(error)));
		},
	});

	// Send multiple reminders
	const sendBulkRemindersMutation = trpc.leases.sendBulkRentReminders.useMutation({
		onSuccess: (results) => {
			queryClient.invalidateQueries({ queryKey: ["rentReminders"] });
			if (results.failed === 0) {
				logger.info(`Successfully sent ${results.successful} rent reminders`);
			} else {
				logger.warn(`Sent ${results.successful} reminders, ${results.failed} failed`);
			}
		},
		onError: (error) => {
			logger.error("Failed to send bulk rent reminders", error instanceof Error ? error : new Error(String(error)));
		},
	});

	// Use backend stats if available, otherwise calculate from reminders
	const stats = backendStats || {
		totalReminders: reminders.length,
		upcomingReminders: reminders.filter((r) => r.reminderType === "upcoming").length,
		dueToday: reminders.filter((r) => r.reminderType === "due").length,
		overdue: reminders.filter((r) => r.reminderType === "overdue").length,
		totalRentAmount: reminders.reduce((sum, r) => sum + r.rentAmount, 0),
		overdueAmount: reminders.filter((r) => r.reminderType === "overdue").reduce((sum, r) => sum + r.rentAmount, 0),
	};

	return {
		reminders,
		stats,
		isLoading,
		sendReminder: (reminder: RentReminder) => sendReminderMutation.mutate(reminder.id),
		sendBulkReminders: (reminderIds: string[]) => sendBulkRemindersMutation.mutate(reminderIds),
		isSending: sendReminderMutation.isPending || sendBulkRemindersMutation.isPending,
	};
}

export function useRentReminderSettings() {
	const { user } = useAuth();
	const queryClient = useQueryClient();

	// Get user's rent reminder settings (local only for now)
	const settings = DEFAULT_SETTINGS;

	// Update rent reminder settings (local only for now)
	const updateSettingsMutation = {
		mutate: (newSettings: Partial<RentReminderSettings>) => {
			logger.info("Rent reminder settings updated", undefined, {
				settings: newSettings,
			});
			// No backend call; just merge and return
			return { ...settings, ...newSettings };
		},
		isPending: false,
	};

	return {
		settings,
		updateSettings: updateSettingsMutation.mutate,
		isUpdating: updateSettingsMutation.isPending,
	};
}
