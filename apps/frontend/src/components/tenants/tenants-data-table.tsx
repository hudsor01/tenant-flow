'use client'

import { useTenants } from '@/hooks/api/use-tenants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  Users, 
  Eye, 
  Edit3, 
  Mail,
  Phone,
  Building,
  Calendar,
  AlertTriangle,
  Plus
} from 'lucide-react'
import Link from 'next/link'
import type { Tenant } from '@repo/shared'

function TenantRow({ tenant }: { tenant: Tenant }) {
  const activeLease = tenant.leases?.find(lease => lease.status === 'active')
  const property = activeLease?.unit?.property
  
  // Get initials for avatar fallback
  const initials = `${tenant.firstName?.[0] || ''}${tenant.lastName?.[0] || ''}`.toUpperCase()
  
  // Check if lease is expiring soon (within 30 days)
  const isExpiringSoon = activeLease && (() => {
    const endDate = new Date(activeLease.endDate)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return endDate <= thirtyDaysFromNow && endDate > new Date()
  })()
  
  return (
    <TableRow className="hover:bg-accent/50">
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={tenant.profileImage} alt={`${tenant.firstName} ${tenant.lastName}`} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="font-medium leading-none">
              {tenant.firstName} {tenant.lastName}
            </p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Mail className="h-3 w-3" />
              {tenant.email}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {tenant.phone ? (
          <div className="flex items-center gap-1 text-sm">
            <Phone className="h-3 w-3 text-muted-foreground" />
            {tenant.phone}
          </div>
        ) : (
          <span className="text-muted-foreground">Not provided</span>
        )}
      </TableCell>
      <TableCell>
        <Badge 
          variant={tenant.status === 'active' ? "default" : "secondary"}
          className={tenant.status === 'active' ? "bg-green-500" : ""}
        >
          {tenant.status}
        </Badge>
        {isExpiringSoon && (
          <Badge variant="outline" className="ml-2 text-orange-600 border-orange-600">
            Expiring Soon
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {property ? (
          <div className="flex items-center gap-1 text-sm">
            <Building className="h-3 w-3 text-muted-foreground" />
            <span className="truncate max-w-[150px]" title={property.name}>
              {property.name}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">No active lease</span>
        )}
      </TableCell>
      <TableCell>
        {activeLease ? (
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {new Date(activeLease.endDate).toLocaleDateString()}
          </div>
        ) : (
          <span className="text-muted-foreground">N/A</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Link href={`/tenants/${tenant.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/tenants/${tenant.id}/edit`}>
            <Button variant="ghost" size="sm">
              <Edit3 className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </TableCell>
    </TableRow>
  )
}

function TenantsTableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-3 w-[150px]" />
          </div>
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

export function TenantsDataTable() {
  const { data: tenants, isLoading, error } = useTenants()
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
          <CardDescription>Manage all your tenants</CardDescription>
        </CardHeader>
        <CardContent>
          <TenantsTableSkeleton />
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
          <CardDescription>Manage all your tenants</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error loading tenants</AlertTitle>
            <AlertDescription>
              There was a problem loading your tenants. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }
  
  if (!tenants?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
          <CardDescription>Manage all your tenants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No tenants yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Get started by adding your first tenant to the system.
            </p>
            <Link href="/tenants/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add First Tenant
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
            <CardTitle>Tenants</CardTitle>
            <CardDescription>Manage all your tenants</CardDescription>
          </div>
          <Link href="/tenants/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Tenant
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Lease End</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant: Tenant) => (
                <TenantRow key={tenant.id} tenant={tenant} />
              ))}
            </TableBody>
          </Table>
        </div>
        
        {tenants.length > 10 && (
          <div className="flex items-center justify-center pt-4">
            <Button variant="outline" size="sm">
              Load more tenants
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}