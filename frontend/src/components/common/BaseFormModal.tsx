import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { modalVariants, fieldVariants } from './modal-constants';

interface BaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  children: ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  hideFooter?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md', 
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl'
};

export function BaseFormModal({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  iconBgColor = 'bg-blue-100',
  iconColor = 'text-blue-600',
  children,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  onSubmit,
  isSubmitting = false,
  submitDisabled = false,
  maxWidth = 'lg',
  hideFooter = false
}: BaseFormModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${maxWidthClasses[maxWidth]} max-h-[90vh] overflow-y-auto`}>
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <DialogHeader className="pb-4">
            <div className="flex items-center space-x-2">
              {Icon && (
                <div className={`flex items-center justify-center w-10 h-10 ${iconBgColor} rounded-lg`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
              )}
              <div className="flex-1">
                <DialogTitle className="text-xl font-bold">
                  {title}
                </DialogTitle>
                {description && (
                  <DialogDescription>
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {children}

            {!hideFooter && (
              <DialogFooter className="pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4 mr-2" />
                  {cancelLabel}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || submitDisabled}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    submitLabel
                  )}
                </Button>
              </DialogFooter>
            )}
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for form sections with consistent styling
export function FormSection({ 
  icon: Icon, 
  title, 
  children, 
  delay = 0 
}: { 
  icon: LucideIcon; 
  title: string; 
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div 
      variants={fieldVariants}
      initial="hidden"
      animate="visible"
      custom={delay}
      className="space-y-4"
    >
      <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
        <Icon className="h-4 w-4 text-gray-600" />
        <h3 className="font-medium text-gray-900">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}