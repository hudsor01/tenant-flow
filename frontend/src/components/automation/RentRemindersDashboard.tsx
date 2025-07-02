import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRentReminders } from '@/hooks/useRentReminders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Bell, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  Mail, 
  Send
} from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { toast } from 'sonner';

const reminderTypeConfig = {
  upcoming: {
    icon: Clock,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: 'Upcoming',
  },
  due: {
    icon: AlertCircle,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    label: 'Due Today',
  },
  overdue: {
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Overdue',
  },
};

export default function RentRemindersDashboard() {
  const { reminders, stats, isLoading, sendReminder, sendBulkReminders, isSending } = useRentReminders();
  const [selectedReminders, setSelectedReminders] = useState<string[]>([]);

  const handleSelectReminder = (reminderId: string, checked: boolean) => {
    if (checked) {
      setSelectedReminders([...selectedReminders, reminderId]);
    } else {
      setSelectedReminders(selectedReminders.filter(id => id !== reminderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReminders(reminders.map(r => r.id));
    } else {
      setSelectedReminders([]);
    }
  };

  const handleSendSelected = () => {
    if (selectedReminders.length === 0) {
      toast.error('Please select at least one reminder to send');
      return;
    }

    sendBulkReminders(selectedReminders);
    setSelectedReminders([]);
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM dd, yyyy');
  };

  const getDaysLabel = (daysToDue: number) => {
    if (daysToDue === 0) return 'Due today';
    if (daysToDue === 1) return 'Due tomorrow';
    if (daysToDue > 0) return `Due in ${daysToDue} days`;
    return `${Math.abs(daysToDue)} days overdue`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-muted-foreground">Total Reminders</span>
              </div>
              <div className="text-2xl font-bold">{stats.totalReminders}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-muted-foreground">Due Today</span>
              </div>
              <div className="text-2xl font-bold">{stats.dueToday}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-muted-foreground">Overdue</span>
              </div>
              <div className="text-2xl font-bold">{stats.overdue}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
              </div>
              <div className="text-2xl font-bold">${stats.totalRentAmount.toLocaleString()}</div>
              {stats.overdueAmount > 0 && (
                <div className="text-sm text-red-600">
                  ${stats.overdueAmount.toLocaleString()} overdue
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Reminders List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Rent Reminders
              </CardTitle>
              <CardDescription>
                Manage and send rent payment reminders to tenants
              </CardDescription>
            </div>
            {reminders.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAll(selectedReminders.length !== reminders.length)}
                >
                  {selectedReminders.length === reminders.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  onClick={handleSendSelected}
                  disabled={selectedReminders.length === 0 || isSending}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Selected ({selectedReminders.length})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No reminders needed</h3>
              <p className="text-sm text-muted-foreground">
                All rent payments are up to date. Great job!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reminders.map((reminder, index) => {
                const config = reminderTypeConfig[reminder.reminderType];
                const Icon = config.icon;
                
                return (
                  <motion.div
                    key={reminder.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-lg border ${config.bg} ${config.border}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedReminders.includes(reminder.id)}
                          onCheckedChange={(checked) => 
                            handleSelectReminder(reminder.id, checked as boolean)
                          }
                        />
                        <Icon className={`h-5 w-5 ${config.color}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{reminder.tenantName}</span>
                            <Badge variant="outline" className={config.color}>
                              {config.label}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {reminder.propertyName} • {getDaysLabel(reminder.daysToDue)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-medium">${reminder.rentAmount.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">
                            Due {formatDueDate(reminder.dueDate)}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendReminder(reminder)}
                          disabled={isSending}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Send
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}