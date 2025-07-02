import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useProperties } from '@/hooks/useApiProperties';
import PropertyFormModal from '@/components/properties/PropertyFormModal';
import PropertyCard from '@/components/properties/PropertyCard';
import type { Property } from '@/types/entities';

const PropertiesPage: React.FC = () => {
  const { data: properties = [], isLoading, error } = useProperties();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | undefined>(undefined);
  const navigate = useNavigate();

  const handleAddProperty = () => {
    setEditingProperty(undefined);
    setIsModalOpen(true);
  };

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setIsModalOpen(true);
  };

  const handleViewProperty = (property: Property) => {
    navigate(`/properties/${property.id}`);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProperty(undefined);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold">Error loading properties</div>
          <p className="text-muted-foreground mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <div className="flex justify-between items-center">
        <motion.h1
          className="text-3xl font-bold tracking-tight text-foreground"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          Properties
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            data-testid="add-property-button"
            onClick={handleAddProperty}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-sans"
          >
            <PlusCircle className="mr-2 h-5 w-5" /> Add Property
          </Button>
        </motion.div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Properties Grid */}
      {!isLoading && properties.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <PropertyCard
                property={property}
                onEdit={(property: PropertyWithUnits) => handleEditProperty(property as Property)}
                onView={handleViewProperty}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && properties.length === 0 && (
        <motion.div
          className="text-center py-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="mx-auto h-32 w-32 text-muted-foreground mb-4">
            <Building2 className="h-full w-full" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">No properties found</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Get started by adding your first property to begin managing your real estate portfolio.
          </p>
          <Button
            onClick={handleAddProperty}
            className="mt-6"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Your First Property
          </Button>
        </motion.div>
      )}

      {/* Property Form Modal */}
      <PropertyFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        property={editingProperty}
        mode={editingProperty ? 'edit' : 'create'}
      />
    </div>
  );
};

export default PropertiesPage;
