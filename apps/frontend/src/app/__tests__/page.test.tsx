/**
 * Tests for Landing Page (Homepage)
 * Tests the main conversion page with all critical sections
 */

import { render, screen } from '@testing-library/react'
import HomePage from '../(public)/page'

// Mock all landing page components
jest.mock('@/components/landing', () => ({
	NavigationSection: jest.fn(() => (
		<nav data-testid="navigation-section">
			<div>TenantFlow</div>
			<a href="/login">Sign In</a>
			<a href="/signup">Get Started</a>
		</nav>
	)),
	HeroSection: jest.fn(() => (
		<section data-testid="hero-section">
			<h1>Property Management Made Simple</h1>
			<p>
				Save 10+ hours per week with the all-in-one property management
				platform
			</p>
			<a href="/signup">Start Free Trial</a>
		</section>
	)),
	StatsSection: jest.fn(() => (
		<section data-testid="stats-section">
			<div>10,000+ Property Managers</div>
			<div>500,000+ Units Managed</div>
			<div>99.9% Uptime</div>
		</section>
	)),
	FeaturesSection: jest.fn(() => (
		<section data-testid="features-section">
			<h2>Everything You Need</h2>
			<div>Property Management</div>
			<div>Tenant Management</div>
			<div>Maintenance Tracking</div>
		</section>
	)),
	TestimonialsSection: jest.fn(() => (
		<section data-testid="testimonials-section">
			<h2>What Our Customers Say</h2>
			<div>"TenantFlow saved me 15 hours per week"</div>
		</section>
	)),
	PricingSection: jest.fn(() => (
		<section data-testid="pricing-section">
			<h2>Simple, Transparent Pricing</h2>
			<div>Free Trial</div>
			<div>Starter - $29/month</div>
			<div>Growth - $79/month</div>
		</section>
	)),
	CTASection: jest.fn(() => (
		<section data-testid="cta-section">
			<h2>Ready to Get Started?</h2>
			<a href="/signup">Start Your Free Trial</a>
		</section>
	)),
	FooterSection: jest.fn(() => (
		<footer data-testid="footer-section">
			<div>© 2024 TenantFlow</div>
			<a href="/privacy-policy">Privacy Policy</a>
			<a href="/terms-of-service">Terms of Service</a>
		</footer>
	))
}))

// Mock OAuth redirect handler
jest.mock('@/components/auth/oauth-redirect-handler', () => ({
	OAuthRedirectHandler: jest.fn(() => (
		<div data-testid="oauth-redirect-handler" />
	))
}))

// Mock SEO component
jest.mock('@/components/seo/seo', () => ({
	SEO: jest.fn(() => <div data-testid="seo" />)
}))

describe.skip('Landing Page (Homepage)', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe.skip('Page Structure', () => {
		it('renders all essential sections in correct order', () => {
			render(<HomePage />)

			// Verify all sections are present
			expect(screen.getByTestId('seo')).toBeInTheDocument()
			expect(screen.getByTestId('navigation-section')).toBeInTheDocument()
			expect(screen.getByTestId('hero-section')).toBeInTheDocument()
			expect(screen.getByTestId('stats-section')).toBeInTheDocument()
			expect(screen.getByTestId('features-section')).toBeInTheDocument()
			expect(
				screen.getByTestId('testimonials-section')
			).toBeInTheDocument()
			expect(screen.getByTestId('pricing-section')).toBeInTheDocument()
			expect(screen.getByTestId('cta-section')).toBeInTheDocument()
			expect(screen.getByTestId('footer-section')).toBeInTheDocument()
			expect(
				screen.getByTestId('oauth-redirect-handler')
			).toBeInTheDocument()
		})

		it('renders sections in the correct order for user journey', () => {
			const { container } = render(<HomePage />)

			const sections = Array.from(
				container.querySelectorAll(
					'[data-testid*="-section"], [data-testid="seo"], [data-testid="oauth-redirect-handler"]'
				)
			)
			const sectionOrder = sections.map(section =>
				section.getAttribute('data-testid')
			)

			expect(sectionOrder).toEqual([
				'seo',
				'navigation-section',
				'hero-section',
				'stats-section',
				'features-section',
				'testimonials-section',
				'pricing-section',
				'cta-section',
				'footer-section',
				'oauth-redirect-handler'
			])
		})
	})

	describe.skip('SEO and Meta Information', () => {
		it('includes SEO component with correct props', () => {
			const { SEO } = jest.requireMock('@/components/seo/seo')

			render(<HomePage />)

			expect(SEO).toHaveBeenCalledWith(
				{
					title: expect.any(String),
					description: expect.any(String),
					keywords: expect.any(String),
					includeProduct: true,
					faqs: expect.any(Array)
				},
				undefined
			)
		})

		it('has proper metadata configuration', () => {
			// Test metadata export
			const { metadata } = jest.requireMock('../(public)/page')

			expect(metadata).toEqual({
				title: 'TenantFlow - Property Management Made Simple',
				description:
					'Save 10+ hours per week with the all-in-one property management platform trusted by 10,000+ property managers. Start your free 14-day trial.',
				openGraph: {
					title: 'TenantFlow - Property Management Made Simple',
					description:
						'Save 10+ hours per week with the all-in-one property management platform trusted by 10,000+ property managers.',
					type: 'website'
				}
			})
		})
	})

	describe.skip('Critical Conversion Elements', () => {
		it('displays main value proposition in hero section', () => {
			render(<HomePage />)

			expect(
				screen.getByText('Property Management Made Simple')
			).toBeInTheDocument()
			expect(
				screen.getByText(/Save 10\+ hours per week/)
			).toBeInTheDocument()
		})

		it('shows social proof through stats', () => {
			render(<HomePage />)

			expect(
				screen.getByText(/10,000\+ Property Managers/)
			).toBeInTheDocument()
			expect(
				screen.getByText(/500,000\+ Units Managed/)
			).toBeInTheDocument()
			expect(screen.getByText(/99\.9% Uptime/)).toBeInTheDocument()
		})

		it('displays key features for value demonstration', () => {
			render(<HomePage />)

			expect(screen.getByText('Everything You Need')).toBeInTheDocument()
			expect(screen.getByText('Property Management')).toBeInTheDocument()
			expect(screen.getByText('Tenant Management')).toBeInTheDocument()
			expect(screen.getByText('Maintenance Tracking')).toBeInTheDocument()
		})

		it('includes customer testimonials for credibility', () => {
			render(<HomePage />)

			expect(
				screen.getByText('What Our Customers Say')
			).toBeInTheDocument()
			expect(
				screen.getByText(/"TenantFlow saved me 15 hours per week"/)
			).toBeInTheDocument()
		})

		it('shows pricing information for transparency', () => {
			render(<HomePage />)

			expect(
				screen.getByText('Simple, Transparent Pricing')
			).toBeInTheDocument()
			expect(screen.getByText('Free Trial')).toBeInTheDocument()
			expect(screen.getByText('Starter - $29/month')).toBeInTheDocument()
			expect(screen.getByText('Growth - $79/month')).toBeInTheDocument()
		})
	})

	describe.skip('Call-to-Action Elements', () => {
		it('includes primary CTA in hero section', () => {
			render(<HomePage />)

			const heroStartButton = screen.getByText('Start Free Trial')
			expect(heroStartButton).toBeInTheDocument()
			expect(heroStartButton.closest('a')).toHaveAttribute(
				'href',
				'/signup'
			)
		})

		it('includes navigation CTAs', () => {
			render(<HomePage />)

			const signInLink = screen.getByText('Sign In')
			const getStartedLink = screen.getByText('Get Started')

			expect(signInLink.closest('a')).toHaveAttribute('href', '/login')
			expect(getStartedLink.closest('a')).toHaveAttribute(
				'href',
				'/signup'
			)
		})

		it('includes final CTA section', () => {
			render(<HomePage />)

			expect(
				screen.getByText('Ready to Get Started?')
			).toBeInTheDocument()

			const finalCTA = screen.getByText('Start Your Free Trial')
			expect(finalCTA.closest('a')).toHaveAttribute('href', '/signup')
		})
	})

	describe.skip('Authentication Integration', () => {
		it('includes OAuth redirect handler for authentication flow', () => {
			render(<HomePage />)

			expect(
				screen.getByTestId('oauth-redirect-handler')
			).toBeInTheDocument()
		})
	})

	describe.skip('Legal and Trust Elements', () => {
		it('includes footer with legal links', () => {
			render(<HomePage />)

			expect(screen.getByText('© 2024 TenantFlow')).toBeInTheDocument()

			const privacyLink = screen.getByText('Privacy Policy')
			const termsLink = screen.getByText('Terms of Service')

			expect(privacyLink.closest('a')).toHaveAttribute(
				'href',
				'/privacy-policy'
			)
			expect(termsLink.closest('a')).toHaveAttribute(
				'href',
				'/terms-of-service'
			)
		})
	})

	describe.skip('Component Integration', () => {
		it('calls all landing page components', () => {
			const landingComponents = jest.requireMock('@/components/landing')

			render(<HomePage />)

			expect(landingComponents.NavigationSection).toHaveBeenCalled()
			expect(landingComponents.HeroSection).toHaveBeenCalled()
			expect(landingComponents.StatsSection).toHaveBeenCalled()
			expect(landingComponents.FeaturesSection).toHaveBeenCalled()
			expect(landingComponents.TestimonialsSection).toHaveBeenCalled()
			expect(landingComponents.PricingSection).toHaveBeenCalled()
			expect(landingComponents.CTASection).toHaveBeenCalled()
			expect(landingComponents.FooterSection).toHaveBeenCalled()
		})
	})

	describe.skip('Accessibility', () => {
		it('has proper heading structure', () => {
			render(<HomePage />)

			// Main value proposition should be in h1
			expect(
				screen.getByRole('heading', {
					level: 1,
					name: /Property Management Made Simple/
				})
			).toBeInTheDocument()

			// Section headings should be h2
			expect(
				screen.getByRole('heading', {
					level: 2,
					name: /Everything You Need/
				})
			).toBeInTheDocument()
			expect(
				screen.getByRole('heading', {
					level: 2,
					name: /What Our Customers Say/
				})
			).toBeInTheDocument()
			expect(
				screen.getByRole('heading', {
					level: 2,
					name: /Simple, Transparent Pricing/
				})
			).toBeInTheDocument()
			expect(
				screen.getByRole('heading', {
					level: 2,
					name: /Ready to Get Started/
				})
			).toBeInTheDocument()
		})

		it('has accessible navigation structure', () => {
			render(<HomePage />)

			expect(screen.getByRole('navigation')).toBeInTheDocument()
		})

		it('includes footer for site structure', () => {
			render(<HomePage />)

			expect(screen.getByRole('contentinfo')).toBeInTheDocument()
		})
	})

	describe.skip('Performance Considerations', () => {
		it('is a server component (no client-side state)', () => {
			// This test ensures the page remains a server component
			// by checking it doesn't use any client-side features
			const pageModule = jest.requireMock('../(public)/page')
			const pageSource = pageModule.default.toString()

			// Should not contain useState, useEffect, or other client hooks
			expect(pageSource).not.toMatch(
				/useState|useEffect|useCallback|useMemo/
			)
		})
	})
})
