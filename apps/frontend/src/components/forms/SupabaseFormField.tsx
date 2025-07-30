import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface BaseFieldProps<TFieldValues extends FieldValues = FieldValues> {
  name: FieldPath<TFieldValues>
  control: Control<TFieldValues>
  label?: string
  placeholder?: string
  description?: string
  className?: string
  disabled?: boolean
  required?: boolean
}

interface TextFieldProps<TFieldValues extends FieldValues = FieldValues> 
  extends BaseFieldProps<TFieldValues> {
  type?: 'text' | 'email' | 'password' | 'tel' | 'url'
  multiline?: boolean
  rows?: number
}

interface NumberFieldProps<TFieldValues extends FieldValues = FieldValues> 
  extends BaseFieldProps<TFieldValues> {
  type: 'number'
  min?: number
  max?: number
  step?: number
}

interface SelectFieldProps<TFieldValues extends FieldValues = FieldValues> 
  extends BaseFieldProps<TFieldValues> {
  type: 'select'
  options: Array<{ value: string; label: string; disabled?: boolean }>
}

interface CheckboxFieldProps<TFieldValues extends FieldValues = FieldValues> 
  extends BaseFieldProps<TFieldValues> {
  type: 'checkbox'
}

interface SwitchFieldProps<TFieldValues extends FieldValues = FieldValues> 
  extends BaseFieldProps<TFieldValues> {
  type: 'switch'
}

type SupabaseFormFieldProps<TFieldValues extends FieldValues = FieldValues> = 
  | TextFieldProps<TFieldValues>
  | NumberFieldProps<TFieldValues>
  | SelectFieldProps<TFieldValues>
  | CheckboxFieldProps<TFieldValues>
  | SwitchFieldProps<TFieldValues>

export function SupabaseFormField<TFieldValues extends FieldValues = FieldValues>({
  name,
  control,
  label,
  placeholder,
  description,
  className,
  disabled = false,
  required = false,
  ...props
}: SupabaseFormFieldProps<TFieldValues>) {
  const {
    field,
    fieldState: { error, invalid }
  } = useController({
    name,
    control,
    rules: { required: required ? `${label || name} is required` : false }
  })

  const fieldId = `field-${String(name)}`
  const hasError = invalid && error

  const renderField = () => {
    switch (props.type) {
      case 'number':
        return (
          <Input
            {...field}
            id={fieldId}
            type="number"
            placeholder={placeholder}
            disabled={disabled}
            min={props.min}
            max={props.max}
            step={props.step}
            value={field.value || ''}
            onChange={(e) => {
              const value = e.target.value
              field.onChange(value === '' ? undefined : Number(value))
            }}
            className={cn(
              hasError && 'border-destructive focus-visible:ring-destructive',
              className
            )}
          />
        )

      case 'select':
        return (
          <Select
            value={field.value || ''}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger
              id={fieldId}
              className={cn(
                hasError && 'border-destructive focus-visible:ring-destructive',
                className
              )}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {props.options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={fieldId}
              checked={field.value || false}
              onCheckedChange={field.onChange}
              disabled={disabled}
              className={cn(
                hasError && 'border-destructive data-[state=checked]:bg-destructive',
                className
              )}
            />
            {label && (
              <Label
                htmlFor={fieldId}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </Label>
            )}
          </div>
        )

      case 'switch':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={fieldId}
              checked={field.value || false}
              onCheckedChange={field.onChange}
              disabled={disabled}
              className={className}
            />
            {label && (
              <Label
                htmlFor={fieldId}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </Label>
            )}
          </div>
        )

      default:
        // Text, email, password, tel, url, or multiline
        if (props.multiline) {
          return (
            <Textarea
              {...field}
              id={fieldId}
              placeholder={placeholder}
              disabled={disabled}
              rows={props.rows || 3}
              value={field.value || ''}
              className={cn(
                hasError && 'border-destructive focus-visible:ring-destructive',
                className
              )}
            />
          )
        }

        return (
          <Input
            {...field}
            id={fieldId}
            type={props.type || 'text'}
            placeholder={placeholder}
            disabled={disabled}
            value={field.value || ''}
            className={cn(
              hasError && 'border-destructive focus-visible:ring-destructive',
              className
            )}
          />
        )
    }
  }

  // For checkbox and switch, label is handled within the field
  if (props.type === 'checkbox' || props.type === 'switch') {
    return (
      <div className="space-y-2">
        {renderField()}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {hasError && (
          <p className="text-sm text-destructive">{error.message}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={fieldId}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {renderField()}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {hasError && (
        <p className="text-sm text-destructive">{error.message}</p>
      )}
    </div>
  )
}

// Specialized field components for common Supabase types
export function PropertyTypeField<TFieldValues extends FieldValues = FieldValues>({
  ...props
}: Omit<SelectFieldProps<TFieldValues>, 'type' | 'options'>) {
  return (
    <SupabaseFormField
      {...props}
      type="select"
      options={[
        { value: 'SINGLE_FAMILY', label: 'Single Family Home' },
        { value: 'MULTI_UNIT', label: 'Multi-Unit Building' },
        { value: 'APARTMENT', label: 'Apartment Complex' },
        { value: 'COMMERCIAL', label: 'Commercial Property' }
      ]}
    />
  )
}

export function UnitStatusField<TFieldValues extends FieldValues = FieldValues>({
  ...props
}: Omit<SelectFieldProps<TFieldValues>, 'type' | 'options'>) {
  return (
    <SupabaseFormField
      {...props}
      type="select"
      options={[
        { value: 'VACANT', label: 'Vacant' },
        { value: 'OCCUPIED', label: 'Occupied' },
        { value: 'MAINTENANCE', label: 'Under Maintenance' },
        { value: 'RESERVED', label: 'Reserved' }
      ]}
    />
  )
}

export function LeaseStatusField<TFieldValues extends FieldValues = FieldValues>({
  ...props
}: Omit<SelectFieldProps<TFieldValues>, 'type' | 'options'>) {
  return (
    <SupabaseFormField
      {...props}
      type="select"
      options={[
        { value: 'DRAFT', label: 'Draft' },
        { value: 'ACTIVE', label: 'Active' },
        { value: 'EXPIRED', label: 'Expired' },
        { value: 'TERMINATED', label: 'Terminated' }
      ]}
    />
  )
}

export function PriorityField<TFieldValues extends FieldValues = FieldValues>({
  ...props
}: Omit<SelectFieldProps<TFieldValues>, 'type' | 'options'>) {
  return (
    <SupabaseFormField
      {...props}
      type="select"
      options={[
        { value: 'LOW', label: 'Low Priority' },
        { value: 'MEDIUM', label: 'Medium Priority' },
        { value: 'HIGH', label: 'High Priority' },
        { value: 'URGENT', label: 'Urgent' },
        { value: 'EMERGENCY', label: 'Emergency' }
      ]}
    />
  )
}