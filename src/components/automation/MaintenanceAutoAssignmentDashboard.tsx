import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMaintenanceAutoAssignment } from '@/hooks/useMaintenanceAutoAssignment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Wrench, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Star,
  Zap
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const priorityConfig = {
  'EMERGENCY': { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Emergency' },
  'HIGH': { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: 'High' },
  'MEDIUM': { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Medium' },
  'LOW': { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Low' },
};

const availabilityConfig = {
  available: { color: 'bg-green-100 text-green-800', label: 'Available' },
  busy: { color: 'bg-yellow-100 text-yellow-800', label: 'Busy' },
  unavailable: { color: 'bg-red-100 text-red-800', label: 'Unavailable' },
};

export default function MaintenanceAutoAssignmentDashboard() {
  const { 
    pendingRequests, 
    stats, 
    isLoading, 
    getAssignmentRecommendations,
    autoAssign,
    bulkAutoAssign,
    isAssigning 
  } = useMaintenanceAutoAssignment();
  
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [expandedRequests, setExpandedRequests] = useState<string[]>([]);
  const [selectedRequestForRecommendations, setSelectedRequestForRecommendations] = useState<string | null>(null);

  const handleSelectRequest = (requestId: string, checked: boolean) => {
    if (checked) {
      setSelectedRequests([...selectedRequests, requestId]);
    } else {
      setSelectedRequests(selectedRequests.filter(id => id !== requestId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRequests(pendingRequests.map(r => r.id));
    } else {
      setSelectedRequests([]);
    }
  };

  const handleBulkAutoAssign = () => {
    if (selectedRequests.length === 0) {
      toast.error('Please select at least one request to auto-assign');
      return;
    }

    bulkAutoAssign(selectedRequests);
    setSelectedRequests([]);
  };

  const toggleExpanded = (requestId: string) => {
    if (expandedRequests.includes(requestId)) {
      setExpandedRequests(expandedRequests.filter(id => id !== requestId));
    } else {
      setExpandedRequests([...expandedRequests, requestId]);
    }
  };

  const handleViewRecommendations = (requestId: string) => {
    setSelectedRequestForRecommendations(requestId);
  };

  const renderContractorRecommendations = (requestId: string) => {
    const request = pendingRequests.find(r => r.id === requestId);
    if (!request) return null;

    const recommendations = getAssignmentRecommendations(request);
    
    return (
      <div className="mt-4 space-y-3">
        <h4 className="font-medium text-sm">🎯 Recommended Contractors</h4>
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No suitable contractors available</p>
        ) : (
          recommendations.slice(0, 3).map((rec) => (
            <div key={rec.contractorId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{rec.contractor.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{rec.contractor.name}</span>
                    <Badge className={`text-xs ${availabilityConfig[rec.contractor.availability].color}`}>
                      {availabilityConfig[rec.contractor.availability].label}
                    </Badge>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Star className="h-3 w-3 mr-1 fill-current text-yellow-500" />
                      {rec.contractor.rating.toFixed(1)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Score: {rec.score.toFixed(0)}/100 • {rec.reasons.slice(0, 2).join(', ')}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => autoAssign({ requestId, contractorId: rec.contractorId })}
                disabled={isAssigning}
              >
                Assign
              </Button>
            </div>
          ))
        )}
      </div>
    );
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
                <Wrench className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-muted-foreground">Pending Requests</span>
              </div>
              <div className="text-2xl font-bold">{stats.totalPendingRequests}</div>
              {stats.emergencyRequests > 0 && (
                <div className="text-sm text-red-600">
                  {stats.emergencyRequests} emergency
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
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-muted-foreground">Available Contractors</span>
              </div>
              <div className="text-2xl font-bold">{stats.availableContractors}</div>
              <div className="text-sm text-muted-foreground">
                + {stats.busyContractors} busy
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
                <Star className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-muted-foreground">Avg Rating</span>
              </div>
              <div className="text-2xl font-bold">{stats.avgContractorRating.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">
                Out of 5.0 stars
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
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-muted-foreground">Avg Response</span>
              </div>
              <div className="text-2xl font-bold">{stats.avgResponseTime.toFixed(1)}h</div>
              <div className="text-sm text-muted-foreground">
                Average response time
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Pending Maintenance Requests
              </CardTitle>
              <CardDescription>
                Automatically assign contractors to pending maintenance requests
              </CardDescription>
            </div>
            {pendingRequests.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAll(selectedRequests.length !== pendingRequests.length)}
                >
                  {selectedRequests.length === pendingRequests.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  onClick={handleBulkAutoAssign}
                  disabled={selectedRequests.length === 0 || isAssigning}
                  size="sm"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Auto-Assign Selected ({selectedRequests.length})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">All requests assigned</h3>
              <p className="text-sm text-muted-foreground">
                No pending maintenance requests need contractor assignment. Great job staying on top of maintenance!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => {
                const config = priorityConfig[request.priority];
                const Icon = config.icon;
                const isExpanded = expandedRequests.includes(request.id);
                
                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                  >
                    <Collapsible>
                      <div className={`rounded-lg border ${config.bg} ${config.border}`}>
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={selectedRequests.includes(request.id)}
                                onCheckedChange={(checked) => 
                                  handleSelectRequest(request.id, checked as boolean)
                                }
                              />
                              <Icon className={`h-5 w-5 ${config.color}`} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{request.category}</span>
                                  <Badge variant="outline" className={config.color}>
                                    {config.label}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {request.property.name} {request.unit && `- Unit ${request.unit.unitNumber}`}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Submitted {formatDistanceToNow(new Date(request.createdAt))} ago
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <div className="font-medium">
                                  {request.tenant ? request.tenant.name : 'No tenant'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(request.createdAt), 'MMM dd, yyyy')}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleExpanded(request.id)}
                                  >
                                    {isExpanded ? 'Less' : 'More'}
                                  </Button>
                                </CollapsibleTrigger>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewRecommendations(request.id)}
                                >
                                  <Zap className="h-4 w-4 mr-2" />
                                  Auto-Assign
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <CollapsibleContent>
                          <div className="px-4 pb-4 border-t border-border/50">
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                              <div>
                                <h4 className="font-medium text-sm mb-2">Request Details</h4>
                                <div className="text-sm text-muted-foreground space-y-1">
                                  <div><strong>Description:</strong> {request.description}</div>
                                  <div><strong>Status:</strong> {request.status}</div>
                                  {request.tenant && (
                                    <div><strong>Tenant:</strong> {request.tenant.email}</div>
                                  )}
                                </div>
                              </div>
                              <div>
                                {selectedRequestForRecommendations === request.id && 
                                  renderContractorRecommendations(request.id)
                                }
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