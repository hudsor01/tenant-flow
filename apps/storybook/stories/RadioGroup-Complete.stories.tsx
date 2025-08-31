import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { RadioGroup, RadioGroupItem } from '../../../apps/frontend/src/components/ui/radio-group';

const meta: Meta<typeof RadioGroup> = {
  title: 'UI/RadioGroup System',
  component: RadioGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    orientation: {
      control: { type: 'select' },
      options: ['vertical', 'horizontal'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic RadioGroup States
export const BasicStates: Story = {
  render: () => (
    <div className="space-y-8 w-96">
      <div>
        <h3 className="text-lg font-semibold mb-4">Basic RadioGroup</h3>
        <RadioGroup defaultValue="option2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option1" id="r1" />
            <label htmlFor="r1" className="text-sm font-medium">Option 1</label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option2" id="r2" />
            <label htmlFor="r2" className="text-sm font-medium">Option 2 (Selected)</label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option3" id="r3" />
            <label htmlFor="r3" className="text-sm font-medium">Option 3</label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Horizontal Layout</h3>
        <RadioGroup defaultValue="horizontal2" className="flex space-x-6">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="horizontal1" id="h1" />
            <label htmlFor="h1" className="text-sm font-medium">Option A</label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="horizontal2" id="h2" />
            <label htmlFor="h2" className="text-sm font-medium">Option B</label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="horizontal3" id="h3" />
            <label htmlFor="h3" className="text-sm font-medium">Option C</label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Disabled States</h3>
        <RadioGroup defaultValue="enabled" disabled>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="enabled" id="d1" />
            <label htmlFor="d1" className="text-sm font-medium">Selected & Disabled</label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="disabled1" id="d2" />
            <label htmlFor="d2" className="text-sm font-medium">Disabled Option 1</label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="disabled2" id="d3" />
            <label htmlFor="d3" className="text-sm font-medium">Disabled Option 2</label>
          </div>
        </RadioGroup>
      </div>
    </div>
  ),
};

// Property Type Selection
export const PropertyTypeSelection: Story = {
  render: () => {
    const [selectedType, setSelectedType] = React.useState('apartment');

    const propertyTypes = [
      {
        id: 'apartment',
        label: 'Apartment',
        description: 'Multi-unit building with shared common areas',
        icon: '🏢',
        popular: true,
      },
      {
        id: 'house',
        label: 'Single Family House',
        description: 'Standalone residential property with private yard',
        icon: '🏠',
        popular: true,
      },
      {
        id: 'condo',
        label: 'Condominium',
        description: 'Privately owned unit in a multi-unit building',
        icon: '🏘️',
        popular: false,
      },
      {
        id: 'townhouse',
        label: 'Townhouse',
        description: 'Multi-story home sharing walls with neighbors',
        icon: '🏘️',
        popular: false,
      },
      {
        id: 'studio',
        label: 'Studio',
        description: 'Open-plan living space with minimal room separation',
        icon: '🏠',
        popular: false,
      },
    ];

    return (
      <div className="space-y-6 w-full max-w-2xl">
        <div className="text-center">
          <div className="i-lucide-home mx-auto h-8 w-8 text-primary mb-2" />
          <h3 className="text-lg font-semibold">Property Type</h3>
          <p className="text-sm text-muted-foreground">
            Select the type of property you're adding to your portfolio
          </p>
        </div>

        <RadioGroup value={selectedType} onValueChange={setSelectedType}>
          {propertyTypes.map((type) => (
            <div
              key={type.id}
              className={`relative flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                selectedType === type.id
                  ? 'bg-primary/5 border-primary/20'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              {type.popular && (
                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                  Popular
                </div>
              )}
              <RadioGroupItem value={type.id} id={type.id} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor={type.id}
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                >
                  <span className="text-lg">{type.icon}</span>
                  {type.label}
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  {type.description}
                </p>
              </div>
            </div>
          ))}
        </RadioGroup>

        {selectedType && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Selected:</span>{' '}
              {propertyTypes.find(t => t.id === selectedType)?.label}
            </p>
          </div>
        )}
      </div>
    );
  },
};

// Lease Duration Selection
export const LeaseDurationSelection: Story = {
  render: () => {
    const [selectedDuration, setSelectedDuration] = React.useState('12-months');

    const leaseDurations = [
      {
        id: 'month-to-month',
        label: 'Month-to-Month',
        description: 'Flexible lease with 30-day notice',
        price: '+$200/month',
        flexibility: 'High',
        icon: 'i-lucide-calendar',
      },
      {
        id: '6-months',
        label: '6 Months',
        description: 'Short-term commitment',
        price: '+$100/month',
        flexibility: 'Medium',
        icon: 'i-lucide-calendar',
      },
      {
        id: '12-months',
        label: '12 Months',
        description: 'Standard lease term',
        price: 'Base rate',
        flexibility: 'Medium',
        icon: 'i-lucide-calendar',
        recommended: true,
      },
      {
        id: '18-months',
        label: '18 Months',
        description: 'Extended commitment',
        price: '-$50/month',
        flexibility: 'Low',
        icon: 'i-lucide-calendar',
      },
      {
        id: '24-months',
        label: '24 Months',
        description: 'Long-term stability',
        price: '-$100/month',
        flexibility: 'Low',
        icon: 'i-lucide-calendar',
      },
    ];

    return (
      <div className="space-y-6 w-full max-w-2xl">
        <div className="text-center">
          <div className="i-lucide-calendar mx-auto h-8 w-8 text-primary mb-2" />
          <h3 className="text-lg font-semibold">Lease Duration</h3>
          <p className="text-sm text-muted-foreground">
            Choose your preferred lease length
          </p>
        </div>

        <RadioGroup value={selectedDuration} onValueChange={setSelectedDuration}>
          {leaseDurations.map((duration) => {
            const isSelected = selectedDuration === duration.id;
            
            return (
              <div
                key={duration.id}
                className={`relative flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-primary/5 border-primary/20'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                {duration.recommended && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Recommended
                  </div>
                )}
                <RadioGroupItem value={duration.id} id={duration.id} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={duration.id}
                      className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                    >
                      <div className={`${duration.icon} h-4 w-4 text-primary`} />
                      {duration.label}
                    </label>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        duration.price.includes('-') ? 'text-green-600' :
                        duration.price.includes('+') ? 'text-orange-600' : 'text-muted-foreground'
                      }`}>
                        {duration.price}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {duration.description}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      Flexibility: {duration.flexibility}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </RadioGroup>
      </div>
    );
  },
};

// Rental Application Status
export const ApplicationStatusSelection: Story = {
  render: () => {
    const [selectedStatus, setSelectedStatus] = React.useState('approved');

    const applicationStatuses = [
      {
        id: 'pending',
        label: 'Pending Review',
        description: 'Application submitted, waiting for landlord review',
        color: 'yellow',
        icon: 'i-lucide-clock',
      },
      {
        id: 'under-review',
        label: 'Under Review',
        description: 'Landlord is currently reviewing the application',
        color: 'blue',
        icon: 'i-lucide-users',
      },
      {
        id: 'approved',
        label: 'Approved',
        description: 'Application approved, ready to sign lease',
        color: 'green',
        icon: 'i-lucide-check-circle',
      },
      {
        id: 'rejected',
        label: 'Rejected',
        description: 'Application not approved at this time',
        color: 'red',
        icon: 'i-lucide-alert-triangle',
      },
      {
        id: 'waitlist',
        label: 'Waitlist',
        description: 'Added to waitlist for future availability',
        color: 'gray',
        icon: 'i-lucide-clock',
      },
    ];

    const getColorClasses = (color: string, isSelected: boolean) => {
      const colorMap = {
        yellow: isSelected ? 'bg-yellow-50 border-yellow-200' : 'border-border',
        blue: isSelected ? 'bg-blue-50 border-blue-200' : 'border-border',
        green: isSelected ? 'bg-green-50 border-green-200' : 'border-border',
        red: isSelected ? 'bg-red-50 border-red-200' : 'border-border',
        gray: isSelected ? 'bg-gray-50 border-gray-200' : 'border-border',
      };
      return colorMap[color as keyof typeof colorMap] || 'border-border';
    };

    const getIconColor = (color: string) => {
      const colorMap = {
        yellow: 'text-yellow-500',
        blue: 'text-blue-500',
        green: 'text-green-500',
        red: 'text-red-500',
        gray: 'text-gray-500',
      };
      return colorMap[color as keyof typeof colorMap] || 'text-gray-500';
    };

    return (
      <div className="space-y-6 w-full max-w-xl">
        <div className="text-center">
          <div className="i-lucide-users mx-auto h-8 w-8 text-primary mb-2" />
          <h3 className="text-lg font-semibold">Application Status</h3>
          <p className="text-sm text-muted-foreground">
            Update the status of this rental application
          </p>
        </div>

        <RadioGroup value={selectedStatus} onValueChange={setSelectedStatus}>
          {applicationStatuses.map((status) => {
            const isSelected = selectedStatus === status.id;
            
            return (
              <div
                key={status.id}
                className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors hover:bg-muted/50 ${
                  getColorClasses(status.color, isSelected)
                }`}
              >
                <RadioGroupItem value={status.id} id={status.id} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor={status.id}
                    className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                  >
                    <div className={`${status.icon} h-4 w-4 ${getIconColor(status.color)}`} />
                    {status.label}
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {status.description}
                  </p>
                </div>
              </div>
            );
          })}
        </RadioGroup>

        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Status Details</h4>
          <p className="text-sm text-muted-foreground">
            Current status: <span className="font-medium">
              {applicationStatuses.find(s => s.id === selectedStatus)?.label}
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {applicationStatuses.find(s => s.id === selectedStatus)?.description}
          </p>
        </div>
      </div>
    );
  },
};

// Payment Method Selection
export const PaymentMethodSelection: Story = {
  render: () => {
    const [selectedPayment, setSelectedPayment] = React.useState('bank-transfer');

    const paymentMethods = [
      {
        id: 'bank-transfer',
        label: 'Bank Transfer (ACH)',
        description: 'Direct transfer from your bank account',
        fee: 'Free',
        processingTime: '1-3 business days',
        icon: '🏦',
        recommended: true,
      },
      {
        id: 'credit-card',
        label: 'Credit Card',
        description: 'Pay with Visa, Mastercard, or American Express',
        fee: '2.9% + $0.30',
        processingTime: 'Instant',
        icon: '💳',
        recommended: false,
      },
      {
        id: 'debit-card',
        label: 'Debit Card',
        description: 'Pay directly from your checking account',
        fee: '1.5% + $0.30',
        processingTime: 'Instant',
        icon: '💳',
        recommended: false,
      },
      {
        id: 'check',
        label: 'Personal Check',
        description: 'Mail or deliver a physical check',
        fee: 'Free',
        processingTime: '5-7 business days',
        icon: '📄',
        recommended: false,
      },
      {
        id: 'money-order',
        label: 'Money Order',
        description: 'Purchase and deliver a money order',
        fee: 'Variable',
        processingTime: '3-5 business days',
        icon: '💰',
        recommended: false,
      },
    ];

    return (
      <div className="space-y-6 w-full max-w-2xl">
        <div className="text-center">
          <div className="i-lucide-dollar-sign mx-auto h-8 w-8 text-primary mb-2" />
          <h3 className="text-lg font-semibold">Payment Method</h3>
          <p className="text-sm text-muted-foreground">
            Choose how you'd like to pay your rent
          </p>
        </div>

        <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment}>
          {paymentMethods.map((method) => {
            const isSelected = selectedPayment === method.id;
            
            return (
              <div
                key={method.id}
                className={`relative flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-primary/5 border-primary/20'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                {method.recommended && (
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                    Recommended
                  </div>
                )}
                <RadioGroupItem value={method.id} id={method.id} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor={method.id}
                    className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                  >
                    <span className="text-lg">{method.icon}</span>
                    {method.label}
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {method.description}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-4">
                      <span className="text-xs">
                        <span className="text-muted-foreground">Fee:</span>{' '}
                        <span className={method.fee === 'Free' ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                          {method.fee}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Processing: {method.processingTime}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </RadioGroup>

        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Payment Summary</h4>
          {(() => {
            const selected = paymentMethods.find(m => m.id === selectedPayment);
            return selected ? (
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="text-muted-foreground">Method:</span> {selected.label}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Fee:</span> {selected.fee}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Processing Time:</span> {selected.processingTime}
                </p>
              </div>
            ) : null;
          })()}
        </div>
      </div>
    );
  },
};

// Tenant Preferences Survey
export const TenantPreferencesSurvey: Story = {
  render: () => {
    const [responses, setResponses] = React.useState<Record<string, string>>({});

    const questions = [
      {
        id: 'noise-preference',
        question: 'How important is a quiet environment?',
        options: [
          { id: 'very-quiet', label: 'Very Important', description: 'I need a very quiet space' },
          { id: 'somewhat-quiet', label: 'Somewhat Important', description: 'Some noise is okay' },
          { id: 'not-important', label: 'Not Important', description: 'Noise doesn\'t bother me' },
        ],
      },
      {
        id: 'social-preference',
        question: 'Do you prefer social interaction with neighbors?',
        options: [
          { id: 'very-social', label: 'Very Social', description: 'I love meeting neighbors' },
          { id: 'somewhat-social', label: 'Occasional', description: 'Sometimes it\'s nice' },
          { id: 'private', label: 'Private', description: 'I prefer to keep to myself' },
        ],
      },
      {
        id: 'maintenance-contact',
        question: 'Preferred method for maintenance requests?',
        options: [
          { id: 'app', label: 'Mobile App', description: 'Submit through tenant app' },
          { id: 'email', label: 'Email', description: 'Send email to property manager' },
          { id: 'phone', label: 'Phone Call', description: 'Call the office directly' },
          { id: 'text', label: 'Text Message', description: 'Send SMS to manager' },
        ],
      },
    ];

    const handleResponseChange = (questionId: string, value: string) => {
      setResponses(prev => ({
        ...prev,
        [questionId]: value
      }));
    };

    return (
      <div className="space-y-8 w-full max-w-2xl">
        <div className="text-center">
          <div className="i-lucide-users mx-auto h-8 w-8 text-primary mb-2" />
          <h3 className="text-lg font-semibold">Tenant Preferences Survey</h3>
          <p className="text-sm text-muted-foreground">
            Help us understand your living preferences to better serve you
          </p>
        </div>

        {questions.map((question, index) => (
          <div key={question.id} className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                {index + 1}
              </div>
              <h4 className="text-md font-medium">{question.question}</h4>
            </div>
            
            <RadioGroup 
              value={responses[question.id] || ''} 
              onValueChange={(value) => handleResponseChange(question.id, value)}
              className="ml-9"
            >
              {question.options.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                    responses[question.id] === option.id
                      ? 'bg-primary/5 border-primary/20'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value={option.id} id={option.id} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor={option.id}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {option.label}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}

        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Survey Progress</h4>
          <p className="text-sm text-muted-foreground">
            {Object.keys(responses).length} of {questions.length} questions answered
          </p>
          {Object.keys(responses).length === questions.length && (
            <p className="text-sm text-green-600 mt-1">
              ✓ Survey completed! Thank you for your responses.
            </p>
          )}
        </div>
      </div>
    );
  },
};

// Validation & Error States
export const ValidationStates: Story = {
  render: () => (
    <div className="space-y-8 w-96">
      <div>
        <h3 className="text-lg font-semibold mb-4">Valid Selection</h3>
        <RadioGroup defaultValue="valid-option">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="valid-option" id="valid1" />
            <label htmlFor="valid1" className="text-sm font-medium">Valid Selection</label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="other-option" id="valid2" />
            <label htmlFor="valid2" className="text-sm font-medium">Other Option</label>
          </div>
        </RadioGroup>
        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
          <div className="i-lucide-check-circle h-3 w-3" />
          Selection is valid
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Required Field (Error)</h3>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-destructive mb-2">
            Property Type * (Required)
          </legend>
          <RadioGroup>
            <div className="flex items-center space-x-2">
              <RadioGroupItem 
                value="apartment" 
                id="error1" 
                className="border-destructive focus:border-destructive focus:ring-destructive/20"
              />
              <label htmlFor="error1" className="text-sm font-medium">Apartment</label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem 
                value="house" 
                id="error2"
                className="border-destructive focus:border-destructive focus:ring-destructive/20"
              />
              <label htmlFor="error2" className="text-sm font-medium">House</label>
            </div>
          </RadioGroup>
          <p className="text-xs text-destructive mt-2 flex items-center gap-1">
            <div className="i-lucide-alert-triangle h-3 w-3" />
            Please select a property type
          </p>
        </fieldset>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Disabled RadioGroup</h3>
        <RadioGroup defaultValue="disabled-selected" disabled>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="disabled-selected" id="disabled1" />
            <label htmlFor="disabled1" className="text-sm font-medium opacity-50">
              Selected & Disabled
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="disabled-option" id="disabled2" />
            <label htmlFor="disabled2" className="text-sm font-medium opacity-50">
              Disabled Option
            </label>
          </div>
        </RadioGroup>
        <p className="text-xs text-muted-foreground mt-2">
          This section is currently disabled
        </p>
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
        RadioGroups include proper ARIA labels, fieldset grouping, and keyboard navigation.
      </p>
      
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          Rental Duration Preference *
          <span className="text-muted-foreground font-normal"> (Required)</span>
        </legend>
        
        <RadioGroup required aria-describedby="duration-help">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="short" id="acc-short" />
            <label htmlFor="acc-short" className="text-sm font-medium cursor-pointer">
              Short-term (less than 1 year)
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="standard" id="acc-standard" />
            <label htmlFor="acc-standard" className="text-sm font-medium cursor-pointer">
              Standard (1 year)
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="long" id="acc-long" />
            <label htmlFor="acc-long" className="text-sm font-medium cursor-pointer">
              Long-term (more than 1 year)
            </label>
          </div>
        </RadioGroup>
        
        <p id="duration-help" className="text-xs text-muted-foreground">
          Select your preferred lease duration. This helps us match you with suitable properties.
        </p>
      </fieldset>

      <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded">
        <p><strong>Keyboard navigation:</strong> Use Tab to focus, arrow keys to select, Space to confirm</p>
        <p><strong>Screen readers:</strong> Fieldset and legend provide proper grouping context</p>
        <p><strong>Required fields:</strong> Clearly marked with * and proper ARIA attributes</p>
      </div>
    </div>
  ),
};

// Interactive Playground
export const Playground: Story = {
  args: {
    disabled: false,
    orientation: 'vertical',
  },
  render: (args) => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Interactive Playground</h3>
      <RadioGroup {...args} defaultValue="playground2">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="playground1" id="p1" />
          <label htmlFor="p1" className="text-sm font-medium">Playground Option 1</label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="playground2" id="p2" />
          <label htmlFor="p2" className="text-sm font-medium">Playground Option 2 (Selected)</label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="playground3" id="p3" />
          <label htmlFor="p3" className="text-sm font-medium">Playground Option 3</label>
        </div>
      </RadioGroup>
      <p className="text-xs text-muted-foreground">
        Use the controls to adjust the RadioGroup properties.
      </p>
    </div>
  ),
};