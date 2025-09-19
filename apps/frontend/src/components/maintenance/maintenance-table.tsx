'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Eye, Trash2, Play, CheckCircle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi } from '@/lib/api-client'
import type { MaintenanceRequestUpdate } from '@repo/shared'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { MaintenanceRequestResponse } from '@repo/shared'

type MaintenanceRequestData = MaintenanceRequestResponse['data'][0]

interface MaintenanceTableProps {
  requests: MaintenanceRequestData[]
  isLoading: boolean
}

export function MaintenanceTable({ requests, isLoading }: MaintenanceTableProps) {
  const queryClient = useQueryClient()

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      maintenanceApi.update(id, { status } as MaintenanceRequestUpdate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })
      queryClient.invalidateQueries({ queryKey: ['maintenance-stats'] })
      toast.success('Status updated successfully')
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: maintenanceApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })
      queryClient.invalidateQueries({ queryKey: ['maintenance-stats'] })
      toast.success('Request deleted successfully')
    },
    onError: (error) => {
      toast.error(`Failed to delete request: ${error.message}`)
    }
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'destructive'
      case 'HIGH': return 'default'
      case 'MEDIUM': return 'secondary'
      case 'LOW': return 'outline'
      default: return 'outline'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'destructive'
      case 'IN_PROGRESS': return 'default'
      case 'COMPLETED': return 'secondary'
      case 'CANCELED': return 'outline'
      case 'ON_HOLD': return 'secondary'
      default: return 'outline'
    }
  }

  if (isLoading) {
    return <div>Loading maintenance requests...</div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Request</TableHead>
            <TableHead>Property/Unit</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Requested</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{request.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {request.description.substring(0, 60)}...
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{request.property?.name || 'Unknown Property'}</div>
                  {request.unit?.name && (
                    <div className="text-sm text-muted-foreground">
                      Unit {request.unit.name}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>{request.category}</TableCell>
              <TableCell>
                <Badge variant={getPriorityColor(request.priority)}>
                  {request.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusColor(request.status)}>
                  {request.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                {format(new Date(request.createdAt), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>
                {request.estimatedCost
                  ? `$${request.estimatedCost.toLocaleString()}`
                  : '-'
                }
              </TableCell>
              <TableCell className="space-x-2">
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>

                {request.status === 'OPEN' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({
                      id: request.id,
                      status: 'IN_PROGRESS'
                    })}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                )}

                {request.status === 'IN_PROGRESS' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({
                      id: request.id,
                      status: 'COMPLETED'
                    })}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                )}

                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate(request.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
