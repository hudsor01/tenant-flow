import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PricingHeader } from '../../../../apps/frontend/src/components/pricing/pricing-header'

const meta = {
	title: 'Testing/Visual Regression Demo',
	component: PricingHeader,
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component: `
**Visual Regression Testing Demonstration**

This story demonstrates comprehensive visual regression testing capabilities with Chromatic.

**Features Tested:**
- Multi-viewport responsive design
- Theme variations (light/dark)
- Interaction states
- Animation consistency
- Typography rendering
- Color accuracy
- Layout stability

**Test Configuration:**
- Desktop: 1920x1080, 1366x768
- Tablet: 768x1024, 1024x768  
- Mobile: 375x667, 414x896
- Accessibility: High contrast, reduced motion
        `
			}
		},
		// Visual regression testing configuration
		chromatic: {
			viewports: [375, 768, 1024, 1366, 1920],
			delay: 1000, // Wait for animations to complete
			diffThreshold: 0.2, // Allow 20% difference for minor rendering changes
			pauseAnimationAtEnd: true,
			modes: {
				light: { theme: 'light' },
				dark: { theme: 'dark' },
				'high-contrast': { theme: 'high-contrast' },
				'reduced-motion': {
					theme: 'light',
					reducedMotion: 'reduce'
				}
			}
		},
		// Performance testing
		performance: {
			thresholds: {
				fcp: 1000, // First Contentful Paint < 1s
				lcp: 2000, // Largest Contentful Paint < 2s
				tbt: 300, // Total Blocking Time < 300ms
				cls: 0.1 // Cumulative Layout Shift < 0.1
			}
		}
	},
	tags: ['autodocs', 'visual-test'],
	argTypes: {
		title: {
			control: 'text',
			description: 'Main heading text'
		},
		subtitle: {
			control: 'text',
			description: 'Subtitle text'
		},
		theme: {
			control: 'select',
			options: ['light', 'dark', 'high-contrast'],
			description: 'Theme variant for visual testing'
		}
	}
} satisfies Meta<typeof PricingHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Baseline: Story = {
	args: {
		title: 'Choose the perfect plan for your property management needs',
		subtitle:
			'Transparent pricing with no hidden fees. Upgrade or downgrade anytime.'
	},
	parameters: {
		docs: {
			description: {
				story: 'Baseline story for visual regression testing - captures the default state'
			}
		}
	}
}

export const LongContent: Story = {
	args: {
		title: 'Choose the perfect comprehensive property management solution for all your residential and commercial real estate portfolio management needs',
		subtitle:
			'Completely transparent pricing structure with absolutely no hidden fees, charges, or surprise costs. Easily upgrade or downgrade your subscription plan anytime with immediate effect and prorated billing adjustments.'
	},
	parameters: {
		docs: {
			description: {
				story: 'Long content variation to test text wrapping and layout stability'
			}
		}
	}
}

export const ShortContent: Story = {
	args: {
		title: 'Simple Plans',
		subtitle: 'No fees.'
	},
	parameters: {
		docs: {
			description: {
				story: 'Minimal content to test layout with short text'
			}
		}
	}
}

export const EmptyState: Story = {
	args: {
		title: '',
		subtitle: ''
	},
	parameters: {
		docs: {
			description: {
				story: 'Empty state to test graceful handling of missing content'
			}
		}
	}
}

export const SpecialCharacters: Story = {
	args: {
		title: 'Pricing & Plans → ¡Choose Wisely! 💰',
		subtitle: 'Müller & Söhne GmbH — €99/month • £79/month • ¥10,000/month'
	},
	parameters: {
		docs: {
			description: {
				story: 'Special characters and Unicode symbols to test font rendering'
			}
		}
	}
}

// Interaction testing for visual regression
export const HoverStates: Story = {
	args: {
		title: 'Interactive Elements Test',
		subtitle: 'Hover and focus states for visual regression testing'
	},
	parameters: {
		docs: {
			description: {
				story: 'Captures hover and focus states for interactive elements'
			}
		}
	},
	play: async ({ canvasElement }) => {
		// This would be used by Storybook test runner for interaction testing
		// Note: Visual regression captures are taken after interactions complete
		const canvas = canvasElement
		const buttons = canvas.querySelectorAll('button')

		// Simulate hover states for screenshot capture
		buttons.forEach(button => {
			button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
		})
	}
}

// Mobile-specific visual test
export const MobileOptimized: Story = {
	args: {
		title: 'Mobile Layout Test',
		subtitle: 'Responsive design verification'
	},
	parameters: {
		viewport: {
			defaultViewport: 'iphone12'
		},
		chromatic: {
			viewports: [375, 414] // Test only mobile viewports
		},
		docs: {
			description: {
				story: 'Mobile-specific layout testing for responsive design verification'
			}
		}
	}
}

// Performance-focused test
export const PerformanceBaseline: Story = {
	args: {
		title: 'Performance Testing Baseline',
		subtitle: 'Measuring rendering performance for regression detection'
	},
	parameters: {
		docs: {
			description: {
				story: 'Performance baseline for detecting rendering performance regressions'
			}
		}
	}
}

// Accessibility-focused visual test
export const AccessibilityFocused: Story = {
	args: {
		title: 'Accessibility Visual Test',
		subtitle: 'High contrast and focus indicator testing'
	},
	parameters: {
		a11y: {
			config: {
				rules: [
					{ id: 'color-contrast', enabled: true },
					{ id: 'focus-order-semantics', enabled: true }
				]
			}
		},
		docs: {
			description: {
				story: 'Accessibility-focused visual testing with high contrast and focus states'
			}
		}
	}
}
