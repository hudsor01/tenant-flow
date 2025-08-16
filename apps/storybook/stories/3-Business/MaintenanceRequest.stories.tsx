import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  Clock, 
  User, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  MessageSquare,
  Phone
} from 'lucide-react';
import { mockMaintenanceRequests, mockActions } from '../utils/mockData';
import { StoryErrorBoundary } from '../utils/ErrorBoundary';

const meta = {
  title: 'Business Components/Maintenance Request',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Maintenance request management with status tracking and vendor assignment.',
      },
    },
  },
  decorators: [
    (Story) => (
      <StoryErrorBoundary>
        <Story />
      </StoryErrorBoundary>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// Maintenance Request Component
interface MaintenanceRequestProps {
  request: typeof mockMaintenanceRequests[0];
  onAssignVendor?: (id: string) => void;
  onUpdateStatus?: (id: string, status: string) => void;
  onContactTenant?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  showActions?: boolean;
}

const MaintenanceRequest: React.FC<MaintenanceRequestProps> = ({
  request,
  onAssignVendor = () => {},
  onUpdateStatus = () => {},
  onContactTenant = () => {},
  onViewDetails = () => {},
  showActions = true,
}) => {
  const getPriorityConfig = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'urgent':
        return { 
          color: 'bg-red-100 text-red-800 border-red-200', 
          icon: AlertTriangle, 
          iconColor: 'text-red-600' 
        };
      case 'medium':
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
          icon: Clock, 
          iconColor: 'text-yellow-600' 
        };
      case 'low':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200', 
          icon: CheckCircle, 
          iconColor: 'text-green-600' 
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: Clock, 
          iconColor: 'text-gray-600' 
        };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return { color: 'bg-blue-100 text-blue-800', dotColor: 'bg-blue-500' };
      case 'in progress':
        return { color: 'bg-orange-100 text-orange-800', dotColor: 'bg-orange-500' };
      case 'completed':
        return { color: 'bg-green-100 text-green-800', dotColor: 'bg-green-500' };
      case 'cancelled':
        return { color: 'bg-gray-100 text-gray-800', dotColor: 'bg-gray-500' };
      default:
        return { color: 'bg-gray-100 text-gray-800', dotColor: 'bg-gray-500' };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'plumbing': return '🔧';
      case 'electrical': return '⚡';
      case 'hvac': return '🌡️';
      case 'appliance': return '🏠';
      case 'exterior': return '🏗️';
      default: return '🔧';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const priorityConfig = getPriorityConfig(request.priority);
  const statusConfig = getStatusConfig(request.status);
  const PriorityIcon = priorityConfig.icon;

  return (
    <Card 
      className="hover:shadow-lg transition-shadow duration-300 relative" 
      data-testid={`maintenance-card-${request.id}`}
    >
      {/* Priority Indicator */}
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-lg ${
        request.priority.toLowerCase() === 'high' ? 'bg-red-500' :
        request.priority.toLowerCase() === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
      }`} />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${priorityConfig.color}`}>
              <PriorityIcon className={`h-5 w-5 ${priorityConfig.iconColor}`} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {request.title}
                <span className="text-lg">{getCategoryIcon(request.category)}</span>
              </CardTitle>
              <CardDescription className="flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Unit {request.unit}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {request.tenant}
                </span>
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={statusConfig.color}>
              <div className={`w-2 h-2 rounded-full ${statusConfig.dotColor} mr-1`} />
              {request.status}
            </Badge>
            <Badge variant="outline" className={priorityConfig.color}>
              {request.priority}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-gray-700 mb-4 leading-relaxed">
          {request.description}
        </p>

        {/* Metadata */}
        <div className="flex items-center justify-between text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              {request.category}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(request.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Updated {formatTimeAgo(request.updatedAt)}</span>
          </div>
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="pt-3 gap-2">
          {request.status.toLowerCase() === 'open' && (
            <Button 
              size="sm" 
              className="flex-1"
              onClick={() => onAssignVendor(request.id)}
              data-testid={`assign-vendor-${request.id}`}
            >
              <Wrench className="h-4 w-4 mr-1" />
              Assign Vendor
            </Button>
          )}
          
          {request.status.toLowerCase() === 'in progress' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onUpdateStatus(request.id, 'completed')}
              data-testid={`complete-${request.id}`}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark Complete
            </Button>
          )}

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onContactTenant(request.id)}
            data-testid={`contact-tenant-${request.id}`}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Contact
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onViewDetails(request.id)}
            data-testid={`view-details-${request.id}`}
          >
            View Details
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

// Stories
export const SingleRequest: Story = {
  render: () => (
    <div className="max-w-2xl">
      <MaintenanceRequest
        request={mockMaintenanceRequests[0]}
        onAssignVendor={fn()}
        onUpdateStatus={fn()}
        onContactTenant={fn()}
        onViewDetails={fn()}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Test maintenance request interactions
    const assignButton = canvas.getByTestId('assign-vendor-1');
    const contactButton = canvas.getByTestId('contact-tenant-1');
    const detailsButton = canvas.getByTestId('view-details-1');
    
    await userEvent.click(assignButton);
    await userEvent.click(contactButton);
    await userEvent.click(detailsButton);
  },
};

export const RequestsList: Story = {
  render: () => (
    <div className="space-y-4">
      {mockMaintenanceRequests.map(request => (
        <MaintenanceRequest
          key={request.id}
          request={request}
          onAssignVendor={mockActions.onMaintenanceClick}
          onUpdateStatus={mockActions.onStatusChange}
          onContactTenant={mockActions.onMaintenanceClick}
          onViewDetails={mockActions.onMaintenanceClick}
        />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Test multiple maintenance requests
    const cards = canvas.getAllByTestId(/maintenance-card-/);
    expect(cards).toHaveLength(3);
    
    // Test different action buttons based on status
    const inProgressRequest = canvas.getByTestId('complete-2');
    await userEvent.click(inProgressRequest);
  },
};

export const RequestsGrid: Story = {
  render: () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {mockMaintenanceRequests.map(request => (
        <MaintenanceRequest
          key={request.id}
          request={request}
          onAssignVendor={mockActions.onMaintenanceClick}
          onUpdateStatus={mockActions.onStatusChange}
          onContactTenant={mockActions.onMaintenanceClick}
          onViewDetails={mockActions.onMaintenanceClick}
        />
      ))}
    </div>
  ),
};

export const DifferentPriorities: Story = {
  render: () => {
    const requests = [
      { ...mockMaintenanceRequests[0], priority: 'High', title: 'High Priority Issue' },
      { ...mockMaintenanceRequests[1], id: '4', priority: 'Medium', title: 'Medium Priority Issue' },
      { ...mockMaintenanceRequests[2], id: '5', priority: 'Low', title: 'Low Priority Issue' },
    ];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {requests.map(request => (
          <MaintenanceRequest
            key={request.id}
            request={request}
            onAssignVendor={mockActions.onMaintenanceClick}
            onUpdateStatus={mockActions.onStatusChange}
            onContactTenant={mockActions.onMaintenanceClick}
            onViewDetails={mockActions.onMaintenanceClick}
          />
        ))}
      </div>
    );
  },
};

export const WithoutActions: Story = {
  render: () => (
    <div className="max-w-2xl">
      <MaintenanceRequest
        request={mockMaintenanceRequests[0]}
        showActions={false}
      />
    </div>
  ),
};

export const LoadingState: Story = {
  render: () => (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <Card key={i} className="relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t-lg animate-pulse" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-12 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-12 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardContent>
          <CardFooter>
            <div className="flex gap-2 w-full">
              <div className="h-8 bg-gray-200 rounded flex-1 animate-pulse" />
              <div className="h-8 bg-gray-200 rounded flex-1 animate-pulse" />
              <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  ),
};

export const EmptyState: Story = {
  render: () => (
    <div className="text-center py-12">
      <Wrench className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-600 mb-2">No Maintenance Requests</h3>
      <p className="text-gray-500 mb-6">All caught up! No pending maintenance requests.</p>
      <Button onClick={fn()} data-testid="create-request">
        <Wrench className="h-4 w-4 mr-2" />
        Create Request
      </Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const createButton = canvas.getByTestId('create-request');
    await userEvent.click(createButton);
  },
};