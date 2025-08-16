import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, MapPin, Users, DollarSign, TrendingUp, Eye, Edit, Trash2 } from 'lucide-react';
import { mockProperties, mockActions } from '../utils/mockData';
import { BusinessComponentErrorBoundary } from '../utils/GranularErrorBoundaries';

const meta = {
  title: 'Business Components/Property Card',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Property card component with real-world data and interactions.',
      },
    },
  },
  decorators: [
    (Story) => (
      <BusinessComponentErrorBoundary>
        <Story />
      </BusinessComponentErrorBoundary>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// Property Card Component
interface PropertyCardProps {
  property: typeof mockProperties[0];
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onView = () => {},
  onEdit = () => {},
  onDelete = () => {},
  showActions = true,
}) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'vacant': return 'bg-yellow-100 text-yellow-800';
      case 'maintenance': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300" data-testid={`property-card-${property.id}`}>
      {/* Property Image/Header */}
      <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <Building className="h-16 w-16 text-blue-500/50" />
        </div>
        <div className="absolute top-4 left-4">
          <Badge className={getStatusColor(property.status)}>
            {property.status}
          </Badge>
        </div>
        <div className="absolute top-4 right-4">
          <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md">
            <span className="text-sm font-semibold text-gray-800">
              {property.occupancyRate}% occupied
            </span>
          </div>
        </div>
      </div>

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{property.name}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {property.address}
            </CardDescription>
          </div>
          {showActions && (
            <div className="flex gap-1 ml-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onView(property.id)}
                data-testid={`view-${property.id}`}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(property.id)}
                data-testid={`edit-${property.id}`}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(property.id)}
                data-testid={`delete-${property.id}`}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Type:</span>
              <span className="font-medium">{property.type}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Units:</span>
              <span className="font-medium flex items-center gap-1">
                <Users className="h-3 w-3" />
                {property.units}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Rent:</span>
              <span className="font-medium flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                ${property.rent.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Occupied:</span>
              <span className="font-medium text-green-600">
                {property.occupied}/{property.units}
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Info */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Monthly Revenue</span>
            <span className="font-semibold text-green-600 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              ${(property.rent * property.occupied).toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-4">
        <Button 
          className="w-full" 
          onClick={() => onView(property.id)}
          data-testid={`view-details-${property.id}`}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};

// Stories
export const SingleProperty: Story = {
  render: () => (
    <div className="max-w-sm">
      <PropertyCard
        property={mockProperties[0]}
        onView={fn()}
        onEdit={fn()}
        onDelete={fn()}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Test property card interactions
    const viewButton = canvas.getByTestId('view-details-1');
    await userEvent.click(viewButton);
    
    // Test action buttons
    const editButton = canvas.getByTestId('edit-1');
    await userEvent.click(editButton);
  },
};

export const PropertyGrid: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {mockProperties.map(property => (
        <PropertyCard
          key={property.id}
          property={property}
          onView={mockActions.onPropertyClick}
          onEdit={mockActions.onEditClick.bind(null, 'property')}
          onDelete={mockActions.onDeleteClick.bind(null, 'property')}
        />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Test multiple property interactions
    const cards = canvas.getAllByTestId(/property-card-/);
    expect(cards).toHaveLength(3);
    
    // Test first property
    const firstCard = canvas.getByTestId('property-card-1');
    expect(firstCard).toBeInTheDocument();
    
    // Test actions on multiple cards
    const viewButtons = canvas.getAllByTestId(/view-details-/);
    await userEvent.click(viewButtons[0]);
    await userEvent.click(viewButtons[1]);
  },
};

export const EmptyState: Story = {
  render: () => (
    <div className="text-center py-12">
      <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-600 mb-2">No Properties Found</h3>
      <p className="text-gray-500 mb-6">Get started by adding your first property</p>
      <Button onClick={fn()} data-testid="add-property">
        <Building className="h-4 w-4 mr-2" />
        Add Property
      </Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const addButton = canvas.getByTestId('add-property');
    await userEvent.click(addButton);
  },
};

export const LoadingState: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <Card key={i} className="overflow-hidden">
          <div className="aspect-video bg-gray-200 animate-pulse" />
          <CardHeader>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-3 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardContent>
          <CardFooter>
            <div className="h-10 bg-gray-200 rounded w-full animate-pulse" />
          </CardFooter>
        </Card>
      ))}
    </div>
  ),
};

export const DifferentStates: Story = {
  render: () => {
    const properties = [
      { ...mockProperties[0], status: 'Active', occupancyRate: 100 },
      { ...mockProperties[1], status: 'Vacant', occupancyRate: 0, occupied: 0 },
      { ...mockProperties[2], status: 'Maintenance', occupancyRate: 50, occupied: 6 },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {properties.map(property => (
          <PropertyCard
            key={property.id}
            property={property}
            onView={mockActions.onPropertyClick}
            onEdit={mockActions.onEditClick.bind(null, 'property')}
            onDelete={mockActions.onDeleteClick.bind(null, 'property')}
          />
        ))}
      </div>
    );
  },
};

export const WithoutActions: Story = {
  render: () => (
    <div className="max-w-sm">
      <PropertyCard
        property={mockProperties[0]}
        showActions={false}
      />
    </div>
  ),
};