"use client";

import React, { useRef, useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
  showCloseButton?: boolean;
  isFullscreen?: boolean;
  title?: string;
  description?: string;
}

export const DashboardModal: React.FC<DashboardModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
  isFullscreen = false,
  title,
  description,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const contentClasses = isFullscreen
    ? "w-full h-full"
    : "relative w-full max-w-md mx-4 sm:max-w-lg md:max-w-2xl lg:max-w-4xl";

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto z-[9999]">
      {/* Backdrop */}
      {!isFullscreen && (
        <div
          className="fixed inset-0 h-full w-full bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      
      {/* Modal Content */}
      <div
        ref={modalRef}
        className={cn(
          contentClasses,
          "relative rounded-xl bg-white shadow-xl dark:bg-gray-900",
          !isFullscreen && "max-h-[90vh] overflow-y-auto",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description || showCloseButton) && (
          <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title}
                </h3>
              )}
              {description && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-4 -mr-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={cn(
          (title || description || showCloseButton) ? "p-6" : "p-6"
        )}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Confirmation Modal Component
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          button: "bg-red-600 hover:bg-red-700 text-white",
          icon: "text-red-600",
        };
      case "warning":
        return {
          button: "bg-yellow-600 hover:bg-yellow-700 text-white",
          icon: "text-yellow-600",
        };
      default:
        return {
          button: "bg-blue-600 hover:bg-blue-700 text-white",
          icon: "text-blue-600",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <DashboardModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md"
      showCloseButton={false}
    >
      <div className="text-center">
        <div className={cn(
          "mx-auto mb-4 h-12 w-12 rounded-full flex items-center justify-center",
          variant === "danger" && "bg-red-100 dark:bg-red-900/20",
          variant === "warning" && "bg-yellow-100 dark:bg-yellow-900/20",
          variant === "info" && "bg-blue-100 dark:bg-blue-900/20"
        )}>
          {variant === "danger" && (
            <AlertTriangle className="h-6 w-6 text-red-600" />
          )}
          {variant === "warning" && (
            <AlertCircle className="h-6 w-6 text-yellow-600" />
          )}
          {variant === "info" && (
            <Info className="h-6 w-6 text-blue-600" />
          )}
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            className={styles.button}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </DashboardModal>
  );
};

// Property Delete Modal Example
interface PropertyDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  propertyName: string;
}

export const PropertyDeleteModal: React.FC<PropertyDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  propertyName,
}) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Property"
      message={`Are you sure you want to delete "${propertyName}"? This action cannot be undone and will permanently remove all associated data.`}
      confirmText="Delete Property"
      cancelText="Cancel"
      variant="danger"
    />
  );
};

export default DashboardModal;