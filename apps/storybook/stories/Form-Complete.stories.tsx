import type { Meta, StoryObj } from '@storybook/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';


import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../apps/frontend/src/components/ui/form';
import { Input } from '../../../apps/frontend/src/components/ui/input';
import { Textarea } from '../../../apps/frontend/src/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../apps/frontend/src/components/ui/select';
import { Checkbox } from '../../../apps/frontend/src/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../../../apps/frontend/src/components/ui/radio-group';
import { Switch } from '../../../apps/frontend/src/components/ui/switch';
import { Button } from '../../../apps/frontend/src/components/ui/button';

const meta: Meta<typeof Form> = {
  title: 'UI/Form System',
  component: Form,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic Form Structure
export const BasicFormStructure: Story = {
  render: () => (
    <div className="w-96 space-y-6">
      <h3 className="text-lg font-semibold">Form Component Structure</h3>
      <Form>
        <FormItem>
          <FormLabel>Input Field</FormLabel>
          <FormControl>
            <Input placeholder="Enter text here" />
          </FormControl>
          <FormDescription>
            This is a basic form field with label and description.
          </FormDescription>
          <FormMessage />
        </FormItem>

        <FormItem>
          <FormLabel>Email Field</FormLabel>
          <FormControl>
            <Input type="email" placeholder="user@example.com" />
          </FormControl>
          <FormDescription>
            We'll never share your email with anyone.
          </FormDescription>
          <FormMessage />
        </FormItem>

        <FormItem>
          <FormLabel>Textarea Field</FormLabel>
          <FormControl>
            <Textarea placeholder="Enter your message here..." />
          </FormControl>
          <FormDescription>
            Describe your request in detail.
          </FormDescription>
          <FormMessage />
        </FormItem>
      </Form>
    </div>
  ),
};

// Property Creation Form Schema
const propertyFormSchema = z.object({
  name: z.string().min(1, 'Property name is required').max(100, 'Name too long'),
  address: z.string().min(1, 'Address is required'),
  type: z.enum(['apartment', 'house', 'condo', 'townhouse']),
  bedrooms: z.coerce.number().min(0, 'Must be 0 or more').max(10, 'Maximum 10 bedrooms'),
  bathrooms: z.coerce.number().min(0.5, 'Must be at least 0.5').max(10, 'Maximum 10 bathrooms'),
  rentAmount: z.coerce.number().min(0, 'Rent must be positive'),
  deposit: z.coerce.number().min(0, 'Deposit must be positive'),
  description: z.string().max(500, 'Description too long').optional(),
  amenities: z.array(z.string()).optional(),
  petsAllowed: z.boolean().default(false),
  furnished: z.boolean().default(false),
  utilitiesIncluded: z.boolean().default(false),
  availableDate: z.string().min(1, 'Available date is required'),
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

// Property Creation Form
export const PropertyCreationForm: Story = {
  render: () => {
    const form = useForm<PropertyFormData>({
      resolver: zodResolver(propertyFormSchema),
      defaultValues: {
        name: '',
        address: '',
        type: 'apartment',
        bedrooms: 1,
        bathrooms: 1,
        rentAmount: 0,
        deposit: 0,
        description: '',
        amenities: [],
        petsAllowed: false,
        furnished: false,
        utilitiesIncluded: false,
        availableDate: '',
      },
    });

    const onSubmit = (data: PropertyFormData) => {
      console.log('Property form submitted:', data);
      alert('Property created successfully!');
    };

    return (
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <div className="i-lucide-building mx-auto h-12 w-12 text-primary mb-4" />
          <h2 className="text-2xl font-bold">Add New Property</h2>
          <p className="text-muted-foreground">Create a new property listing in your portfolio</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Sunset Apartments Unit 2B" {...field} />
                    </FormControl>
                    <FormDescription>
                      A unique name to identify this property in your listings.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street, Apt 4B, City, State 12345" {...field} />
                    </FormControl>
                    <FormDescription>
                      Include street address, unit number, city, state, and ZIP code.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="house">Single Family House</SelectItem>
                        <SelectItem value="condo">Condominium</SelectItem>
                        <SelectItem value="townhouse">Townhouse</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the type that best describes your property.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Property Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Property Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrooms</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bathrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bathrooms</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" min="0.5" max="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rentAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Rent ($)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="1500" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deposit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Deposit ($)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="1500" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="availableDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      When will this property be available for rent?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Property Features */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Property Features</h3>
              
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="petsAllowed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Pets Allowed</FormLabel>
                        <FormDescription>
                          Check if pets are allowed in this property
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="furnished"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Furnished</FormLabel>
                        <FormDescription>
                          Is this property furnished?
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="utilitiesIncluded"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Utilities Included</FormLabel>
                        <FormDescription>
                          Are utilities included in the rent?
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the property, its features, and neighborhood..."
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description to help attract potential tenants.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                Create Property
              </Button>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    );
  },
};

// Tenant Application Form Schema
const tenantFormSchema = z.object({
  personalInfo: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone number must be at least 10 digits'),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
  }),
  employment: z.object({
    status: z.enum(['employed', 'self-employed', 'unemployed', 'student', 'retired']),
    employer: z.string().optional(),
    position: z.string().optional(),
    monthlyIncome: z.coerce.number().min(0, 'Income must be positive'),
    employmentLength: z.string().optional(),
  }),
  rental: z.object({
    currentAddress: z.string().min(1, 'Current address is required'),
    rentReason: z.enum(['relocation', 'upgrade', 'first-time', 'other']),
    moveInDate: z.string().min(1, 'Move-in date is required'),
    hasPets: z.boolean().default(false),
    petDetails: z.string().optional(),
  }),
  references: z.object({
    emergencyContact: z.string().min(1, 'Emergency contact is required'),
    emergencyPhone: z.string().min(10, 'Emergency contact phone required'),
    previousLandlord: z.string().optional(),
    landlordPhone: z.string().optional(),
  }),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;

// Tenant Application Form
export const TenantApplicationForm: Story = {
  render: () => {
    const form = useForm<TenantFormData>({
      resolver: zodResolver(tenantFormSchema),
      defaultValues: {
        personalInfo: {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          dateOfBirth: '',
        },
        employment: {
          status: 'employed',
          employer: '',
          position: '',
          monthlyIncome: 0,
          employmentLength: '',
        },
        rental: {
          currentAddress: '',
          rentReason: 'relocation',
          moveInDate: '',
          hasPets: false,
          petDetails: '',
        },
        references: {
          emergencyContact: '',
          emergencyPhone: '',
          previousLandlord: '',
          landlordPhone: '',
        },
      },
    });

    const onSubmit = (data: TenantFormData) => {
      console.log('Tenant application submitted:', data);
      alert('Application submitted successfully!');
    };

    return (
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <div className="i-lucide-user mx-auto h-12 w-12 text-primary mb-4" />
          <h2 className="text-2xl font-bold">Tenant Application</h2>
          <p className="text-muted-foreground">Complete your rental application</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <div className="i-lucide-user h-5 w-5" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="personalInfo.firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="personalInfo.lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="personalInfo.email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="personalInfo.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="personalInfo.dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Employment Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <div className="i-lucide-dollar-sign h-5 w-5" />
                Employment Information
              </h3>

              <FormField
                control={form.control}
                name="employment.status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Status</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="employed" id="employed" />
                          <label htmlFor="employed">Employed</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="self-employed" id="self-employed" />
                          <label htmlFor="self-employed">Self-Employed</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="student" id="student" />
                          <label htmlFor="student">Student</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="retired" id="retired" />
                          <label htmlFor="retired">Retired</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="unemployed" id="unemployed" />
                          <label htmlFor="unemployed">Unemployed</label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="employment.employer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employer</FormLabel>
                      <FormControl>
                        <Input placeholder="Company Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="employment.position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input placeholder="Job Title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="employment.monthlyIncome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Income ($)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="4000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="employment.employmentLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employment Length</FormLabel>
                      <FormControl>
                        <Input placeholder="2 years" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Rental Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <div className="i-lucide-map-pin h-5 w-5" />
                Rental Information
              </h3>

              <FormField
                control={form.control}
                name="rental.currentAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Current Street, City, State 12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rental.rentReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Moving</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="relocation">Relocation</SelectItem>
                          <SelectItem value="upgrade">Upgrade</SelectItem>
                          <SelectItem value="first-time">First-time Renter</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rental.moveInDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Move-in Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="rental.hasPets"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>I have pets</FormLabel>
                      <FormDescription>
                        Check if you have any pets that will live in the property
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch('rental.hasPets') && (
                <FormField
                  control={form.control}
                  name="rental.petDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pet Details</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your pets (type, breed, age, etc.)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* References */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <div className="i-lucide-phone h-5 w-5" />
                References
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="references.emergencyContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="references.emergencyPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Phone</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="(555) 987-6543" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="references.previousLandlord"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous Landlord (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Smith Property Management" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="references.landlordPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Landlord Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="(555) 555-5555" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                Submit Application
              </Button>
              <Button type="button" variant="outline">
                Save Draft
              </Button>
            </div>
          </form>
        </Form>
      </div>
    );
  },
};

// Form Validation States
export const ValidationStates: Story = {
  render: () => (
    <div className="w-96 space-y-6">
      <h3 className="text-lg font-semibold">Form Validation States</h3>
      
      <Form>
        <FormItem>
          <FormLabel>Valid Field</FormLabel>
          <FormControl>
            <Input defaultValue="valid@example.com" />
          </FormControl>
          <FormDescription>
            This field is valid and shows success state.
          </FormDescription>
          <FormMessage />
        </FormItem>

        <FormItem>
          <FormLabel data-error="true">Field with Error</FormLabel>
          <FormControl>
            <Input defaultValue="invalid-email" aria-invalid />
          </FormControl>
          <FormDescription>
            This field has an error message.
          </FormDescription>
          <FormMessage>Please enter a valid email address.</FormMessage>
        </FormItem>

        <FormItem>
          <FormLabel>Required Field *</FormLabel>
          <FormControl>
            <Input placeholder="This field is required" />
          </FormControl>
          <FormDescription>
            Fields marked with * are required.
          </FormDescription>
          <FormMessage />
        </FormItem>

        <FormItem>
          <FormLabel>Disabled Field</FormLabel>
          <FormControl>
            <Input disabled defaultValue="This field is disabled" />
          </FormControl>
          <FormDescription>
            This field cannot be edited.
          </FormDescription>
          <FormMessage />
        </FormItem>
      </Form>
    </div>
  ),
};

// Accessibility Demonstration
export const AccessibilityDemo: Story = {
  render: () => (
    <div className="w-96 space-y-6">
      <h3 className="text-lg font-semibold">Accessibility Features</h3>
      <p className="text-sm text-muted-foreground">
        This form demonstrates proper accessibility with ARIA labels, descriptions, and error handling.
      </p>
      
      <Form>
        <FormItem>
          <FormLabel>Email Address *</FormLabel>
          <FormControl>
            <Input 
              type="email" 
              placeholder="Enter your email"
              aria-required="true"
              aria-describedby="email-description email-error"
            />
          </FormControl>
          <FormDescription id="email-description">
            We use this to send you important updates about your account.
          </FormDescription>
          <FormMessage id="email-error">
            Please enter a valid email address.
          </FormMessage>
        </FormItem>

        <FormItem>
          <FormLabel>Password *</FormLabel>
          <FormControl>
            <Input 
              type="password" 
              placeholder="Create a secure password"
              aria-required="true"
              aria-describedby="password-description"
            />
          </FormControl>
          <FormDescription id="password-description">
            Password must be at least 8 characters with uppercase, lowercase, and numbers.
          </FormDescription>
          <FormMessage />
        </FormItem>

        <FormItem>
          <FormLabel>Phone Number (Optional)</FormLabel>
          <FormControl>
            <Input 
              type="tel" 
              placeholder="(555) 123-4567"
              aria-describedby="phone-description"
            />
          </FormControl>
          <FormDescription id="phone-description">
            Optional: We may use this for two-factor authentication.
          </FormDescription>
          <FormMessage />
        </FormItem>
      </Form>
    </div>
  ),
};