import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLeaseExpirationAlerts, getRecommendedActions } from '@/hooks/useLeaseExpirationAlerts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  Mail, 
  TrendingDown,
  Send,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const alertTypeConfig = {
  renewal_opportunity: {
    icon: Calendar,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: 'Renewal Opportunity',
    description: 'Good time to start renewal discussions',
  },
  notice_period: {
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    label: 'Notice Period',
    description: 'Action required soon',
  },
  expiring_soon: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    label: 'Expiring Soon',
    description: 'Urgent attention needed',
  },
  expired: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Expired',
    description: 'Immediate action required',
  },
};

const priorityConfig = {
  low: { color: 'bg-gray-100 text-gray-800', label: 'Low' },
  medium: { color: 'bg-blue-100 text-blue-800', label: 'Medium' },
  high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
  critical: { color: 'bg-red-100 text-red-800', label: 'Critical' },
};

export default function LeaseExpirationDashboard() {
  const { alerts, stats, isLoading, sendAlert, sendBulkAlerts, acknowledgeAlert, isSending } = useLeaseExpirationAlerts();
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [expandedAlerts, setExpandedAlerts] = useState<string[]>([]);

  const handleSelectAlert = (alertId: string, checked: boolean) => {
    if (checked) {
      setSelectedAlerts([...selectedAlerts, alertId]);
    } else {
      setSelectedAlerts(selectedAlerts.filter(id => id !== alertId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAlerts(alerts.map(a => a.id));
    } else {
      setSelectedAlerts([]);
    }
  };

  const handleSendSelected = () => {
    if (selectedAlerts.length === 0) {
      toast.error('Please select at least one alert to send');
      return;
    }

    sendBulkAlerts(selectedAlerts);
    setSelectedAlerts([]);
  };

  const toggleExpanded = (alertId: string) => {
    if (expandedAlerts.includes(alertId)) {
      setExpandedAlerts(expandedAlerts.filter(id => id !== alertId));
    } else {
      setExpandedAlerts([...expandedAlerts, alertId]);
    }
  };

  const formatExpirationDate = (endDate: string, daysUntil: number) => {
    const date = new Date(endDate);
    if (daysUntil < 0) {
      return `Expired ${formatDistanceToNow(date)} ago`;
    } else if (daysUntil === 0) {
      return 'Expires today';
    } else if (daysUntil === 1) {
      return 'Expires tomorrow';
    } else {
      return `Expires in ${daysUntil} days`;
    }
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
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-muted-foreground">Total Alerts</span>
              </div>
              <div className="text-2xl font-bold">{stats.totalAlerts}</div>
              {stats.criticalAlerts > 0 && (
                <div className="text-sm text-red-600">
                  {stats.criticalAlerts} critical
                </div>
              )}
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
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-muted-foreground">Expiring Soon</span>
              </div>
              <div className="text-2xl font-bold">{stats.expiringSoon}</div>
              <div className="text-sm text-muted-foreground">
                + {stats.expired} expired
              </div>
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
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-muted-foreground">Rent at Risk</span>
              </div>
              <div className="text-2xl font-bold">${stats.totalRentAtRisk.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">
                Monthly revenue at risk
              </div>
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
                <TrendingDown className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-muted-foreground">Avg Lease Length</span>
              </div>
              <div className="text-2xl font-bold">{stats.avgLeaseLength.toFixed(1)} yr</div>
              <div className="text-sm text-muted-foreground">
                Current portfolio average
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Lease Expiration Alerts
              </CardTitle>
              <CardDescription>
                Monitor and manage upcoming lease expirations
              </CardDescription>
            </div>
            {alerts.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAll(selectedAlerts.length !== alerts.length)}
                >
                  {selectedAlerts.length === alerts.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  onClick={handleSendSelected}
                  disabled={selectedAlerts.length === 0 || isSending}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Selected ({selectedAlerts.length})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">All leases are current</h3>
              <p className="text-sm text-muted-foreground">
                No lease expirations require immediate attention. Great job managing your portfolio!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert, index) => {
                const config = alertTypeConfig[alert.alertType];
                const priorityStyle = priorityConfig[alert.priority];
                const Icon = config.icon;
                const isExpanded = expandedAlerts.includes(alert.id);
                const recommendedActions = getRecommendedActions(alert);
                
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Collapsible>
                      <div className={`rounded-lg border ${config.bg} ${config.border}`}>
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={selectedAlerts.includes(alert.id)}
                                onCheckedChange={(checked) => 
                                  handleSelectAlert(alert.id, checked as boolean)
                                }
                              />
                              <Icon className={`h-5 w-5 ${config.color}`} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{alert.tenantName}</span>
                                  <Badge variant="outline" className={config.color}>
                                    {config.label}
                                  </Badge>
                                  <Badge className={priorityStyle.color}>
                                    {priorityStyle.label}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {alert.propertyName} - Unit {alert.unitNumber}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {formatExpirationDate(alert.leaseEndDate, alert.daysUntilExpiration)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <div className="font-medium">${alert.currentRentAmount.toLocaleString()}/mo</div>
                                <div className="text-sm text-muted-foreground">
                                  Expires {format(new Date(alert.leaseEndDate), 'MMM dd, yyyy')}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleExpanded(alert.id)}
                                  >
                                    {isExpanded ? 'Less' : 'More'}
                                  </Button>
                                </CollapsibleTrigger>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => sendAlert(alert)}
                                  disabled={isSending}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send Alert
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <CollapsibleContent>
                          <div className="px-4 pb-4 border-t border-border/50">
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                              <div>
                                <h4 className="font-medium text-sm mb-2">Recommended Actions</h4>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {recommendedActions.map((action, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="text-xs mt-1">•</span>
                                      {action}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-medium text-sm mb-2">Lease Information</h4>
                                <div className="text-sm text-muted-foreground space-y-1">
                                  <div>Start: {format(new Date(alert.leaseStartDate), 'MMM dd, yyyy')}</div>
                                  <div>End: {format(new Date(alert.leaseEndDate), 'MMM dd, yyyy')}</div>
                                  <div>Tenant: {alert.tenantEmail}</div>
                                  <div className="flex gap-2 mt-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => acknowledgeAlert(alert.id)}
                                    >
                                      Mark as Handled
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
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