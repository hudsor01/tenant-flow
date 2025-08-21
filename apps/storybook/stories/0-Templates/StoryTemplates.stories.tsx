import React from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn, expect, userEvent, within } from 'storybook/test'
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Code, Copy, FileText, Lightbulb, Zap } from 'lucide-react'
import { UIComponentErrorBoundary } from '../utils/GranularErrorBoundaries'

const meta = {
	title: '🎯 Templates/Story Templates',
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Comprehensive TypeScript templates for creating consistent, well-tested Storybook stories.'
			}
		}
	},
	decorators: [
		Story => (
			<UIComponentErrorBoundary>
				<Story />
			</UIComponentErrorBoundary>
		)
	]
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// Template examples with copy functionality
const CodeBlock: React.FC<{
	title: string
	code: string
	language: string
}> = ({ title, code, language }) => {
	const [copied, setCopied] = React.useState(false)

	const copyToClipboard = async () => {
		await navigator.clipboard.writeText(code)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-lg">
						<Code className="h-5 w-5" />
						{title}
					</CardTitle>
					<Button
						onClick={copyToClipboard}
						size="sm"
						variant="outline"
						className="h-8 w-8 p-0"
						data-testid={`copy-${title.toLowerCase().replace(/\s+/g, '-')}`}
					>
						<Copy className="h-4 w-4" />
					</Button>
				</div>
				{copied && (
					<div className="text-sm font-medium text-green-600">
						Copied to clipboard!
					</div>
				)}
			</CardHeader>
			<CardContent>
				<pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-sm">
					<code className={`language-${language}`}>{code}</code>
				</pre>
			</CardContent>
		</Card>
	)
}

// Template code strings
const basicComponentTemplate = `import React from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn, expect, userEvent, within } from 'storybook/test';
import { YourComponent } from '@/components/your-component';
import { UIComponentErrorBoundary } from '../utils/GranularErrorBoundaries';

// Define component props interface
interface YourComponentProps {
  title: string;
  description?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'secondary';
}

const meta = {
  title: 'Components/YourComponent',
  component: YourComponent,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A reusable component with interactive testing and error boundaries.',
      },
    },
  },
  decorators: [
    (Story) => (
      <UIComponentErrorBoundary>
        <Story />
      </UIComponentErrorBoundary>
    ),
  ],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary'],
    },
    disabled: { control: 'boolean' },
    onClick: { action: 'clicked' },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof YourComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Default Component',
    description: 'This is the default state',
  },
};

export const WithInteraction: Story = {
  args: {
    title: 'Interactive Component',
    description: 'This story includes user interaction testing',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Test component rendering
    const component = canvas.getByRole('button');
    await expect(component).toBeInTheDocument();
    
    // Test user interaction
    await userEvent.click(component);
    
    // Test keyboard navigation
    await userEvent.keyboard('{Tab}');
    await expect(component).toHaveFocus();
  },
};`

const businessComponentTemplate = `import React from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn, expect, userEvent, within } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { BusinessComponent } from '@/components/business/business-component';
import { BusinessComponentErrorBoundary } from '../utils/GranularErrorBoundaries';
import { mockBusinessData } from '../utils/mockData';

const meta = {
  title: 'Business/BusinessComponent',
  component: BusinessComponent,
  parameters: {
    layout: 'padded',
    msw: {
      handlers: [
        http.get('/api/business-data', () => {
          return HttpResponse.json(mockBusinessData);
        }),
        http.post('/api/business-action', async ({ request }) => {
          const data = await request.json();
          return HttpResponse.json({ success: true, data });
        }),
      ],
    },
  },
  decorators: [
    (Story) => (
      <BusinessComponentErrorBoundary>
        <Story />
      </BusinessComponentErrorBoundary>
    ),
  ],
} satisfies Meta<typeof BusinessComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: mockBusinessData[0],
  },
};

export const WithApiInteraction: Story = {
  args: {
    data: mockBusinessData[0],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Test initial render
    const component = canvas.getByTestId('business-component');
    await expect(component).toBeVisible();
    
    // Test API interaction
    const actionButton = canvas.getByRole('button', { name: /perform action/i });
    await userEvent.click(actionButton);
    
    // Wait for API response
    await canvas.findByText('Action completed successfully');
  },
};

export const LoadingState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/business-data', () => {
          return new Promise(() => {}); // Never resolves = loading state
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Test loading state
    await canvas.findByTestId('loading-spinner');
  },
};

export const ErrorState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/business-data', () => {
          return HttpResponse.json(
            { error: 'API Error' },
            { status: 500 }
          );
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Test error state
    await canvas.findByText(/error loading data/i);
  },
};`

const formComponentTemplate = `import React from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn, expect, userEvent, within } from 'storybook/test';
import { FormComponent } from '@/components/forms/form-component';
import { FormComponentErrorBoundary } from '../utils/GranularErrorBoundaries';

const meta = {
  title: 'Forms/FormComponent',
  component: FormComponent,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <FormComponentErrorBoundary>
        <div className="max-w-md mx-auto">
          <Story />
        </div>
      </FormComponentErrorBoundary>
    ),
  ],
  args: {
    onSubmit: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof FormComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValidation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Test form validation
    const submitButton = canvas.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);
    
    // Should show validation errors
    await canvas.findByText(/required field/i);
  },
};

export const FilledForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Fill out form
    const nameInput = canvas.getByLabelText(/name/i);
    await userEvent.type(nameInput, 'John Doe');
    
    const emailInput = canvas.getByLabelText(/email/i);
    await userEvent.type(emailInput, 'john@example.com');
    
    // Submit form
    const submitButton = canvas.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);
    
    // Should submit successfully
    await expect(submitButton).toBeDisabled();
  },
};`

const accessibilityTemplate = `import React from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { AccessibleComponent } from '@/components/accessible-component';

const meta = {
  title: 'Accessibility/AccessibleComponent',
  component: AccessibleComponent,
  parameters: {
    layout: 'centered',
    // Enable accessibility testing
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'keyboard-navigation', enabled: true },
          { id: 'aria-labels', enabled: true },
        ],
      },
    },
  },
  tags: ['test'], // Include in accessibility testing
} satisfies Meta<typeof AccessibleComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AccessibilityCompliant: Story = {
  args: {
    'aria-label': 'Accessible component example',
    role: 'button',
    tabIndex: 0,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Test keyboard navigation
    const component = canvas.getByRole('button');
    await userEvent.tab();
    await expect(component).toHaveFocus();
    
    // Test keyboard activation
    await userEvent.keyboard('{Enter}');
    
    // Test screen reader compatibility
    await expect(component).toHaveAccessibleName();
  },
};

export const HighContrast: Story = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#000000' }],
    },
  },
  args: {
    'aria-label': 'High contrast component',
    className: 'text-white border-white',
  },
};`

const performanceTemplate = `import React from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { PerformanceComponent } from '@/components/performance-component';

// Mock performance API for testing
const mockPerformanceObserver = {
  observe: jest.fn(),
  disconnect: jest.fn(),
};

// Performance measurement hook
const usePerformanceMeasure = (componentName: string) => {
  React.useEffect(() => {
    performance.mark(\`\${componentName}-start\`);
    
    return () => {
      performance.mark(\`\${componentName}-end\`);
      performance.measure(
        \`\${componentName}-render-time\`,
        \`\${componentName}-start\`,
        \`\${componentName}-end\`
      );
    };
  }, [componentName]);
};

const meta = {
  title: 'Performance/PerformanceComponent',
  component: PerformanceComponent,
  parameters: {
    layout: 'centered',
    // Performance monitoring enabled
    performance: {
      measureRenderTime: true,
      measureInteractionTime: true,
    },
  },
} satisfies Meta<typeof PerformanceComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BaselinePerformance: Story = {
  args: {
    items: Array.from({ length: 100 }, (_, i) => ({ id: i, name: \`Item \${i}\` })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Measure initial render performance
    const startTime = performance.now();
    await canvas.findByTestId('performance-component');
    const renderTime = performance.now() - startTime;
    
    console.log(\`Component rendered in \${renderTime.toFixed(2)}ms\`);
    
    // Performance assertion - should render within reasonable time
    expect(renderTime).toBeLessThan(100); // 100ms threshold
  },
};

export const LargeDataset: Story = {
  args: {
    items: Array.from({ length: 1000 }, (_, i) => ({ id: i, name: \`Item \${i}\` })),
  },
  parameters: {
    // Skip visual regression for performance stories
    chromatic: { disable: true },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    const startTime = performance.now();
    await canvas.findByTestId('performance-component');
    const renderTime = performance.now() - startTime;
    
    console.log(\`Large dataset rendered in \${renderTime.toFixed(2)}ms\`);
    
    // More generous threshold for large datasets
    expect(renderTime).toBeLessThan(500);
  },
};`

export const BasicComponentTemplate: Story = {
	render: () => (
		<div className="space-y-6">
			<div className="mb-8 text-center">
				<h1 className="mb-2 text-3xl font-bold">Storybook Templates</h1>
				<p className="text-gray-600">
					Production-ready TypeScript templates for consistent story
					creation
				</p>
			</div>

			<CodeBlock
				title="Basic Component Template"
				code={basicComponentTemplate}
				language="typescript"
			/>

			<div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
				<Card>
					<CardContent className="pt-6 text-center">
						<Lightbulb className="mx-auto mb-2 h-8 w-8 text-yellow-500" />
						<h3 className="font-semibold">Best Practices</h3>
						<p className="text-sm text-gray-600">
							Error boundaries, TypeScript types, accessibility
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="pt-6 text-center">
						<Zap className="mx-auto mb-2 h-8 w-8 text-blue-500" />
						<h3 className="font-semibold">Interactive Testing</h3>
						<p className="text-sm text-gray-600">
							User interactions, keyboard navigation, assertions
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="pt-6 text-center">
						<FileText className="mx-auto mb-2 h-8 w-8 text-green-500" />
						<h3 className="font-semibold">Documentation</h3>
						<p className="text-sm text-gray-600">
							Component descriptions, usage examples, props
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)

		// Test copy functionality
		const copyButton = canvas.getByTestId('copy-basic-component-template')
		await userEvent.click(copyButton)

		// Should show feedback
		await canvas.findByText('Copied to clipboard!')
	}
}

export const BusinessComponentTemplate: Story = {
	render: () => (
		<div className="space-y-6">
			<CodeBlock
				title="Business Component Template with MSW"
				code={businessComponentTemplate}
				language="typescript"
			/>

			<Card>
				<CardHeader>
					<CardTitle>Key Features</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="space-y-2">
						<li className="flex items-center gap-2">
							<Badge variant="outline" className="text-xs">
								API
							</Badge>
							MSW integration for realistic API mocking
						</li>
						<li className="flex items-center gap-2">
							<Badge variant="outline" className="text-xs">
								Error
							</Badge>
							Business-specific error boundary
						</li>
						<li className="flex items-center gap-2">
							<Badge variant="outline" className="text-xs">
								States
							</Badge>
							Loading, error, and success state testing
						</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	)
}

export const FormComponentTemplate: Story = {
	render: () => (
		<div className="space-y-6">
			<CodeBlock
				title="Form Component Template"
				code={formComponentTemplate}
				language="typescript"
			/>

			<Card>
				<CardHeader>
					<CardTitle>Form Testing Features</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="space-y-2">
						<li>• Form validation testing</li>
						<li>• Input interaction simulation</li>
						<li>• Submit flow verification</li>
						<li>• Error state handling</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	)
}

export const AccessibilityTemplate: Story = {
	render: () => (
		<div className="space-y-6">
			<CodeBlock
				title="Accessibility Testing Template"
				code={accessibilityTemplate}
				language="typescript"
			/>

			<Card>
				<CardHeader>
					<CardTitle>Accessibility Features</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="space-y-2">
						<li>• WCAG 2.1 AA compliance testing</li>
						<li>• Keyboard navigation verification</li>
						<li>• Screen reader compatibility</li>
						<li>• High contrast mode support</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	)
}

export const PerformanceTemplate: Story = {
	render: () => (
		<div className="space-y-6">
			<CodeBlock
				title="Performance Testing Template"
				code={performanceTemplate}
				language="typescript"
			/>

			<Card>
				<CardHeader>
					<CardTitle>Performance Monitoring</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="space-y-2">
						<li>• Render time measurement</li>
						<li>• Performance assertions</li>
						<li>• Large dataset testing</li>
						<li>• Performance budgets</li>
					</ul>
				</CardContent>
			</Card>
		</div>
	)
}
