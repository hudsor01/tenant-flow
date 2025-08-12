'use client'

import { useProperties } from '@/hooks/api/use-properties'
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
  Building2, 
  Eye, 
  Edit3, 
  Users, 
  MapPin, 
  Home,
  AlertTriangle,
  Plus
} from 'lucide-react'
import Link from 'next/link'
import type { Property } from '@repo/shared'

function PropertyRow({ property }: { property: Property }) {
  const totalUnits = property.units?.length || 0
  const occupiedUnits = property.units?.filter(unit => unit.status === 'OCCUPIED').length || 0
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
  
  return (
    <TableRow className="hover:bg-accent/50">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-medium leading-none">{property.name}</p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {property.address}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="capitalize">
          {property.propertyType}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Home className="h-3 w-3 text-muted-foreground" />
          {totalUnits}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-muted-foreground" />
          {occupiedUnits}
        </div>
      </TableCell>
      <TableCell>
        <Badge 
          variant={occupancyRate >= 90 ? "default" : occupancyRate >= 70 ? "secondary" : "destructive"}
        >
          {occupancyRate}%
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Link href={`/properties/${property.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/properties/${property.id}/edit`}>
            <Button variant="ghost" size="sm">
              <Edit3 className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </TableCell>
    </TableRow>
  )
}

function PropertiesTableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-3 w-[150px]" />
          </div>
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

export function PropertiesDataTable() {
  const { data: properties, isLoading, error } = useProperties()
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Properties</CardTitle>
          <CardDescription>Manage all your rental properties</CardDescription>
        </CardHeader>
        <CardContent>
          <PropertiesTableSkeleton />
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Properties</CardTitle>
          <CardDescription>Manage all your rental properties</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error loading properties</AlertTitle>
            <AlertDescription>
              There was a problem loading your properties. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }
  
  if (!properties?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Properties</CardTitle>
          <CardDescription>Manage all your rental properties</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No properties yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Get started by adding your first rental property to the system.
            </p>
            <Link href="/properties/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add First Property
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
            <CardTitle>Properties</CardTitle>
            <CardDescription>Manage all your rental properties</CardDescription>
          </div>
          <Link href="/properties/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Tenants</TableHead>
                <TableHead>Occupancy</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((property: Property) => (
                <PropertyRow key={property.id} property={property} />
              ))}
            </TableBody>
          </Table>
        </div>
        
        {properties.length > 10 && (
          <div className="flex items-center justify-center pt-4">
            <Button variant="outline" size="sm">
              Load more properties
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}