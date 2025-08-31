import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { Checkbox } from '../../../apps/frontend/src/components/ui/checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox System',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic Checkbox States
export const BasicStates: Story = {
  render: () => (
    <div className="space-y-6 w-80">
      <h3 className="text-lg font-semibold">Basic Checkbox States</h3>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Checkbox id="unchecked" />
          <label htmlFor="unchecked" className="text-sm font-medium">
            Unchecked
          </label>
        </div>

        <div className="flex items-center space-x-3">
          <Checkbox id="checked" defaultChecked />
          <label htmlFor="checked" className="text-sm font-medium">
            Checked
          </label>
        </div>

        <div className="flex items-center space-x-3">
          <Checkbox id="disabled-unchecked" disabled />
          <label htmlFor="disabled-unchecked" className="text-sm font-medium opacity-50">
            Disabled (Unchecked)
          </label>
        </div>

        <div className="flex items-center space-x-3">
          <Checkbox id="disabled-checked" disabled defaultChecked />
          <label htmlFor="disabled-checked" className="text-sm font-medium opacity-50">
            Disabled (Checked)
          </label>
        </div>

        <div className="flex items-center space-x-3">
          <Checkbox id="error-state" className="border-destructive focus:border-destructive focus:ring-destructive/20" />
          <label htmlFor="error-state" className="text-sm font-medium text-destructive">
            Error State
          </label>
        </div>
      </div>
    </div>
  ),
};

// Property Amenities Checklist
export const PropertyAmenitiesChecklist: Story = {
  render: () => {
    const [selectedAmenities, setSelectedAmenities] = React.useState<string[]>([]);

    const amenities = [
      { id: 'wifi', label: 'High-Speed Internet', icon: 'i-lucide-wifi', description: 'Fiber optic internet included in rent' },
      { id: 'parking', label: 'Parking Space', icon: 'i-lucide-car', description: 'Dedicated parking spot included' },
      { id: 'gym', label: 'Fitness Center', icon: 'i-lucide-dumbbell', description: '24/7 access to building gym' },
      { id: 'pool', label: 'Swimming Pool', icon: 'i-lucide-waves', description: 'Outdoor pool with deck area' },
      { id: 'security', label: '24/7 Security', icon: 'i-lucide-shield', description: 'Doorman and security system' },
      { id: 'pets', label: 'Pet Friendly', icon: 'i-lucide-pet', description: 'Cats and dogs welcome' },
      { id: 'kitchen', label: 'Updated Kitchen', icon: 'i-lucide-utensils', description: 'Modern appliances and granite counters' },
    ];

    const toggleAmenity = (amenityId: string) => {
      setSelectedAmenities(prev => 
        prev.includes(amenityId) 
          ? prev.filter(id => id !== amenityId)
          : [...prev, amenityId]
      );
    };

    return (
      <div className="space-y-6 w-full max-w-2xl">
        <div className="text-center">
          <div className="i-lucide-home mx-auto h-8 w-8 text-primary mb-2" />
          <h3 className="text-lg font-semibold">Property Amenities</h3>
          <p className="text-sm text-muted-foreground">
            Select all amenities available in this property
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {amenities.map((amenity) => {
            const isSelected = selectedAmenities.includes(amenity.id);
            
            return (
              <div 
                key={amenity.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                  isSelected ? 'bg-primary/5 border-primary/20' : 'border-border hover:bg-muted/50'
                }`}
              >
                <Checkbox 
                  id={amenity.id}
                  checked={isSelected}
                  onCheckedChange={() => toggleAmenity(amenity.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <label 
                    htmlFor={amenity.id} 
                    className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                  >
                    <div className={`${amenity.icon} h-4 w-4 text-primary`} />
                    {amenity.label}
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {amenity.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {selectedAmenities.length > 0 && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Selected Amenities ({selectedAmenities.length}):</h4>
            <p className="text-sm text-muted-foreground">
              {amenities
                .filter(a => selectedAmenities.includes(a.id))
                .map(a => a.label)
                .join(', ')}
            </p>
          </div>
        )}
      </div>
    );
  },
};

// Tenant Application Preferences
export const TenantApplicationPreferences: Story = {
  render: () => {
    const [preferences, setPreferences] = React.useState({
      petsAllowed: false,
      smokingAllowed: false,
      furnished: false,
      shortTerm: false,
      utilities: false,
      parking: false,
      laundry: false,
      gym: false,
      balcony: false,
      dishwasher: false,
      airConditioning: false,
      heating: false,
    });

    const handlePreferenceChange = (key: keyof typeof preferences) => {
      setPreferences(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    };

    return (
      <div className="space-y-6 w-full max-w-2xl">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Rental Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Check all preferences that apply to your rental search
          </p>
        </div>
        
        <div className="space-y-6">
          {/* Living Preferences */}
          <div className="space-y-3">
            <h4 className="text-md font-medium">Living Preferences</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="pets"
                  checked={preferences.petsAllowed}
                  onCheckedChange={() => handlePreferenceChange('petsAllowed')}
                />
                <label htmlFor="pets" className="text-sm">
                  Pet-friendly (I have pets)
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="smoking"
                  checked={preferences.smokingAllowed}
                  onCheckedChange={() => handlePreferenceChange('smokingAllowed')}
                />
                <label htmlFor="smoking" className="text-sm">
                  Smoking allowed
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="furnished"
                  checked={preferences.furnished}
                  onCheckedChange={() => handlePreferenceChange('furnished')}
                />
                <label htmlFor="furnished" className="text-sm">
                  Furnished apartment
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="short-term"
                  checked={preferences.shortTerm}
                  onCheckedChange={() => handlePreferenceChange('shortTerm')}
                />
                <label htmlFor="short-term" className="text-sm">
                  Short-term lease (less than 1 year)
                </label>
              </div>
            </div>
          </div>

          {/* Utilities & Services */}
          <div className="space-y-3">
            <h4 className="text-md font-medium">Utilities & Services</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="utilities"
                  checked={preferences.utilities}
                  onCheckedChange={() => handlePreferenceChange('utilities')}
                />
                <label htmlFor="utilities" className="text-sm">
                  Utilities included in rent
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="parking"
                  checked={preferences.parking}
                  onCheckedChange={() => handlePreferenceChange('parking')}
                />
                <label htmlFor="parking" className="text-sm">
                  Parking space required
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="laundry"
                  checked={preferences.laundry}
                  onCheckedChange={() => handlePreferenceChange('laundry')}
                />
                <label htmlFor="laundry" className="text-sm">
                  In-unit laundry
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="gym"
                  checked={preferences.gym}
                  onCheckedChange={() => handlePreferenceChange('gym')}
                />
                <label htmlFor="gym" className="text-sm">
                  Building gym/fitness center
                </label>
              </div>
            </div>
          </div>

          {/* Apartment Features */}
          <div className="space-y-3">
            <h4 className="text-md font-medium">Apartment Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="balcony"
                  checked={preferences.balcony}
                  onCheckedChange={() => handlePreferenceChange('balcony')}
                />
                <label htmlFor="balcony" className="text-sm">
                  Balcony or patio
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="dishwasher"
                  checked={preferences.dishwasher}
                  onCheckedChange={() => handlePreferenceChange('dishwasher')}
                />
                <label htmlFor="dishwasher" className="text-sm">
                  Dishwasher
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="ac"
                  checked={preferences.airConditioning}
                  onCheckedChange={() => handlePreferenceChange('airConditioning')}
                />
                <label htmlFor="ac" className="text-sm">
                  Air conditioning
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="heating"
                  checked={preferences.heating}
                  onCheckedChange={() => handlePreferenceChange('heating')}
                />
                <label htmlFor="heating" className="text-sm">
                  Central heating
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">
            Selected Preferences ({Object.values(preferences).filter(Boolean).length}/12):
          </h4>
          <div className="text-sm text-muted-foreground">
            {Object.entries(preferences)
              .filter(([_, value]) => value)
              .map(([key, _]) => {
                const labels = {
                  petsAllowed: 'Pet-friendly',
                  smokingAllowed: 'Smoking allowed',
                  furnished: 'Furnished',
                  shortTerm: 'Short-term lease',
                  utilities: 'Utilities included',
                  parking: 'Parking space',
                  laundry: 'In-unit laundry',
                  gym: 'Building gym',
                  balcony: 'Balcony/patio',
                  dishwasher: 'Dishwasher',
                  airConditioning: 'Air conditioning',
                  heating: 'Central heating',
                };
                return labels[key as keyof typeof labels];
              })
              .join(', ') || 'No preferences selected'}
          </div>
        </div>
      </div>
    );
  },
};

// Terms and Conditions
export const TermsAndConditions: Story = {
  render: () => {
    const [agreements, setAgreements] = React.useState({
      terms: false,
      privacy: false,
      marketing: false,
      background: false,
      credit: false,
    });

    const handleAgreementChange = (key: keyof typeof agreements) => {
      setAgreements(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    };

    const allRequiredAgreed = agreements.terms && agreements.privacy && agreements.background && agreements.credit;

    return (
      <div className="space-y-6 w-full max-w-2xl">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Terms & Agreements</h3>
          <p className="text-sm text-muted-foreground">
            Please review and accept the following terms to complete your application
          </p>
        </div>
        
        <div className="space-y-4">
          {/* Required Terms */}
          <div className="space-y-3">
            <h4 className="text-md font-medium text-destructive">Required *</h4>
            
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <Checkbox 
                id="terms"
                checked={agreements.terms}
                onCheckedChange={() => handleAgreementChange('terms')}
                className="mt-0.5"
                required
              />
              <div className="flex-1 min-w-0">
                <label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                  I agree to the Terms of Service *
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  You must accept our terms and conditions to proceed with the application.{' '}
                  <a href="#" className="text-primary hover:underline">Read full terms</a>
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <Checkbox 
                id="privacy"
                checked={agreements.privacy}
                onCheckedChange={() => handleAgreementChange('privacy')}
                className="mt-0.5"
                required
              />
              <div className="flex-1 min-w-0">
                <label htmlFor="privacy" className="text-sm font-medium cursor-pointer">
                  I agree to the Privacy Policy *
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Understand how we collect, use, and protect your personal information.{' '}
                  <a href="#" className="text-primary hover:underline">View privacy policy</a>
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <Checkbox 
                id="background"
                checked={agreements.background}
                onCheckedChange={() => handleAgreementChange('background')}
                className="mt-0.5"
                required
              />
              <div className="flex-1 min-w-0">
                <label htmlFor="background" className="text-sm font-medium cursor-pointer">
                  I consent to background check *
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Authorization for landlord to conduct background and reference checks as part of the application process.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <Checkbox 
                id="credit"
                checked={agreements.credit}
                onCheckedChange={() => handleAgreementChange('credit')}
                className="mt-0.5"
                required
              />
              <div className="flex-1 min-w-0">
                <label htmlFor="credit" className="text-sm font-medium cursor-pointer">
                  I consent to credit check *
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Authorization for landlord to conduct credit checks to verify financial qualification.
                </p>
              </div>
            </div>
          </div>

          {/* Optional Terms */}
          <div className="space-y-3">
            <h4 className="text-md font-medium">Optional</h4>
            
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <Checkbox 
                id="marketing"
                checked={agreements.marketing}
                onCheckedChange={() => handleAgreementChange('marketing')}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <label htmlFor="marketing" className="text-sm font-medium cursor-pointer">
                  I'd like to receive marketing emails
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Receive updates about new properties, rental tips, and special offers. You can unsubscribe at any time.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Application Status */}
        <div className={`p-4 rounded-lg border ${
          allRequiredAgreed 
            ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
            : 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800'
        }`}>
          <div className="flex items-center gap-2">
            {allRequiredAgreed ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Ready to submit application
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  Please accept all required terms to continue
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  },
};

// Maintenance Checklist
export const MaintenanceChecklist: Story = {
  render: () => {
    const [checkedItems, setCheckedItems] = React.useState<string[]>([]);

    const maintenanceItems = [
      { id: 'hvac', label: 'HVAC System Check', description: 'Inspect heating, ventilation, and air conditioning' },
      { id: 'plumbing', label: 'Plumbing Inspection', description: 'Check pipes, faucets, and water pressure' },
      { id: 'electrical', label: 'Electrical Safety Check', description: 'Test outlets, switches, and circuit breakers' },
      { id: 'windows', label: 'Window & Door Inspection', description: 'Check seals, locks, and operation' },
      { id: 'appliances', label: 'Appliance Functionality', description: 'Test all included appliances' },
      { id: 'safety', label: 'Safety Equipment Check', description: 'Verify smoke detectors and emergency systems' },
      { id: 'exterior', label: 'Exterior Walkthrough', description: 'Inspect building exterior and common areas' },
      { id: 'cleaning', label: 'Deep Cleaning', description: 'Professional cleaning of all areas' },
    ];

    const toggleItem = (itemId: string) => {
      setCheckedItems(prev => 
        prev.includes(itemId) 
          ? prev.filter(id => id !== itemId)
          : [...prev, itemId]
      );
    };

    const completionPercentage = Math.round((checkedItems.length / maintenanceItems.length) * 100);

    return (
      <div className="space-y-6 w-full max-w-2xl">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Property Maintenance Checklist</h3>
          <p className="text-sm text-muted-foreground">
            Complete all maintenance tasks before tenant move-in
          </p>
        </div>
        
        {/* Progress indicator */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Completion Progress</span>
            <span className="text-sm text-muted-foreground">
              {checkedItems.length}/{maintenanceItems.length} ({completionPercentage}%)
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-3">
          {maintenanceItems.map((item) => {
            const isCompleted = checkedItems.includes(item.id);
            
            return (
              <div 
                key={item.id}
                className={`flex items-start space-x-3 p-4 border rounded-lg transition-colors ${
                  isCompleted 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <Checkbox 
                  id={item.id}
                  checked={isCompleted}
                  onCheckedChange={() => toggleItem(item.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <label 
                    htmlFor={item.id} 
                    className={`text-sm font-medium cursor-pointer ${
                      isCompleted ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {item.label}
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.description}
                  </p>
                  {isCompleted && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ Completed
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {completionPercentage === 100 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950 dark:border-green-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                🎉 All maintenance tasks completed! Property is ready for tenant move-in.
              </span>
            </div>
          </div>
        )}
      </div>
    );
  },
};

// Validation & Error States
export const ValidationStates: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <h3 className="text-lg font-semibold">Validation & Error States</h3>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <Checkbox id="valid" defaultChecked />
            <label htmlFor="valid" className="text-sm font-medium">
              Valid checkbox (checked)
            </label>
          </div>
          <p className="text-xs text-green-600 flex items-center gap-1 ml-7">
            ✓ This option is selected
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <Checkbox 
              id="required" 
              className="border-destructive focus:border-destructive focus:ring-destructive/20"
            />
            <label htmlFor="required" className="text-sm font-medium">
              Required checkbox *
            </label>
          </div>
          <p className="text-xs text-destructive flex items-center gap-1 ml-7">
            ⚠ This field is required
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <Checkbox id="optional" />
            <label htmlFor="optional" className="text-sm font-medium">
              Optional checkbox
            </label>
          </div>
          <p className="text-xs text-muted-foreground ml-7">
            This selection is optional
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <Checkbox id="disabled-error" disabled />
            <label htmlFor="disabled-error" className="text-sm font-medium opacity-50">
              Disabled checkbox
            </label>
          </div>
          <p className="text-xs text-muted-foreground ml-7">
            This option is currently unavailable
          </p>
        </div>
      </div>
    </div>
  ),
};

// Accessibility Demonstration
export const AccessibilityDemo: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <h3 className="text-lg font-semibold">Accessibility Features</h3>
      <p className="text-sm text-muted-foreground">
        All checkboxes include proper ARIA labels, keyboard navigation, and screen reader support.
      </p>
      
      <div className="space-y-4">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Rental Preferences *</legend>
          
          <div className="flex items-center space-x-3">
            <Checkbox 
              id="accessible-pets"
              aria-describedby="pets-description"
              required
            />
            <div>
              <label htmlFor="accessible-pets" className="text-sm font-medium cursor-pointer">
                Pet-friendly apartment required
              </label>
              <p id="pets-description" className="text-xs text-muted-foreground">
                I need an apartment that allows pets
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox 
              id="accessible-parking"
              aria-describedby="parking-description"
            />
            <div>
              <label htmlFor="accessible-parking" className="text-sm font-medium cursor-pointer">
                Accessible parking required
              </label>
              <p id="parking-description" className="text-xs text-muted-foreground">
                I need a wheelchair accessible parking space
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox 
              id="accessible-unit"
              aria-describedby="unit-description"
            />
            <div>
              <label htmlFor="accessible-unit" className="text-sm font-medium cursor-pointer">
                ADA compliant unit
              </label>
              <p id="unit-description" className="text-xs text-muted-foreground">
                Unit must meet ADA accessibility standards
              </p>
            </div>
          </div>
        </fieldset>

        <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded">
          <p><strong>Keyboard navigation:</strong> Use Tab to focus, Space to toggle</p>
          <p><strong>Screen readers:</strong> Each checkbox includes descriptive labels and help text</p>
        </div>
      </div>
    </div>
  ),
};

// Interactive Playground
export const Playground: Story = {
  args: {
    checked: false,
    disabled: false,
  },
  render: (args) => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <Checkbox id="playground" {...args} />
        <label htmlFor="playground" className="text-sm font-medium">
          Interactive Playground Checkbox
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Use the controls to adjust the checkbox properties.
      </p>
    </div>
  ),
};