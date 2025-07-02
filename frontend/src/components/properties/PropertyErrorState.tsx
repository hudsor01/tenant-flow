import React from 'react';
import { Button } from '@/components/ui/button';
import { Building2, ArrowLeft } from 'lucide-react';

interface PropertyErrorStateProps {
  onBackToProperties: () => void;
}

/**
 * Error state component for property detail page
 * Displays when property is not found or fails to load
 */
export default function PropertyErrorState({ onBackToProperties }: PropertyErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px]">
      <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">Property not found</h3>
      <p className="text-muted-foreground mt-2">The property you're looking for doesn't exist.</p>
      <Button onClick={onBackToProperties} className="mt-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Properties
      </Button>
    </div>
  );
}