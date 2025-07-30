import { test, expect } from '@playwright/test'
import { VisualTestHelpers } from '../../helpers/visual-helpers'

test.describe('UI Components Visual Regression', () => {
  let visualHelpers: VisualTestHelpers

  test.beforeEach(async ({ page }) => {
    visualHelpers = new VisualTestHelpers(page)
    await visualHelpers.setupVisualEnvironment()
  })

  test.describe('Basic Components', () => {
    test('button states', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Button Components</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #f8fafc; }
              .container { max-width: 800px; margin: 0 auto; }
              .section { background: white; padding: 30px; margin-bottom: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .section h2 { margin: 0 0 20px 0; color: #1f2937; }
              .button-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
              .btn { padding: 12px 24px; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
              .btn-primary { background: #3b82f6; color: white; }
              .btn-primary:hover { background: #2563eb; }
              .btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
              .btn-secondary:hover { background: #e5e7eb; }
              .btn-success { background: #10b981; color: white; }
              .btn-danger { background: #ef4444; color: white; }
              .btn-disabled { background: #d1d5db; color: #9ca3af; cursor: not-allowed; }
              .btn-large { padding: 16px 32px; font-size: 16px; }
              .btn-small { padding: 8px 16px; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="section">
                <h2>Button Variants</h2>
                <div class="button-grid">
                  <button class="btn btn-primary" data-testid="btn-primary">Primary</button>
                  <button class="btn btn-secondary" data-testid="btn-secondary">Secondary</button>
                  <button class="btn btn-success" data-testid="btn-success">Success</button>
                  <button class="btn btn-danger" data-testid="btn-danger">Danger</button>
                </div>
              </div>
              
              <div class="section">
                <h2>Button Sizes</h2>
                <div class="button-grid">
                  <button class="btn btn-primary btn-small" data-testid="btn-small">Small</button>
                  <button class="btn btn-primary" data-testid="btn-normal">Normal</button>
                  <button class="btn btn-primary btn-large" data-testid="btn-large">Large</button>
                  <button class="btn btn-disabled" data-testid="btn-disabled" disabled>Disabled</button>
                </div>
              </div>
            </div>
          </body>
        </html>
      `)

      await expect(page).toHaveScreenshot('button-components.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('form elements', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Form Components</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #f8fafc; }
              .container { max-width: 600px; margin: 0 auto; }
              .form-section { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .form-group { margin-bottom: 20px; }
              label { display: block; margin-bottom: 5px; font-weight: 500; color: #374151; }
              input, select, textarea { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
              input:focus, select:focus, textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
              .error { border-color: #ef4444; }
              .error-message { color: #ef4444; font-size: 12px; margin-top: 5px; }
              .checkbox-group { display: flex; align-items: center; gap: 8px; }
              .checkbox { width: auto; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="form-section">
                <h2>Form Elements</h2>
                
                <div class="form-group">
                  <label for="text-input">Text Input</label>
                  <input type="text" id="text-input" data-testid="text-input" placeholder="Enter text here" />
                </div>
                
                <div class="form-group">
                  <label for="email-input">Email Input</label>
                  <input type="email" id="email-input" data-testid="email-input" placeholder="user@example.com" />
                </div>
                
                <div class="form-group">
                  <label for="password-input">Password Input</label>
                  <input type="password" id="password-input" data-testid="password-input" placeholder="••••••••" />
                </div>
                
                <div class="form-group">
                  <label for="select-input">Select Input</label>
                  <select id="select-input" data-testid="select-input">
                    <option value="">Choose an option</option>
                    <option value="option1">Option 1</option>
                    <option value="option2">Option 2</option>
                    <option value="option3">Option 3</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label for="textarea-input">Textarea</label>
                  <textarea id="textarea-input" data-testid="textarea-input" rows="4" placeholder="Enter your message here"></textarea>
                </div>
                
                <div class="form-group">
                  <div class="checkbox-group">
                    <input type="checkbox" id="checkbox-input" class="checkbox" data-testid="checkbox-input" />
                    <label for="checkbox-input">I agree to the terms and conditions</label>
                  </div>
                </div>
                
                <div class="form-group">
                  <label for="error-input">Error State</label>
                  <input type="text" id="error-input" class="error" data-testid="error-input" value="Invalid input" />
                  <div class="error-message">This field is required</div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `)

      await expect(page).toHaveScreenshot('form-components.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('cards and containers', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Card Components</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #f8fafc; }
              .container { max-width: 1000px; margin: 0 auto; }
              .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
              .card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
              .card-header { background: #f9fafb; padding: 20px; border-bottom: 1px solid #e5e7eb; }
              .card-title { margin: 0; font-size: 18px; font-weight: 600; color: #1f2937; }
              .card-body { padding: 20px; }
              .card-footer { background: #f9fafb; padding: 15px 20px; border-top: 1px solid #e5e7eb; }
              .stat-card { text-align: center; padding: 30px 20px; }
              .stat-value { font-size: 32px; font-weight: 700; color: #1f2937; margin: 0; }
              .stat-label { font-size: 14px; color: #6b7280; margin: 5px 0 0 0; }
              .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
              .badge-success { background: #d1fae5; color: #065f46; }
              .badge-warning { background: #fef3c7; color: #92400e; }
              .badge-danger { background: #fee2e2; color: #991b1b; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="card-grid">
                <div class="card" data-testid="basic-card">
                  <div class="card-header">
                    <h3 class="card-title">Basic Card</h3>
                  </div>
                  <div class="card-body">
                    <p>This is a basic card component with header, body, and footer sections.</p>
                  </div>
                  <div class="card-footer">
                    <button class="btn btn-primary">Action</button>
                  </div>
                </div>
                
                <div class="card stat-card" data-testid="stat-card">
                  <h2 class="stat-value">1,234</h2>
                  <p class="stat-label">Total Properties</p>
                  <span class="badge badge-success">+12% from last month</span>
                </div>
                
                <div class="card" data-testid="content-card">
                  <div class="card-body">
                    <h3>Property Details</h3>
                    <p><strong>Address:</strong> 123 Main St, Anytown, USA</p>
                    <p><strong>Units:</strong> 24</p>
                    <p><strong>Occupancy:</strong> <span class="badge badge-success">95%</span></p>
                    <p><strong>Status:</strong> <span class="badge badge-warning">Maintenance Due</span></p>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `)

      await expect(page).toHaveScreenshot('card-components.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('dark theme components', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Dark Theme Components</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #111827; color: #f9fafb; }
              .container { max-width: 800px; margin: 0 auto; }
              .section { background: #1f2937; padding: 30px; margin-bottom: 30px; border-radius: 8px; border: 1px solid #374151; }
              .section h2 { margin: 0 0 20px 0; color: #f9fafb; }
              .button-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
              .btn { padding: 12px 24px; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; }
              .btn-primary { background: #3b82f6; color: white; }
              .btn-secondary { background: #374151; color: #d1d5db; border: 1px solid #4b5563; }
              .btn-success { background: #10b981; color: white; }
              .btn-danger { background: #ef4444; color: white; }
              .form-group { margin-bottom: 20px; }
              label { display: block; margin-bottom: 5px; font-weight: 500; color: #d1d5db; }
              input { width: 100%; padding: 12px; border: 1px solid #4b5563; border-radius: 6px; font-size: 14px; background: #374151; color: #f9fafb; }
              input:focus { outline: none; border-color: #3b82f6; }
            </style>
          </head>
          <body data-theme="dark">
            <div class="container">
              <div class="section">
                <h2>Dark Theme Buttons</h2>
                <div class="button-grid">
                  <button class="btn btn-primary" data-testid="dark-btn-primary">Primary</button>
                  <button class="btn btn-secondary" data-testid="dark-btn-secondary">Secondary</button>
                  <button class="btn btn-success" data-testid="dark-btn-success">Success</button>
                  <button class="btn btn-danger" data-testid="dark-btn-danger">Danger</button>
                </div>
              </div>
              
              <div class="section">
                <h2>Dark Theme Form</h2>
                <div class="form-group">
                  <label for="dark-input">Email Address</label>
                  <input type="email" id="dark-input" data-testid="dark-input" placeholder="user@example.com" />
                </div>
              </div>
            </div>
          </body>
        </html>
      `)

      await expect(page).toHaveScreenshot('dark-theme-components.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })
  })

  test.describe('Responsive Components', () => {
    const viewports = [
      { width: 1440, height: 900, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' },
    ]

    test('responsive card grid', async ({ page }) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Responsive Grid</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f8fafc; }
              .container { max-width: 1200px; margin: 0 auto; }
              .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
              .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .card h3 { margin: 0 0 10px 0; color: #1f2937; }
              .card p { color: #6b7280; margin: 0; }
              @media (max-width: 768px) {
                body { padding: 10px; }
                .grid { grid-template-columns: 1fr; gap: 15px; }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Responsive Card Grid</h1>
              <div class="grid">
                <div class="card">
                  <h3>Property 1</h3>
                  <p>123 Main St</p>
                </div>
                <div class="card">
                  <h3>Property 2</h3>
                  <p>456 Oak Ave</p>
                </div>
                <div class="card">
                  <h3>Property 3</h3>
                  <p>789 Elm St</p>
                </div>
                <div class="card">
                  <h3>Property 4</h3>
                  <p>321 Pine Rd</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `)

      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(300)

        await expect(page).toHaveScreenshot(`responsive-grid-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled',
        })
      }
    })
  })
})