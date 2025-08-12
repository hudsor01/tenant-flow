'use client'

import { useLeases } from '@/hooks/api/use-leases'
import type { Lease } from '@repo/shared'

// Local type for what we expect from the API
type LeaseTableRow = Lease & {
  tenant?: {
    name: string
  }
  unit?: {
    unitNumber: string
    property?: {
      name: string
    }
  }
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  FileText, 
  Eye, 
  Edit3, 
  Download,
  Building,
  User,
  Calendar,
  DollarSign,
  AlertTriangle,
  Plus
} from 'lucide-react'
import Link from 'next/link'

function LeaseRow({ lease }: { lease: LeaseTableRow }) {
  // Check if lease is expiring soon (within 30 days)
  const isExpiringSoon = lease.status === 'active' && (() => {
    const endDate = new Date(lease.endDate)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return endDate <= thirtyDaysFromNow && endDate > new Date()
  })()
  
  // Check if lease is expired
  const isExpired = new Date(lease.endDate) < new Date()
  
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'expired':
        return 'destructive'
      case 'pending':
        return 'secondary'
      case 'cancelled':
        return 'outline'
      default:
        return 'secondary'
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'expired':
        return 'bg-red-500'
      case 'pending':
        return 'bg-yellow-500'
      case 'cancelled':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }
  
  return (
    <TableRow className="hover:bg-accent/50">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-medium leading-none">
              Lease #{lease.id.slice(-8)}
            </p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(lease.startDate).toLocaleDateString()} - {new Date(lease.endDate).toLocaleDateString()}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {lease.tenant ? (
          <div className="flex items-center gap-1 text-sm">
            <User className="h-3 w-3 text-muted-foreground" />
            {lease.tenant.name}
          </div>
        ) : (
          <span className="text-muted-foreground">No tenant assigned</span>
        )}
      </TableCell>
      <TableCell>
        {lease.unit?.property ? (
          <div className="flex items-center gap-1 text-sm">
            <Building className="h-3 w-3 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">{lease.unit.property.name}</p>
              <p className="text-xs text-muted-foreground">Unit {lease.unit.unitNumber}</p>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">No property assigned</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          ${lease.rentAmount?.toLocaleString() || '0'}/month
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Badge 
            variant={getStatusBadgeVariant(lease.status)}
            className={getStatusColor(lease.status)}
          >
            {lease.status}
          </Badge>
          {isExpiringSoon && (
            <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
              Expiring Soon
            </Badge>
          )}
          {isExpired && lease.status === 'active' && (
            <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
              Overdue
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Link href={`/leases/${lease.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/leases/${lease.id}/edit`}>
            <Button variant="ghost" size="sm">
              <Edit3 className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function LeasesTableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-3 w-[200px]" />
          </div>
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  )
}

export function LeasesDataTable() {
  const { data: leases, isLoading, error } = useLeases()
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leases</CardTitle>
          <CardDescription>Manage all your lease agreements</CardDescription>
        </CardHeader>
        <CardContent>
          <LeasesTableSkeleton />
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leases</CardTitle>
          <CardDescription>Manage all your lease agreements</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error loading leases</AlertTitle>
            <AlertDescription>
              There was a problem loading your leases. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }
  
  if (!leases?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leases</CardTitle>
          <CardDescription>Manage all your lease agreements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No leases yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Create your first lease agreement to start managing tenant relationships.
            </p>
            <Link href="/leases/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create First Lease
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Leases</CardTitle>
            <CardDescription>Manage all your lease agreements</CardDescription>
          </div>
          <Link href="/leases/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Lease
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lease</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leases.map((lease) => (
                <LeaseRow key={lease.id} lease={lease as LeaseTableRow} />
              ))}
            </TableBody>
          </Table>
        </div>
        
        {leases.length > 10 && (
          <div className="flex items-center justify-center pt-4">
            <Button variant="outline" size="sm">
              Load more leases
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}