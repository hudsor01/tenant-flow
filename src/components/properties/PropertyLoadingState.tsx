import React from 'react';

/**
 * Loading state component for property detail page
 * Shows skeleton animation while property data is being fetched
 */
export default function PropertyLoadingState() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center space-x-4">
        <div className="h-10 w-10 bg-gray-200 rounded" />
        <div className="h-8 bg-gray-200 rounded w-64" />
      </div>
      <div className="h-64 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}