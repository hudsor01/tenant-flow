import { test, expect } from '@playwright/test'
import { VisualTestHelpers } from '../../helpers/visual-helpers'

test.describe('Pricing Page Visual Regression', () => {
  let visualHelpers: VisualTestHelpers

  test.beforeEach(async ({ page }) => {
    visualHelpers = new VisualTestHelpers(page)
    await visualHelpers.setupVisualEnvironment()
  })

  test('pricing page hero section', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pricing - TenantFlow</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              background: white;
            }
            .hero-section {
              background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%);
              color: white;
              padding: 80px 20px;
              text-align: center;
              position: relative;
              overflow: hidden;
            }
            .hero-section::before {
              content: '';
              position: absolute;
              inset: 0;
              background: radial-gradient(ellipse at center, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
              pointer-events: none;
            }
            .hero-content {
              position: relative;
              z-index: 10;
              max-width: 1200px;
              margin: 0 auto;
            }
            .hero-badge {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 12px 24px;
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 50px;
              color: #bfdbfe;
              font-size: 14px;
              font-weight: 500;
              margin-bottom: 32px;
            }
            .hero-title {
              font-size: 64px;
              font-weight: 700;
              line-height: 1.1;
              margin: 0 0 24px 0;
              letter-spacing: -0.02em;
            }
            .hero-gradient-text {
              background: linear-gradient(135deg, #bfdbfe 0%, #c4b5fd 50%, #d8b4fe 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
            .hero-subtitle {
              font-size: 24px;
              color: rgba(191, 219, 254, 0.9);
              margin: 0 0 48px 0;
              max-width: 800px;
              margin-left: auto;
              margin-right: auto;
              line-height: 1.6;
              font-weight: 300;
            }
            .billing-toggle {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 12px;
              padding: 4px;
              display: inline-flex;
              align-items: center;
              margin-bottom: 32px;
            }
            .toggle-button {
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              background: transparent;
              border: none;
              color: #bfdbfe;
              cursor: pointer;
              transition: all 0.3s;
              position: relative;
            }
            .toggle-button.active {
              background: white;
              color: #1e40af;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .toggle-button:hover:not(.active) {
              color: white;
            }
            .save-badge {
              position: absolute;
              top: -8px;
              right: -8px;
              background: #10b981;
              color: white;
              font-size: 11px;
              padding: 4px 8px;
              border-radius: 20px;
              border: 2px solid #059669;
            }
            .trust-indicators {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 32px;
              color: rgba(191, 219, 254, 0.7);
              font-size: 14px;
            }
            .trust-item {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .icon {
              width: 16px;
              height: 16px;
            }
            @media (max-width: 768px) {
              .hero-title {
                font-size: 48px;
              }
              .hero-subtitle {
                font-size: 20px;
              }
              .trust-indicators {
                flex-direction: column;
                gap: 16px;
              }
            }
          </style>
        </head>
        <body>
          <section class="hero-section" data-testid="pricing-hero">
            <div class="hero-content">
              <div class="hero-badge" data-testid="hero-badge">
                ✨ 14-Day Free Trial • No Credit Card Required
              </div>

              <h1 class="hero-title">
                Simple, Transparent{' '}
                <span class="hero-gradient-text">Pricing</span>
              </h1>

              <p class="hero-subtitle">
                Choose the perfect plan for your property management needs. Start free, upgrade when you grow.
              </p>

              <div class="billing-toggle" data-testid="billing-toggle">
                <button class="toggle-button active" data-testid="monthly-toggle">
                  Monthly
                </button>
                <button class="toggle-button" data-testid="annual-toggle" style="position: relative;">
                  Annual
                  <div class="save-badge">Save 20%</div>
                </button>
              </div>

              <div class="trust-indicators" data-testid="trust-indicators">
                <div class="trust-item">
                  <span class="icon">🛡️</span>
                  <span>Bank-level Security</span>
                </div>
                <div class="trust-item">
                  <span class="icon">⭐</span>
                  <span>5-star Support</span>
                </div>
                <div class="trust-item">
                  <span class="icon">⚡</span>
                  <span>Instant Setup</span>
                </div>
              </div>
            </div>
          </section>
        </body>
      </html>
    `)

    await expect(page).toHaveScreenshot('pricing-hero-section.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('pricing cards layout', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pricing Cards</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              background: #f8fafc;
              padding: 60px 20px;
            }
            .pricing-section {
              max-width: 1400px;
              margin: 0 auto;
            }
            .section-header {
              text-center;
              margin-bottom: 64px;
            }
            .section-title {
              font-size: 36px;
              font-weight: 600;
              color: #1f2937;
              margin: 0 0 16px 0;
              letter-spacing: -0.02em;
            }
            .section-subtitle {
              font-size: 20px;
              color: #6b7280;
              margin: 0 0 32px 0;
              max-width: 600px;
              margin-left: auto;
              margin-right: auto;
            }
            .billing-toggle {
              background: #f3f4f6;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 4px;
              display: inline-flex;
              align-items: center;
            }
            .toggle-button {
              padding: 8px 16px;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 500;
              background: transparent;
              border: none;
              color: #6b7280;
              cursor: pointer;
              transition: all 0.2s;
            }
            .toggle-button.active {
              background: white;
              color: #1f2937;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              border: 1px solid #e5e7eb;
            }
            .pricing-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 24px;
              margin-top: 48px;
            }
            .pricing-card {
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 32px;
              position: relative;
              transition: all 0.3s;
              height: 100%;
              display: flex;
              flex-direction: column;
            }
            .pricing-card:hover {
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
              border-color: #d1d5db;
            }
            .pricing-card.popular {
              border: 2px solid #3b82f6;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            }
            .plan-badge {
              position: absolute;
              top: -12px;
              left: 50%;
              transform: translateX(-50%);
              background: #3b82f6;
              color: white;
              font-size: 12px;
              font-weight: 600;
              padding: 6px 16px;
              border-radius: 20px;
              border: 2px solid #2563eb;
            }
            .plan-badge.free {
              background: #10b981;
              border-color: #059669;
            }
            .plan-badge.tenantflow_max {
              background: #6b7280;
              border-color: #4b5563;
            }
            .plan-icon {
              width: 64px;
              height: 64px;
              border-radius: 12px;
              border: 1px solid #e5e7eb;
              background: #f9fafb;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 24px;
              font-size: 32px;
            }
            .plan-icon.popular {
              background: #eff6ff;
              border-color: #bfdbfe;
            }
            .plan-header {
              text-align: center;
              margin-bottom: 24px;
            }
            .plan-name {
              font-size: 24px;
              font-weight: 700;
              color: #1f2937;
              margin: 0 0 8px 0;
            }
            .plan-name.popular {
              color: #3b82f6;
            }
            .plan-description {
              color: #6b7280;
              font-size: 14px;
              margin: 0;
            }
            .plan-price {
              margin-bottom: 24px;
              text-align: center;
            }
            .price-main {
              font-size: 48px;
              font-weight: 700;
              background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin: 0;
            }
            .price-period {
              color: #6b7280;
              font-size: 16px;
            }
            .price-savings {
              font-size: 12px;
              color: #10b981;
              font-weight: 500;
              margin-top: 4px;
            }
            .price-original {
              text-decoration: line-through;
              color: #9ca3af;
            }
            .plan-limits {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 16px;
              margin-bottom: 24px;
              display: flex;
              justify-content: center;
              gap: 16px;
            }
            .limit-item {
              text-align: center;
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 12px;
              color: #6b7280;
            }
            .plan-features {
              flex-grow: 1;
              margin-bottom: 32px;
            }
            .feature-item {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 8px;
            }
            .feature-check {
              color: #10b981;
              font-size: 16px;
            }
            .plan-cta {
              margin-top: auto;
            }
            .cta-button {
              width: 100%;
              padding: 16px 24px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s;
              border: none;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            }
            .cta-button.primary {
              background: #3b82f6;
              color: white;
            }
            .cta-button.primary:hover {
              background: #2563eb;
            }
            .cta-button.secondary {
              background: #1f2937;
              color: white;
            }
            .cta-button.secondary:hover {
              background: #111827;
            }
            .cta-button.outline {
              background: transparent;
              color: #6b7280;
              border: 1px solid #d1d5db;
            }
            .cta-button.outline:hover {
              background: #f9fafb;
              border-color: #9ca3af;
            }
            .cta-button.free {
              background: transparent;
              color: #10b981;
              border: 1px solid #10b981;
            }
            .cta-button.free:hover {
              background: #ecfdf5;
            }
            @media (max-width: 1024px) {
              .pricing-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
            @media (max-width: 768px) {
              .pricing-grid {
                grid-template-columns: 1fr;
              }
            }
          </style>
        </head>
        <body>
          <div class="pricing-section" data-testid="pricing-section">
            <div class="section-header">
              <h2 class="section-title">Choose your plan</h2>
              <p class="section-subtitle">
                Start with our free trial, then scale as your portfolio grows.
              </p>

              <div class="billing-toggle">
                <button class="toggle-button active">Monthly</button>
                <button class="toggle-button">Annual</button>
              </div>
            </div>

            <div class="pricing-grid" data-testid="pricing-cards">
              <!-- Free Trial Plan -->
              <div class="pricing-card" data-testid="free-plan">
                <div class="plan-badge free">14-Day Free Trial</div>

                <div class="plan-icon">🎯</div>

                <div class="plan-header">
                  <h3 class="plan-name">Free Trial</h3>
                  <p class="plan-description">Perfect for getting started</p>
                </div>

                <div class="plan-price">
                  <div class="price-main">$0</div>
                  <div class="price-period">/month</div>
                </div>

                <div class="plan-limits">
                  <div class="limit-item">
                    🏠 2 Properties
                  </div>
                  <div class="limit-item">
                    👤 5 Tenants
                  </div>
                </div>

                <div class="plan-features">
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Basic Maintenance Tracking
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Tenant Communication
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Document Storage
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    14-Day Trial
                  </div>
                </div>

                <div class="plan-cta">
                  <button class="cta-button free">
                    Start Free Trial →
                  </button>
                </div>
              </div>

              <!-- Starter Plan -->
              <div class="pricing-card" data-testid="starter-plan">
                <div class="plan-badge">Best Value</div>

                <div class="plan-icon">📈</div>

                <div class="plan-header">
                  <h3 class="plan-name">Starter</h3>
                  <p class="plan-description">Great for small portfolios</p>
                </div>

                <div class="plan-price">
                  <div class="price-main">$19</div>
                  <div class="price-period">/month</div>
                </div>

                <div class="plan-limits">
                  <div class="limit-item">
                    🏠 10 Properties
                  </div>
                  <div class="limit-item">
                    👤 50 Tenants
                  </div>
                </div>

                <div class="plan-features">
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Advanced Maintenance Workflow
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Automated Rent Reminders
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Financial Reporting
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Priority Support
                  </div>
                </div>

                <div class="plan-cta">
                  <button class="cta-button secondary">
                    Subscribe Now →
                  </button>
                </div>
              </div>

              <!-- Growth Plan (Popular) -->
              <div class="pricing-card popular" data-testid="growth-plan">
                <div class="plan-badge">Most Popular</div>

                <div class="plan-icon popular">✨</div>

                <div class="plan-header">
                  <h3 class="plan-name popular">Growth</h3>
                  <p class="plan-description">Ideal for growing businesses</p>
                </div>

                <div class="plan-price">
                  <div class="price-main">$49</div>
                  <div class="price-period">/month</div>
                </div>

                <div class="plan-limits">
                  <div class="limit-item">
                    🏠 50 Properties
                  </div>
                  <div class="limit-item">
                    👤 250 Tenants
                  </div>
                </div>

                <div class="plan-features">
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Advanced Analytics
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Custom Reports
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    API Access
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    White-label Options
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Dedicated Support
                  </div>
                </div>

                <div class="plan-cta">
                  <button class="cta-button primary">
                    Subscribe Now →
                  </button>
                </div>
              </div>

              <!-- Enterprise Plan -->
              <div class="pricing-card" data-testid="tenantflow_max-plan">
                <div class="plan-badge tenantflow_max">Enterprise</div>

                <div class="plan-icon">✅</div>

                <div class="plan-header">
                  <h3 class="plan-name">Enterprise</h3>
                  <p class="plan-description">Unlimited growth potential</p>
                </div>

                <div class="plan-price">
                  <div class="price-main">Custom</div>
                  <div class="price-period">pricing</div>
                </div>

                <div class="plan-limits" style="background: #f0f9ff; border-color: #bfdbfe;">
                  <div class="limit-item">
                    ∞ Unlimited Properties
                  </div>
                  <div class="limit-item">
                    ∞ Unlimited Tenants
                  </div>
                </div>

                <div class="plan-features">
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Custom Integrations
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Advanced Security
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    On-premise Options
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Dedicated Account Manager
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    24/7 Support
                  </div>
                </div>

                <div class="plan-cta">
                  <button class="cta-button outline">
                    Contact Sales →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `)

    await expect(page).toHaveScreenshot('pricing-cards-layout.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('pricing cards annual billing view', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pricing Cards - Annual Billing</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              background: #f8fafc;
              padding: 40px 20px;
            }
            .pricing-section {
              max-width: 1000px;
              margin: 0 auto;
            }
            .billing-toggle {
              background: #f3f4f6;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 4px;
              display: inline-flex;
              align-items: center;
              margin-bottom: 32px;
            }
            .toggle-button {
              padding: 8px 16px;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 500;
              background: transparent;
              border: none;
              color: #6b7280;
              cursor: pointer;
              transition: all 0.2s;
            }
            .toggle-button.active {
              background: white;
              color: #1f2937;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              border: 1px solid #e5e7eb;
            }
            .pricing-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 24px;
            }
            .pricing-card {
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 32px;
              position: relative;
              height: 100%;
              display: flex;
              flex-direction: column;
            }
            .pricing-card.popular {
              border: 2px solid #3b82f6;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            }
            .plan-badge {
              position: absolute;
              top: -12px;
              left: 50%;
              transform: translateX(-50%);
              background: #3b82f6;
              color: white;
              font-size: 12px;
              font-weight: 600;
              padding: 6px 16px;
              border-radius: 20px;
              border: 2px solid #2563eb;
            }
            .plan-header {
              text-align: center;
              margin-bottom: 24px;
            }
            .plan-name {
              font-size: 24px;
              font-weight: 700;
              color: #1f2937;
              margin: 0 0 8px 0;
            }
            .plan-name.popular {
              color: #3b82f6;
            }
            .plan-description {
              color: #6b7280;
              font-size: 14px;
              margin: 0;
            }
            .plan-price {
              margin-bottom: 24px;
              text-align: center;
            }
            .price-main {
              font-size: 48px;
              font-weight: 700;
              background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin: 0;
            }
            .price-period {
              color: #6b7280;
              font-size: 16px;
            }
            .price-savings {
              font-size: 12px;
              margin-top: 4px;
            }
            .price-original {
              text-decoration: line-through;
              color: #9ca3af;
              margin-right: 8px;
            }
            .price-save {
              color: #10b981;
              font-weight: 500;
            }
            .annual-savings {
              background: #ecfdf5;
              border: 1px solid #d1fae5;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 16px;
              text-align: center;
            }
            .savings-text {
              color: #065f46;
              font-size: 14px;
              font-weight: 500;
            }
            .plan-features {
              flex-grow: 1;
              margin-bottom: 32px;
            }
            .feature-item {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 8px;
            }
            .feature-check {
              color: #10b981;
              font-size: 16px;
            }
            .cta-button {
              width: 100%;
              padding: 16px 24px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s;
              border: none;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            }
            .cta-button.primary {
              background: #3b82f6;
              color: white;
            }
            .cta-button.secondary {
              background: #1f2937;
              color: white;
            }
            .cta-button.outline {
              background: transparent;
              color: #6b7280;
              border: 1px solid #d1d5db;
            }
          </style>
        </head>
        <body>
          <div class="pricing-section" data-testid="pricing-annual">
            <div style="text-align: center; margin-bottom: 48px;">
              <h2 style="font-size: 32px; font-weight: 600; color: #1f2937; margin: 0 0 16px 0;">
                Annual Billing - Save 20%
              </h2>

              <div class="billing-toggle">
                <button class="toggle-button">Monthly</button>
                <button class="toggle-button active">Annual</button>
              </div>
            </div>

            <div class="pricing-grid">
              <!-- Starter Plan - Annual -->
              <div class="pricing-card" data-testid="starter-annual">
                <div class="plan-header">
                  <h3 class="plan-name">Starter</h3>
                  <p class="plan-description">Great for small portfolios</p>
                </div>

                <div class="annual-savings">
                  <div class="savings-text">💰 Save $48 per year</div>
                </div>

                <div class="plan-price">
                  <div class="price-main">$15</div>
                  <div class="price-period">/month</div>
                  <div class="price-savings">
                    <span class="price-original">$19/month</span>
                    <span class="price-save">Save 20%</span>
                  </div>
                </div>

                <div class="plan-features">
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Up to 10 Properties
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Up to 50 Tenants
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Advanced Maintenance Workflow
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Priority Support
                  </div>
                </div>

                <button class="cta-button secondary">
                  Subscribe Annually →
                </button>
              </div>

              <!-- Growth Plan - Annual (Popular) -->
              <div class="pricing-card popular" data-testid="growth-annual">
                <div class="plan-badge">Most Popular</div>

                <div class="plan-header">
                  <h3 class="plan-name popular">Growth</h3>
                  <p class="plan-description">Ideal for growing businesses</p>
                </div>

                <div class="annual-savings">
                  <div class="savings-text">💰 Save $120 per year</div>
                </div>

                <div class="plan-price">
                  <div class="price-main">$39</div>
                  <div class="price-period">/month</div>
                  <div class="price-savings">
                    <span class="price-original">$49/month</span>
                    <span class="price-save">Save 20%</span>
                  </div>
                </div>

                <div class="plan-features">
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Up to 50 Properties
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Up to 250 Tenants
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Advanced Analytics
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    API Access
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Dedicated Support
                  </div>
                </div>

                <button class="cta-button primary">
                  Subscribe Annually →
                </button>
              </div>

              <!-- Enterprise Plan - Annual -->
              <div class="pricing-card" data-testid="tenantflow_max-annual">
                <div class="plan-header">
                  <h3 class="plan-name">Enterprise</h3>
                  <p class="plan-description">Unlimited growth potential</p>
                </div>

                <div class="annual-savings">
                  <div class="savings-text">💰 Custom pricing available</div>
                </div>

                <div class="plan-price">
                  <div class="price-main">$119</div>
                  <div class="price-period">/month</div>
                  <div class="price-savings">
                    <span class="price-original">$149/month</span>
                    <span class="price-save">Save 20%</span>
                  </div>
                </div>

                <div class="plan-features">
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Unlimited Properties
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Unlimited Tenants
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Custom Integrations
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    24/7 Support
                  </div>
                </div>

                <button class="cta-button outline">
                  Contact Sales →
                </button>
              </div>
            </div>
          </div>
        </body>
      </html>
    `)

    await expect(page).toHaveScreenshot('pricing-cards-annual.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('pricing FAQ section', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pricing FAQ</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              background: white;
              padding: 60px 20px;
            }
            .faq-section {
              max-width: 1000px;
              margin: 0 auto;
            }
            .section-header {
              text-center;
              margin-bottom: 64px;
            }
            .section-title {
              font-size: 36px;
              font-weight: 600;
              color: #1f2937;
              margin: 0 0 16px 0;
              letter-spacing: -0.02em;
            }
            .section-subtitle {
              font-size: 20px;
              color: #6b7280;
              margin: 0;
              max-width: 600px;
              margin-left: auto;
              margin-right: auto;
            }
            .faq-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 24px;
            }
            .faq-card {
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 32px;
              transition: all 0.3s;
            }
            .faq-card:hover {
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
              border-color: #d1d5db;
              transform: translateY(-2px);
            }
            .faq-question {
              font-size: 20px;
              font-weight: 700;
              color: #1f2937;
              margin: 0 0 16px 0;
              transition: color 0.3s;
            }
            .faq-card:hover .faq-question {
              color: #3b82f6;
            }
            .faq-answer {
              color: #6b7280;
              line-height: 1.7;
              margin: 0;
            }
            @media (max-width: 768px) {
              .faq-grid {
                grid-template-columns: 1fr;
              }
            }
          </style>
        </head>
        <body>
          <div class="faq-section" data-testid="pricing-faq">
            <div class="section-header">
              <h2 class="section-title">Frequently Asked Questions</h2>
              <p class="section-subtitle">
                Get answers to common questions about our pricing and plans.
              </p>
            </div>

            <div class="faq-grid" data-testid="faq-grid">
              <div class="faq-card" data-testid="faq-change-plan">
                <h3 class="faq-question">Can I change my plan at any time?</h3>
                <p class="faq-answer">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated.
                </p>
              </div>

              <div class="faq-card" data-testid="faq-free-trial">
                <h3 class="faq-question">What happens during the free trial?</h3>
                <p class="faq-answer">
                  You get full access to all features for 14 days. No credit card required, and you can cancel anytime without being charged.
                </p>
              </div>

              <div class="faq-card" data-testid="faq-setup-fees">
                <h3 class="faq-question">Are there any setup fees?</h3>
                <p class="faq-answer">
                  No setup fees, ever. You only pay the monthly or annual subscription fee based on your chosen plan.
                </p>
              </div>

              <div class="faq-card" data-testid="faq-cancel">
                <h3 class="faq-question">What if I need to cancel?</h3>
                <p class="faq-answer">
                  You can cancel anytime. Your subscription will remain active until the end of your billing period, then automatically stop.
                </p>
              </div>

              <div class="faq-card" data-testid="faq-discounts">
                <h3 class="faq-question">Do you offer discounts for annual plans?</h3>
                <p class="faq-answer">
                  Yes! Annual plans save you up to 20% compared to monthly billing. The savings are automatically applied.
                </p>
              </div>

              <div class="faq-card" data-testid="faq-security">
                <h3 class="faq-question">Is my data secure?</h3>
                <p class="faq-answer">
                  Absolutely. We use bank-level encryption, secure cloud infrastructure, and comply with industry security standards.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `)

    await expect(page).toHaveScreenshot('pricing-faq-section.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('pricing call-to-action sections', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pricing CTAs</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              background: #f8fafc;
              padding: 40px 20px;
            }
            .cta-container {
              max-width: 800px;
              margin: 0 auto;
              display: flex;
              flex-direction: column;
              gap: 40px;
            }
            .popular-choice-cta {
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              padding: 48px;
              text-align: center;
            }
            .cta-header {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              margin-bottom: 16px;
            }
            .star-icon {
              color: #fbbf24;
              font-size: 20px;
            }
            .cta-badge {
              color: #1f2937;
              font-weight: 500;
              font-size: 16px;
            }
            .cta-text {
              color: #4b5563;
              font-size: 18px;
              margin: 0 0 24px 0;
              line-height: 1.6;
            }
            .cta-buttons {
              display: flex;
              gap: 16px;
              justify-content: center;
              flex-wrap: wrap;
            }
            .cta-button {
              padding: 16px 32px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s;
              border: none;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .cta-button.primary {
              background: #3b82f6;
              color: white;
            }
            .cta-button.primary:hover {
              background: #2563eb;
            }
            .cta-button.outline {
              background: transparent;
              color: #10b981;
              border: 1px solid #10b981;
            }
            .cta-button.outline:hover {
              background: #ecfdf5;
            }
            .support-cta {
              background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%);
              border-radius: 16px;
              padding: 48px;
              position: relative;
              overflow: hidden;
            }
            .support-cta::before {
              content: '';
              position: absolute;
              inset: 0;
              background: url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23dbeafe" fill-opacity="0.4"%3E%3Ccircle cx="30" cy="30" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E') repeat;
              opacity: 0.5;
            }
            .support-content {
              position: relative;
              z-index: 10;
              text-align: center;
            }
            .support-icon {
              width: 64px;
              height: 64px;
              background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 24px;
              font-size: 32px;
            }
            .support-title {
              font-size: 24px;
              font-weight: 700;
              color: #1f2937;
              margin: 0 0 16px 0;
            }
            .support-text {
              color: #6b7280;
              margin: 0 0 32px 0;
              max-width: 400px;
              margin-left: auto;
              margin-right: auto;
              line-height: 1.6;
            }
            .final-cta {
              background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
              color: white;
              border-radius: 16px;
              padding: 48px;
              text-align: center;
              position: relative;
              overflow: hidden;
            }
            .final-cta::before {
              content: '';
              position: absolute;
              inset: 0;
              background: url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E') repeat;
              opacity: 0.5;
            }
            .final-content {
              position: relative;
              z-index: 10;
              max-width: 600px;
              margin: 0 auto;
            }
            .final-icon {
              width: 64px;
              height: 64px;
              margin: 0 auto 24px;
              color: #bfdbfe;
              font-size: 64px;
            }
            .final-title {
              font-size: 32px;
              font-weight: 700;
              margin: 0 0 16px 0;
            }
            .final-text {
              font-size: 20px;
              color: #bfdbfe;
              margin: 0 0 32px 0;
              line-height: 1.6;
            }
            .final-buttons {
              display: flex;
              gap: 16px;
              justify-content: center;
              flex-wrap: wrap;
            }
            .final-button {
              padding: 16px 32px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s;
              border: none;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .final-button.white {
              background: white;
              color: #3b82f6;
            }
            .final-button.white:hover {
              background: #f9fafb;
            }
            .final-button.outline {
              background: transparent;
              color: white;
              border: 1px solid rgba(255, 255, 255, 0.3);
            }
            .final-button.outline:hover {
              background: rgba(255, 255, 255, 0.1);
            }
          </style>
        </head>
        <body>
          <div class="cta-container" data-testid="pricing-ctas">
            <!-- Popular Choice CTA -->
            <div class="popular-choice-cta" data-testid="popular-choice-cta">
              <div class="cta-header">
                <span class="star-icon">⭐</span>
                <span class="cta-badge">Most Popular Choice</span>
                <span class="star-icon">⭐</span>
              </div>
              <p class="cta-text">
                Over 70% of our customers choose the <strong>Growth plan</strong> for its perfect balance of features and value.
              </p>
              <div class="cta-buttons">
                <button class="cta-button primary">
                  Try Growth Plan →
                </button>
                <button class="cta-button outline">
                  Start with Free Trial
                </button>
              </div>
            </div>

            <!-- Support CTA -->
            <div class="support-cta" data-testid="support-cta">
              <div class="support-content">
                <div class="support-icon">
                  👥
                </div>
                <h3 class="support-title">Still have questions?</h3>
                <p class="support-text">
                  Our team is here to help you find the perfect plan for your property management needs. Get personalized recommendations.
                </p>
                <div class="cta-buttons">
                  <button class="cta-button primary">
                    Contact Support →
                  </button>
                  <button class="cta-button outline">
                    Start Free Trial
                  </button>
                </div>
              </div>
            </div>

            <!-- Final CTA -->
            <div class="final-cta" data-testid="final-cta">
              <div class="final-content">
                <div class="final-icon">⏰</div>
                <h3 class="final-title">Ready to streamline your property management?</h3>
                <p class="final-text">
                  Join thousands of property owners who've simplified their workflow with TenantFlow.
                  Start your free trial today – no credit card required.
                </p>
                <div class="final-buttons">
                  <button class="final-button white">
                    Start Your Free Trial →
                  </button>
                  <button class="final-button outline">
                    Schedule Demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `)

    await expect(page).toHaveScreenshot('pricing-cta-sections.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('pricing page responsive mobile view', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pricing Mobile View</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              background: #f8fafc;
              padding: 20px 16px;
            }
            .mobile-pricing {
              max-width: 100%;
            }
            .mobile-hero {
              background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
              color: white;
              padding: 40px 20px;
              text-align: center;
              border-radius: 12px;
              margin-bottom: 32px;
            }
            .hero-title {
              font-size: 32px;
              font-weight: 700;
              margin: 0 0 16px 0;
              line-height: 1.2;
            }
            .hero-subtitle {
              font-size: 16px;
              color: #bfdbfe;
              margin: 0 0 24px 0;
              line-height: 1.5;
            }
            .billing-toggle {
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 8px;
              padding: 4px;
              display: inline-flex;
              align-items: center;
            }
            .toggle-button {
              padding: 8px 16px;
              border-radius: 4px;
              font-size: 14px;
              font-weight: 500;
              background: transparent;
              border: none;
              color: #bfdbfe;
              cursor: pointer;
            }
            .toggle-button.active {
              background: white;
              color: #1e40af;
            }
            .mobile-cards {
              display: flex;
              flex-direction: column;
              gap: 20px;
            }
            .mobile-card {
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 24px;
              position: relative;
            }
            .mobile-card.popular {
              border: 2px solid #3b82f6;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            }
            .plan-badge {
              position: absolute;
              top: -10px;
              left: 50%;
              transform: translateX(-50%);
              background: #3b82f6;
              color: white;
              font-size: 11px;
              font-weight: 600;
              padding: 4px 12px;
              border-radius: 16px;
            }
            .plan-header {
              text-align: center;
              margin-bottom: 20px;
            }
            .plan-name {
              font-size: 20px;
              font-weight: 700;
              color: #1f2937;
              margin: 0 0 4px 0;
            }
            .plan-name.popular {
              color: #3b82f6;
            }
            .plan-description {
              color: #6b7280;
              font-size: 14px;
              margin: 0;
            }
            .plan-price {
              text-align: center;
              margin-bottom: 20px;
            }
            .price-main {
              font-size: 36px;
              font-weight: 700;
              color: #1f2937;
              margin: 0;
            }
            .price-period {
              color: #6b7280;
              font-size: 14px;
            }
            .plan-features {
              margin-bottom: 20px;
            }
            .feature-item {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 8px;
            }
            .feature-check {
              color: #10b981;
              font-size: 14px;
            }
            .cta-button {
              width: 100%;
              padding: 14px 20px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              border: none;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
            }
            .cta-button.primary {
              background: #3b82f6;
              color: white;
            }
            .cta-button.secondary {
              background: #1f2937;
              color: white;
            }
            .cta-button.free {
              background: transparent;
              color: #10b981;
              border: 1px solid #10b981;
            }
          </style>
        </head>
        <body>
          <div class="mobile-pricing" data-testid="mobile-pricing">
            <div class="mobile-hero">
              <h1 class="hero-title">Simple, Transparent Pricing</h1>
              <p class="hero-subtitle">
                Perfect plans for every portfolio size
              </p>
              <div class="billing-toggle">
                <button class="toggle-button active">Monthly</button>
                <button class="toggle-button">Annual</button>
              </div>
            </div>

            <div class="mobile-cards" data-testid="mobile-cards">
              <!-- Free Plan -->
              <div class="mobile-card">
                <div class="plan-header">
                  <h3 class="plan-name">Free Trial</h3>
                  <p class="plan-description">Perfect for getting started</p>
                </div>

                <div class="plan-price">
                  <div class="price-main">$0</div>
                  <div class="price-period">14-day trial</div>
                </div>

                <div class="plan-features">
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    2 Properties
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    5 Tenants
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Basic Features
                  </div>
                </div>

                <button class="cta-button free">
                  Start Free Trial →
                </button>
              </div>

              <!-- Growth Plan (Popular) -->
              <div class="mobile-card popular">
                <div class="plan-badge">Most Popular</div>

                <div class="plan-header">
                  <h3 class="plan-name popular">Growth</h3>
                  <p class="plan-description">Best for growing businesses</p>
                </div>

                <div class="plan-price">
                  <div class="price-main">$49</div>
                  <div class="price-period">per month</div>
                </div>

                <div class="plan-features">
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    50 Properties
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    250 Tenants
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Advanced Analytics
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    API Access
                  </div>
                </div>

                <button class="cta-button primary">
                  Subscribe Now →
                </button>
              </div>

              <!-- Starter Plan -->
              <div class="mobile-card">
                <div class="plan-header">
                  <h3 class="plan-name">Starter</h3>
                  <p class="plan-description">Great for small portfolios</p>
                </div>

                <div class="plan-price">
                  <div class="price-main">$19</div>
                  <div class="price-period">per month</div>
                </div>

                <div class="plan-features">
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    10 Properties
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    50 Tenants
                  </div>
                  <div class="feature-item">
                    <span class="feature-check">✓</span>
                    Priority Support
                  </div>
                </div>

                <button class="cta-button secondary">
                  Get Started →
                </button>
              </div>
            </div>
          </div>
        </body>
      </html>
    `)

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(300)

    await expect(page).toHaveScreenshot('pricing-mobile-view.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('pricing interactive states', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pricing Interactive States</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              background: #f8fafc;
              padding: 40px 20px;
            }
            .states-demo {
              max-width: 800px;
              margin: 0 auto;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 32px;
            }
            .state-card {
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 32px;
              transition: all 0.3s;
            }
            .state-card.hover {
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
              border-color: #3b82f6;
              transform: translateY(-4px);
            }
            .state-card.popular {
              border: 2px solid #3b82f6;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            }
            .state-card.loading {
              opacity: 0.7;
              pointer-events: none;
            }
            .plan-badge {
              position: absolute;
              top: -12px;
              left: 50%;
              transform: translateX(-50%);
              background: #3b82f6;
              color: white;
              font-size: 12px;
              font-weight: 600;
              padding: 6px 16px;
              border-radius: 20px;
              border: 2px solid #2563eb;
            }
            .plan-name {
              font-size: 24px;
              font-weight: 700;
              color: #1f2937;
              margin: 0 0 8px 0;
              text-align: center;
            }
            .plan-name.popular {
              color: #3b82f6;
            }
            .plan-price {
              text-align: center;
              margin: 20px 0;
            }
            .price-main {
              font-size: 48px;
              font-weight: 700;
              background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin: 0;
            }
            .price-period {
              color: #6b7280;
              font-size: 16px;
            }
            .cta-button {
              width: 100%;
              padding: 16px 24px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s;
              border: none;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              position: relative;
            }
            .cta-button.primary {
              background: #3b82f6;
              color: white;
            }
            .cta-button.primary:hover {
              background: #2563eb;
              transform: translateY(-1px);
              box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
            }
            .cta-button.loading {
              background: #9ca3af;
              cursor: not-allowed;
            }
            .cta-button.loading::after {
              content: '';
              width: 16px;
              height: 16px;
              border: 2px solid transparent;
              border-top: 2px solid white;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin-left: 8px;
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .state-label {
              background: #f3f4f6;
              color: #374151;
              font-size: 12px;
              font-weight: 500;
              padding: 4px 8px;
              border-radius: 4px;
              text-align: center;
              margin-bottom: 16px;
            }
            .billing-toggle {
              background: #f3f4f6;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 4px;
              display: inline-flex;
              align-items: center;
              margin: 0 auto 32px;
              display: flex;
              justify-content: center;
            }
            .toggle-button {
              padding: 8px 16px;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 500;
              background: transparent;
              border: none;
              color: #6b7280;
              cursor: pointer;
              transition: all 0.2s;
            }
            .toggle-button.active {
              background: white;
              color: #1f2937;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              border: 1px solid #e5e7eb;
            }
            .toggle-button.hover {
              color: #374151;
              background: #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div data-testid="pricing-states">
            <div style="text-align: center; margin-bottom: 40px;">
              <h2 style="font-size: 32px; font-weight: 600; color: #1f2937; margin: 0 0 16px 0;">
                Interactive States Demo
              </h2>

              <div class="billing-toggle">
                <button class="toggle-button active">Monthly</button>
                <button class="toggle-button hover">Annual (Hover)</button>
              </div>
            </div>

            <div class="states-demo">
              <!-- Normal State -->
              <div class="state-card" data-testid="normal-state">
                <div class="state-label">Normal State</div>
                <h3 class="plan-name">Growth Plan</h3>
                <div class="plan-price">
                  <div class="price-main">$49</div>
                  <div class="price-period">/month</div>
                </div>
                <button class="cta-button primary">
                  Subscribe Now →
                </button>
              </div>

              <!-- Hover State -->
              <div class="state-card hover" data-testid="hover-state">
                <div class="state-label">Hover State</div>
                <h3 class="plan-name">Growth Plan</h3>
                <div class="plan-price">
                  <div class="price-main">$49</div>
                  <div class="price-period">/month</div>
                </div>
                <button class="cta-button primary" style="background: #2563eb; transform: translateY(-1px); box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);">
                  Subscribe Now →
                </button>
              </div>

              <!-- Popular State -->
              <div class="state-card popular" data-testid="popular-state" style="position: relative;">
                <div class="plan-badge">Most Popular</div>
                <div class="state-label">Popular Plan</div>
                <h3 class="plan-name popular">Growth Plan</h3>
                <div class="plan-price">
                  <div class="price-main">$49</div>
                  <div class="price-period">/month</div>
                </div>
                <button class="cta-button primary">
                  Subscribe Now →
                </button>
              </div>

              <!-- Loading State -->
              <div class="state-card loading" data-testid="loading-state">
                <div class="state-label">Loading State</div>
                <h3 class="plan-name">Growth Plan</h3>
                <div class="plan-price">
                  <div class="price-main">$49</div>
                  <div class="price-period">/month</div>
                </div>
                <button class="cta-button loading">
                  Processing...
                </button>
              </div>
            </div>
          </div>
        </body>
      </html>
    `)

    await expect(page).toHaveScreenshot('pricing-interactive-states.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})
