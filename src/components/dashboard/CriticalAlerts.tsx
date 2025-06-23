import React from 'react'
import { AlertTriangle, Clock, Wrench, DollarSign, ChevronRight, Home, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { useUpcomingRentAlerts, useRentAlertCounts } from '../../hooks/useUpcomingRentAlerts'
import { useMaintenanceAlerts, useMaintenanceAlertCounts } from '../../hooks/useMaintenanceAlerts'
import { cn } from '../../lib/utils'

const severityColors = {
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800'
}

const severityBadgeColors = {
  error: 'bg-red-100 text-red-700 border-red-300',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  info: 'bg-blue-100 text-blue-700 border-blue-300'
}

function RentAlert({ alert }: { alert: unknown }) {
  return (
    <div className={cn(
      "p-4 rounded-lg border transition-all duration-200 hover:shadow-md",
      severityColors[alert.severity]
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            alert.severity === 'error' ? 'bg-red-100' : 
            alert.severity === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
          )}>
            <DollarSign className={cn(
              "w-4 h-4",
              alert.severity === 'error' ? 'text-red-600' : 
              alert.severity === 'warning' ? 'text-yellow-600' : 'text-blue-600'
            )} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-sm">{alert.title}</h4>
              <Badge variant="outline" className={cn("text-xs", severityBadgeColors[alert.severity])}>
                {alert.type.replace('_', ' ')}
              </Badge>
            </div>
            
            <p className="text-sm opacity-90 mb-2">{alert.message}</p>
            
            <div className="flex flex-wrap gap-2 text-xs opacity-75">
              <span className="flex items-center space-x-1">
                <Home className="w-3 h-3" />
                <span>{alert.property.name} - Unit {alert.unit.unitNumber}</span>
              </span>
              <span className="flex items-center space-x-1">
                <User className="w-3 h-3" />
                <span>{alert.tenant.name}</span>
              </span>
              <span className="flex items-center space-x-1">
                <DollarSign className="w-3 h-3" />
                <span>${alert.lease.rentAmount}</span>
              </span>
            </div>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" className="opacity-75 hover:opacity-100">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

function MaintenanceAlert({ alert }: { alert: unknown }) {
  return (
    <div className={cn(
      "p-4 rounded-lg border transition-all duration-200 hover:shadow-md",
      severityColors[alert.severity]
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            alert.severity === 'error' ? 'bg-red-100' : 
            alert.severity === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
          )}>
            <Wrench className={cn(
              "w-4 h-4",
              alert.severity === 'error' ? 'text-red-600' : 
              alert.severity === 'warning' ? 'text-yellow-600' : 'text-blue-600'
            )} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-sm">{alert.title}</h4>
              <Badge variant="outline" className={cn("text-xs", severityBadgeColors[alert.severity])}>
                {alert.priority}
              </Badge>
            </div>
            
            <p className="text-sm opacity-90 mb-2">{alert.message}</p>
            
            <div className="flex flex-wrap gap-2 text-xs opacity-75">
              <span className="flex items-center space-x-1">
                <Home className="w-3 h-3" />
                <span>{alert.property.name} - Unit {alert.unit.unitNumber}</span>
              </span>
              {alert.tenant && (
                <span className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span>{alert.tenant.name}</span>
                </span>
              )}
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{alert.daysOld} days old</span>
              </span>
            </div>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" className="opacity-75 hover:opacity-100">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

export function CriticalAlerts() {
  const { data: rentAlerts = [], isLoading: rentLoading } = useUpcomingRentAlerts()
  const { data: maintenanceAlerts = [], isLoading: maintenanceLoading } = useMaintenanceAlerts()
  const rentCounts = useRentAlertCounts()
  const maintenanceCounts = useMaintenanceAlertCounts()

  const isLoading = rentLoading || maintenanceLoading
  const allAlerts = [...rentAlerts, ...maintenanceAlerts]
    .sort((a, b) => {
      // Sort by severity first (error > warning > info)
      const severityOrder = { error: 0, warning: 1, info: 2 }
      const aSeverity = severityOrder[a.severity as keyof typeof severityOrder]
      const bSeverity = severityOrder[b.severity as keyof typeof severityOrder]
      
      if (aSeverity !== bSeverity) return aSeverity - bSeverity
      
      // Then by creation date (newest first)
      return new Date(b.createdAt || b.dueDate).getTime() - new Date(a.createdAt || a.dueDate).getTime()
    })
    .slice(0, 10) // Show top 10 critical alerts

  const totalCritical = rentCounts.critical + maintenanceCounts.critical
  const totalWarnings = rentCounts.warnings + maintenanceCounts.warnings

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Critical Alerts</span>
          </div>
          <div className="flex items-center space-x-2">
            {totalCritical > 0 && (
              <Badge variant="destructive" className="text-xs">
                {totalCritical} Critical
              </Badge>
            )}
            {totalWarnings > 0 && (
              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
                {totalWarnings} Warnings
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          Urgent items requiring immediate attention: rent collection and maintenance requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border animate-pulse">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : allAlerts.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-green-600 font-medium">All Good!</p>
            <p className="text-sm text-gray-500 mt-1">
              No critical alerts at this time
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {allAlerts.map((alert) => (
                alert.lease ? (
                  <RentAlert key={alert.id} alert={alert} />
                ) : (
                  <MaintenanceAlert key={alert.id} alert={alert} />
                )
              ))}
            </div>
          </ScrollArea>
        )}
        
        {allAlerts.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                {rentAlerts.length} rent alerts, {maintenanceAlerts.length} maintenance alerts
              </span>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                View All Alerts
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}