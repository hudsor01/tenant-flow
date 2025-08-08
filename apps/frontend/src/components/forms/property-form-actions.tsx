'use client';

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { PropertyFormState } from '@/lib/actions/property-actions';

interface PropertyFormActionsProps {
  mode?: 'create' | 'edit';
  isPending?: boolean;
  errors?: PropertyFormState['errors'];
  onCancel?: () => void;
}

interface FormErrorDisplayProps {
  errors?: PropertyFormState['errors'];
}

function FormErrorDisplay({ errors }: FormErrorDisplayProps) {
  if (!errors?._form) {
    return null;
  }

  return (
    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg 
            className="w-5 h-5 text-destructive" 
            fill="currentColor" 
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-destructive">
            Form submission error
          </h3>
          <p className="text-sm text-destructive/80 mt-1">
            {errors._form[0]}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ActionButtonsProps {
  mode?: 'create' | 'edit';
  isPending?: boolean;
  onCancel?: () => void;
}

function ActionButtons({ mode = 'create', isPending, onCancel }: ActionButtonsProps) {
  const submitText = mode === 'create' ? 'Create Property' : 'Update Property';
  
  return (
    <div className="flex justify-end gap-3">
      {onCancel && (
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
      )}
      <Button 
        type="submit" 
        disabled={isPending}
        className="min-w-[140px]"
      >
        {isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {submitText}
      </Button>
    </div>
  );
}

export function PropertyFormActions({ 
  mode = 'create', 
  isPending, 
  errors, 
  onCancel 
}: PropertyFormActionsProps) {
  return (
    <div className="space-y-4 pt-6 border-t border-border">
      <FormErrorDisplay errors={errors} />
      <ActionButtons 
        mode={mode} 
        isPending={isPending} 
        onCancel={onCancel} 
      />
    </div>
  );
}