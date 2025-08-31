"use client";

import React, { type FormEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DashboardFormProps {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export const DashboardForm: React.FC<DashboardFormProps> = ({
  onSubmit,
  children,
  className,
  title,
  description,
}) => {
  return (
    <div className={cn(
      "rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950",
      className
    )}>
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(event);
        }}
        className="space-y-6"
      >
        {children}
      </form>
    </div>
  );
};

// Form Field Components
interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  children,
  className,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

// Form Actions Component
interface FormActionsProps {
  children: ReactNode;
  className?: string;
}

export const FormActions: React.FC<FormActionsProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn(
      "flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700",
      className
    )}>
      {children}
    </div>
  );
};

// Property Form Example
interface PropertyFormData {
  name: string;
  address: string;
  type: string;
  units: string;
  description: string;
}

interface PropertyFormProps {
  onSubmit: (data: PropertyFormData) => void;
  initialData?: Partial<PropertyFormData>;
  isEditing?: boolean;
  className?: string;
}

export const PropertyForm: React.FC<PropertyFormProps> = ({
  onSubmit,
  initialData = {},
  isEditing = false,
  className,
}) => {
  const [formData, setFormData] = React.useState<PropertyFormData>({
    name: initialData.name || "",
    address: initialData.address || "",
    type: initialData.type || "",
    units: initialData.units || "",
    description: initialData.description || "",
  });

  const [errors, setErrors] = React.useState<Partial<PropertyFormData>>({});

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    
    // Basic validation
    const newErrors: Partial<PropertyFormData> = {};
    if (!formData.name.trim()) newErrors.name = "Property name is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.type) newErrors.type = "Property type is required";
    if (!formData.units.trim()) newErrors.units = "Number of units is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit(formData);
  };

  const handleChange = (field: keyof PropertyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <DashboardForm
      onSubmit={handleSubmit}
      title={isEditing ? "Edit Property" : "Add New Property"}
      description="Enter the details for your property listing."
      className={className}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Property Name" required error={errors.name}>
          <Input
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Enter property name"
          />
        </FormField>

        <FormField label="Property Type" required error={errors.type}>
          <Select value={formData.type} onValueChange={(value) => handleChange("type", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select property type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apartment">Apartment Complex</SelectItem>
              <SelectItem value="house">Single Family Home</SelectItem>
              <SelectItem value="condo">Condominium</SelectItem>
              <SelectItem value="townhouse">Townhouse</SelectItem>
              <SelectItem value="commercial">Commercial Property</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField label="Address" required error={errors.address}>
        <Input
          value={formData.address}
          onChange={(e) => handleChange("address", e.target.value)}
          placeholder="Enter full address"
        />
      </FormField>

      <FormField label="Number of Units" required error={errors.units}>
        <Input
          type="number"
          value={formData.units}
          onChange={(e) => handleChange("units", e.target.value)}
          placeholder="Enter number of units"
          min="1"
        />
      </FormField>

      <FormField label="Description" error={errors.description}>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Enter property description (optional)"
          rows={4}
        />
      </FormField>

      <FormActions>
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="submit">
          {isEditing ? "Update Property" : "Create Property"}
        </Button>
      </FormActions>
    </DashboardForm>
  );
};

export default DashboardForm;