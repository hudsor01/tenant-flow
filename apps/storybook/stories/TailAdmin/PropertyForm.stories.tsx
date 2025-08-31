import type { Meta, StoryObj } from '@storybook/react';
import { PropertyForm } from '@repo/frontend/src/components/tailadmin';
import { action } from '@storybook/addon-actions';

const meta: Meta<typeof PropertyForm> = {
  title: 'TailAdmin/Forms/PropertyForm',
  component: PropertyForm,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Comprehensive property form component with validation, field types, and professional styling. Includes built-in form validation and error handling.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: {
      description: 'Callback fired when the form is successfully submitted',
    },
    initialData: {
      description: 'Initial form data for editing existing properties',
    },
    isEditing: {
      control: 'boolean',
      description: 'Whether the form is in editing mode',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic new property form
export const NewProperty: Story = {
  args: {
    onSubmit: action('form-submitted'),
    isEditing: false,
  },
};

// Edit existing property form
export const EditProperty: Story = {
  args: {
    onSubmit: action('form-submitted'),
    isEditing: true,
    initialData: {
      name: "Sunset Apartments",
      address: "123 Main Street, Downtown, NY 10001",
      type: "apartment",
      units: "24",
      description: "Modern apartment complex with amenities including fitness center, rooftop terrace, and on-site parking. Located in the heart of downtown with easy access to public transportation.",
    },
  },
};

// Form with minimal data (editing scenario)
export const EditMinimalData: Story = {
  args: {
    onSubmit: action('form-submitted'),
    isEditing: true,
    initialData: {
      name: "Green Valley Condos",
      address: "456 Oak Street, Suburb, NY 10002",
      type: "condo",
      units: "12",
    },
  },
};

// Form validation demo
export const ValidationDemo: Story = {
  args: {
    onSubmit: (data) => {
      action('form-submitted')(data);
      // Show validation in action by logging
      console.log('Form submitted with data:', data);
    },
    isEditing: false,
  },
  render: (args) => (
    <div>
      <div className="mb-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <h3 className="font-medium text-blue-900 dark:text-blue-100">
          Form Validation Demo
        </h3>
        <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
          Try submitting the form without filling required fields to see validation in action.
          Required fields are marked with a red asterisk (*).
        </p>
      </div>
      <PropertyForm {...args} />
    </div>
  ),
};

// Different property types showcase
export const ApartmentComplex: Story = {
  args: {
    onSubmit: action('apartment-form-submitted'),
    isEditing: true,
    initialData: {
      name: "Riverside Apartments",
      address: "789 River Road, Riverside District, NY 10003",
      type: "apartment",
      units: "48",
      description: "Large apartment complex with 48 units across 4 buildings. Features include swimming pool, clubhouse, laundry facilities, and covered parking.",
    },
  },
};

export const SingleFamilyHome: Story = {
  args: {
    onSubmit: action('house-form-submitted'),
    isEditing: true,
    initialData: {
      name: "Maple Street House",
      address: "321 Maple Street, Residential Area, NY 10004",
      type: "house",
      units: "1",
      description: "Beautiful single-family home with 3 bedrooms, 2 bathrooms, and a large backyard. Perfect for families looking for suburban living.",
    },
  },
};

export const CommercialProperty: Story = {
  args: {
    onSubmit: action('commercial-form-submitted'),
    isEditing: true,
    initialData: {
      name: "Downtown Office Complex",
      address: "555 Business Avenue, Financial District, NY 10005",
      type: "commercial",
      units: "20",
      description: "Modern office building with 20 office suites. Features include elevator access, conference rooms, shared reception area, and parking garage.",
    },
  },
};

// Responsive design showcase
export const ResponsiveLayout: Story = {
  args: {
    onSubmit: action('responsive-form-submitted'),
    isEditing: false,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  render: (args) => (
    <div>
      <div className="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This story demonstrates how the form adapts to different screen sizes.
          Try switching between different viewports in the toolbar above.
        </p>
      </div>
      <PropertyForm {...args} />
    </div>
  ),
};

// Custom styling example
export const CustomStyling: Story = {
  args: {
    onSubmit: action('custom-styled-form-submitted'),
    isEditing: false,
    className: "max-w-2xl mx-auto",
  },
  render: (args) => (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 dark:from-gray-900 dark:to-gray-800">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Add New Property
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Fill in the details below to add a new property to your portfolio
        </p>
      </div>
      <PropertyForm {...args} />
    </div>
  ),
};

// Interactive demo with state management
export const InteractiveDemo: Story = {
  args: {
    onSubmit: action('interactive-form-submitted'),
    isEditing: false,
  },
  render: (args) => (
    <div>
      <div className="mb-6 space-y-4">
        <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
          <h3 className="font-medium text-green-900 dark:text-green-100">
            Interactive Property Form
          </h3>
          <p className="mt-1 text-sm text-green-700 dark:text-green-300">
            This form includes real-time validation, proper error handling, and 
            responsive design. Fill it out to see all features in action.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
            <h4 className="font-medium text-gray-900 dark:text-white">Validation</h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Try submitting without required fields
            </p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
            <h4 className="font-medium text-gray-900 dark:text-white">Property Types</h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Choose from 5 different property types
            </p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
            <h4 className="font-medium text-gray-900 dark:text-white">Responsive</h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Layout adapts to screen size
            </p>
          </div>
        </div>
      </div>
      
      <PropertyForm {...args} />
    </div>
  ),
};