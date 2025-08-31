import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from '../../../apps/frontend/src/components/ui/textarea';

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea System',
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    placeholder: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
    rows: {
      control: { type: 'number', min: 1, max: 20 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic Textarea Variants
export const BasicTextareas: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <h3 className="text-lg font-semibold">Basic Textarea Components</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Default Textarea</label>
          <Textarea placeholder="Type your message here..." />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">With Default Value</label>
          <Textarea 
            defaultValue="This textarea has some default content that demonstrates how text wraps and fills the available space."
            placeholder="Enter your text..."
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Larger Textarea</label>
          <Textarea 
            placeholder="This is a larger textarea for longer content..."
            className="min-h-32"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Fixed Rows</label>
          <Textarea 
            rows={5}
            placeholder="This textarea has exactly 5 rows..."
          />
        </div>
      </div>
    </div>
  ),
};

// Property Description Form
export const PropertyDescriptionForm: Story = {
  render: () => (
    <div className="space-y-6 w-full max-w-2xl">
      <div className="text-center">
        <div className="i-lucide-home mx-auto h-8 w-8 text-primary mb-2" />
        <h3 className="text-lg font-semibold">Property Description</h3>
        <p className="text-sm text-muted-foreground">Provide a detailed description of your property</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Property Overview
            <span className="text-muted-foreground font-normal"> (Required)</span>
          </label>
          <Textarea 
            placeholder="Describe the property's key features, layout, and overall appeal. Mention unique selling points that would attract potential tenants..."
            className="min-h-24"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Write a compelling overview that highlights what makes your property special.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Interior Features</label>
            <Textarea 
              placeholder="• Hardwood floors throughout
• Updated kitchen with granite countertops
• In-unit washer/dryer
• Walk-in closets
• Central air conditioning"
              className="min-h-32"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Building Amenities</label>
            <Textarea 
              placeholder="• 24/7 doorman
• Fitness center
• Rooftop terrace
• Package room
• Bike storage
• Pet-friendly"
              className="min-h-32"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Neighborhood & Transportation</label>
          <Textarea 
            placeholder="Located in the heart of downtown with easy access to public transportation. Walking distance to grocery stores, restaurants, parks, and entertainment venues. Close to subway lines and major bus routes..."
            className="min-h-20"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Additional Notes
            <span className="text-muted-foreground font-normal"> (Optional)</span>
          </label>
          <Textarea 
            placeholder="Any additional information about parking, pets, lease terms, or special considerations..."
            className="min-h-16"
          />
        </div>
      </div>
    </div>
  ),
};

// Maintenance Request Form
export const MaintenanceRequestForm: Story = {
  render: () => (
    <div className="space-y-6 w-full max-w-xl">
      <div className="text-center">
        <div className="i-lucide-wrench mx-auto h-8 w-8 text-primary mb-2" />
        <h3 className="text-lg font-semibold">Maintenance Request</h3>
        <p className="text-sm text-muted-foreground">Report an issue that needs attention</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Issue Description *
          </label>
          <Textarea 
            placeholder="Please describe the maintenance issue in detail. Include what's not working, when you first noticed the problem, and any attempts you've made to fix it..."
            className="min-h-24"
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">
            The more details you provide, the better we can help resolve the issue.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Location in Unit
          </label>
          <Textarea 
            placeholder="Where exactly is the problem located? (e.g., kitchen sink, bedroom ceiling, living room window, etc.)"
            className="min-h-16"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Urgency Level & Preferred Time
          </label>
          <Textarea 
            placeholder="Is this an emergency? When would be the best time for maintenance to visit? Any access instructions or scheduling preferences..."
            className="min-h-20"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Additional Comments
            <span className="text-muted-foreground font-normal"> (Optional)</span>
          </label>
          <Textarea 
            placeholder="Any other information that might be helpful..."
            className="min-h-16"
          />
        </div>
      </div>
    </div>
  ),
};

// Tenant Communication Form
export const TenantCommunicationForm: Story = {
  render: () => (
    <div className="space-y-6 w-full max-w-xl">
      <div className="text-center">
        <div className="i-lucide-message-square mx-auto h-8 w-8 text-primary mb-2" />
        <h3 className="text-lg font-semibold">Message to Landlord</h3>
        <p className="text-sm text-muted-foreground">Send a message about your tenancy</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Subject</label>
          <input 
            type="text"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Brief subject line..."
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Message</label>
          <Textarea 
            placeholder="Hi [Landlord Name],

I wanted to reach out about...

Please let me know if you need any additional information.

Best regards,
[Your Name]"
            className="min-h-40"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Be clear and professional in your communication.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Request Response By
            <span className="text-muted-foreground font-normal"> (Optional)</span>
          </label>
          <Textarea 
            placeholder="If this is time-sensitive, please indicate when you need a response..."
            className="min-h-16"
          />
        </div>
      </div>
    </div>
  ),
};

// Review & Feedback Form
export const ReviewFeedbackForm: Story = {
  render: () => (
    <div className="space-y-6 w-full max-w-xl">
      <div className="text-center">
        <div className="i-lucide-file-text mx-auto h-8 w-8 text-primary mb-2" />
        <h3 className="text-lg font-semibold">Property Review</h3>
        <p className="text-sm text-muted-foreground">Share your experience living here</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Overall Experience</label>
          <Textarea 
            placeholder="How would you describe your overall experience living in this property? What do you like most about it?"
            className="min-h-24"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Pros</label>
            <Textarea 
              placeholder="• Great location
• Responsive management  
• Well-maintained building
• Quiet neighborhood
• Good value for money"
              className="min-h-32"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Areas for Improvement</label>
            <Textarea 
              placeholder="• Parking could be better
• Laundry room needs updating
• Would like faster internet
• More bike storage needed"
              className="min-h-32"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Would you recommend this property?</label>
          <Textarea 
            placeholder="Would you recommend this property to others? Why or why not? What type of tenant would be a good fit?"
            className="min-h-20"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Additional Comments
            <span className="text-muted-foreground font-normal"> (Optional)</span>
          </label>
          <Textarea 
            placeholder="Any other feedback or suggestions..."
            className="min-h-16"
          />
        </div>
      </div>
    </div>
  ),
};

// Validation States
export const ValidationStates: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <h3 className="text-lg font-semibold">Validation States</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Valid Textarea</label>
          <Textarea 
            defaultValue="This textarea has valid content and shows a success state."
            className="border-green-500 focus:border-green-500 focus:ring-green-500/20"
          />
          <div className="mt-1 flex items-center gap-1 text-sm text-green-600">
            <div className="i-lucide-check-circle-2 h-3 w-3" />
            Content looks good!
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block text-destructive">Textarea with Error</label>
          <Textarea 
            defaultValue="This content is invalid"
            className="border-destructive focus:border-destructive focus:ring-destructive/20"
            aria-invalid="true"
          />
          <div className="mt-1 flex items-center gap-1 text-sm text-destructive">
            <div className="i-lucide-alert-circle h-3 w-3" />
            Please provide a more detailed description (minimum 50 characters).
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Required Field *</label>
          <Textarea 
            placeholder="This field is required..."
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Fields marked with * are required.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block opacity-50">Disabled Textarea</label>
          <Textarea 
            disabled
            defaultValue="This textarea is disabled and cannot be edited."
          />
        </div>
      </div>
    </div>
  ),
};

// Character Counting
export const CharacterCounting: Story = {
  render: () => {
    const [value, setValue] = React.useState('');
    const maxLength = 500;
    const remaining = maxLength - value.length;
    
    return (
      <div className="space-y-6 w-96">
        <h3 className="text-lg font-semibold">Character Counting</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Property Description
              <span className="text-muted-foreground font-normal"> ({maxLength} characters max)</span>
            </label>
            <div className="relative">
              <Textarea 
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Describe your property..."
                className="min-h-24"
                maxLength={maxLength}
              />
              <div className={`absolute bottom-2 right-2 text-xs ${
                remaining < 50 ? 'text-orange-500' : 
                remaining < 0 ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {value.length}/{maxLength}
              </div>
            </div>
            <p className={`mt-1 text-xs ${
              remaining < 50 ? 'text-orange-500' : 
              remaining < 0 ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              {remaining >= 0 ? `${remaining} characters remaining` : `${Math.abs(remaining)} characters over limit`}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Short Note (100 chars)</label>
            <div className="relative">
              <Textarea 
                placeholder="Quick note..."
                className="min-h-16"
                maxLength={100}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Long Description (1000 chars)</label>
            <div className="relative">
              <Textarea 
                placeholder="Detailed description..."
                className="min-h-32"
                maxLength={1000}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
};

// Resizable Textareas
export const ResizableTextareas: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <h3 className="text-lg font-semibold">Resizable Options</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Auto-resize (Default)</label>
          <Textarea 
            placeholder="This textarea will auto-resize as you type..."
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Uses field-sizing-content CSS property for automatic resizing.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Fixed Height</label>
          <Textarea 
            placeholder="This textarea has a fixed height..."
            className="resize-none h-20"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Cannot be resized by the user.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Vertical Resize Only</label>
          <Textarea 
            placeholder="This textarea can only be resized vertically..."
            className="resize-y min-h-20"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Drag the bottom-right corner to resize vertically.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Fully Resizable</label>
          <Textarea 
            placeholder="This textarea can be resized in both directions..."
            className="resize min-h-20"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Drag the bottom-right corner to resize in any direction.
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
        All textareas include proper ARIA labels, descriptions, and error handling.
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Message *
            <span className="text-muted-foreground font-normal"> (Required)</span>
          </label>
          <Textarea 
            placeholder="Enter your message"
            aria-required="true"
            aria-describedby="message-description message-error"
          />
          <p id="message-description" className="mt-1 text-xs text-muted-foreground">
            Please provide a detailed message about your inquiry.
          </p>
          <p id="message-error" className="mt-1 text-xs text-destructive">
            This field is required and must be at least 10 characters long.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Comments
            <span className="text-muted-foreground font-normal"> (Optional)</span>
          </label>
          <Textarea 
            placeholder="Additional comments..."
            aria-describedby="comments-help"
          />
          <p id="comments-help" className="mt-1 text-xs text-muted-foreground">
            Optional field for any additional information you'd like to share.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Feedback
          </label>
          <Textarea 
            placeholder="Your feedback is important to us..."
            aria-label="Feedback about our service"
            aria-describedby="feedback-help"
          />
          <p id="feedback-help" className="mt-1 text-xs text-muted-foreground">
            Help us improve by sharing your thoughts and suggestions.
          </p>
        </div>
      </div>
    </div>
  ),
};

// Interactive Playground
export const Playground: Story = {
  args: {
    placeholder: 'Enter your text here...',
    disabled: false,
    rows: 4,
  },
  render: (args) => (
    <div className="w-96">
      <label className="text-sm font-medium mb-2 block">Interactive Playground</label>
      <Textarea {...args} />
      <p className="mt-1 text-xs text-muted-foreground">
        Adjust the controls to see how different props affect the textarea.
      </p>
    </div>
  ),
};