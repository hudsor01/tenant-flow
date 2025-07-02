import { formatDistanceToNow } from 'date-fns';
import { Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import { getMaintenanceBadgeVariant } from '@/hooks/useTenantDetailData';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  priority?: string;
  createdAt: string;
}

interface TenantMaintenanceSectionProps {
  maintenanceRequests: MaintenanceRequest[];
}

/**
 * Tenant maintenance requests section displaying all maintenance history
 * Shows request status, priority, dates, and descriptions
 */
export default function TenantMaintenanceSection({ maintenanceRequests }: TenantMaintenanceSectionProps) {
  return (
    <TabsContent value="maintenance" className="space-y-4">
      <div className="space-y-4">
        {maintenanceRequests.map((request) => (
          <Card key={request.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-semibold">{request.title}</h4>
                    <Badge variant={getMaintenanceBadgeVariant(request.status, request.priority)}>
                      {request.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Maintenance Request
                  </p>
                  <p className="text-sm">{request.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {maintenanceRequests.length === 0 && (
        <div className="text-center py-12">
          <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No maintenance requests found</p>
        </div>
      )}
    </TabsContent>
  );
}