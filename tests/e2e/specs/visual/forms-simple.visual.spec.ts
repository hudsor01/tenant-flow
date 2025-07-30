import { test, expect } from '@playwright/test'
import { VisualTestHelpers } from '../../helpers/visual-helpers'

test.describe('Forms Visual Regression', () => {
  let visualHelpers: VisualTestHelpers

  test.beforeEach(async ({ page }) => {
    visualHelpers = new VisualTestHelpers(page)
    await visualHelpers.setupVisualEnvironment()
  })

  test('property creation form', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Create Property - TenantFlow</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              margin: 0; 
              background: #f8fafc;
              padding: 40px;
            }
            .form-container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            }
            .form-header {
              text-align: center;
              margin-bottom: 40px;
            }
            .form-title {
              font-size: 24px;
              font-weight: 700;
              color: #1f2937;
              margin: 0 0 8px 0;
            }
            .form-subtitle {
              color: #6b7280;
              margin: 0;
            }
            .form-group {
              margin-bottom: 24px;
            }
            .form-row {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            label {
              display: block;
              margin-bottom: 6px;
              font-weight: 500;
              color: #374151;
              font-size: 14px;
            }
            .required {
              color: #ef4444;
            }
            input, select, textarea {
              width: 100%;
              padding: 12px 16px;
              border: 1px solid #d1d5db;
              border-radius: 8px;
              font-size: 16px;
              background: white;
              transition: all 0.2s;
              box-sizing: border-box;
            }
            input:focus, select:focus, textarea:focus {
              outline: none;
              border-color: #3b82f6;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            textarea {
              resize: vertical;
              min-height: 100px;
            }
            .form-actions {
              display: flex;
              gap: 12px;
              justify-content: flex-end;
              margin-top: 40px;
              padding-top: 24px;
              border-top: 1px solid #e5e7eb;
            }
            .btn {
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              border: none;
              transition: all 0.2s;
            }
            .btn-primary {
              background: #3b82f6;
              color: white;
            }
            .btn-primary:hover {
              background: #2563eb;
            }
            .btn-secondary {
              background: white;
              color: #374151;
              border: 1px solid #d1d5db;
            }
            .btn-secondary:hover {
              background: #f9fafb;
            }
            .form-section {
              margin-bottom: 32px;
            }
            .section-title {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin: 0 0 16px 0;
              padding-bottom: 8px;
              border-bottom: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="form-container" data-testid="property-form">
            <div class="form-header">
              <h1 class="form-title">Create New Property</h1>
              <p class="form-subtitle">Add a new property to your portfolio</p>
            </div>
            
            <form>
              <div class="form-section">
                <h2 class="section-title">Basic Information</h2>
                
                <div class="form-group">
                  <label for="property-name">Property Name <span class="required">*</span></label>
                  <input 
                    type="text" 
                    id="property-name" 
                    name="propertyName" 
                    data-testid="property-name-input"
                    placeholder="Enter property name"
                  />
                </div>
                
                <div class="form-group">
                  <label for="property-type">Property Type <span class="required">*</span></label>
                  <select id="property-type" name="propertyType" data-testid="property-type-select">
                    <option value="">Select property type</option>
                    <option value="apartment">Apartment Complex</option>
                    <option value="single-family">Single Family Home</option>
                    <option value="duplex">Duplex</option>
                    <option value="commercial">Commercial Property</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label for="description">Description</label>
                  <textarea 
                    id="description" 
                    name="description" 
                    data-testid="description-textarea"
                    placeholder="Enter property description..."
                  ></textarea>
                </div>
              </div>
              
              <div class="form-section">
                <h2 class="section-title">Address Information</h2>
                
                <div class="form-group">
                  <label for="street-address">Street Address <span class="required">*</span></label>
                  <input 
                    type="text" 
                    id="street-address" 
                    name="streetAddress" 
                    data-testid="street-address-input"
                    placeholder="123 Main Street"
                  />
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label for="city">City <span class="required">*</span></label>
                    <input 
                      type="text" 
                      id="city" 
                      name="city" 
                      data-testid="city-input"
                      placeholder="City"
                    />
                  </div>
                  <div class="form-group">
                    <label for="state">State <span class="required">*</span></label>
                    <select id="state" name="state" data-testid="state-select">
                      <option value="">Select state</option>
                      <option value="CA">California</option>
                      <option value="TX">Texas</option>
                      <option value="NY">New York</option>
                      <option value="FL">Florida</option>
                    </select>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label for="zip-code">ZIP Code <span class="required">*</span></label>
                    <input 
                      type="text" 
                      id="zip-code" 
                      name="zipCode" 
                      data-testid="zip-code-input"
                      placeholder="12345"
                    />
                  </div>
                  <div class="form-group">
                    <label for="total-units">Total Units</label>
                    <input 
                      type="number" 
                      id="total-units" 
                      name="totalUnits" 
                      data-testid="total-units-input"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
              </div>
              
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" data-testid="cancel-button">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" data-testid="submit-button">
                  Create Property
                </button>
              </div>
            </form>
          </div>
        </body>
      </html>
    `)

    await expect(page).toHaveScreenshot('property-creation-form.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('form validation states', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Form Validation States</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              margin: 0; 
              background: #f8fafc;
              padding: 40px;
            }
            .form-container {
              max-width: 500px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            }
            .form-group {
              margin-bottom: 24px;
            }
            label {
              display: block;
              margin-bottom: 6px;
              font-weight: 500;
              color: #374151;
              font-size: 14px;
            }
            input {
              width: 100%;
              padding: 12px 16px;
              border: 1px solid #d1d5db;
              border-radius: 8px;
              font-size: 16px;
              background: white;
              transition: all 0.2s;
              box-sizing: border-box;
            }
            input:focus {
              outline: none;
              border-color: #3b82f6;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            input.valid {
              border-color: #10b981;
            }
            input.valid:focus {
              border-color: #10b981;
              box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
            }
            input.error {
              border-color: #ef4444;
            }
            input.error:focus {
              border-color: #ef4444;
              box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
            }
            .help-text {
              font-size: 12px;
              margin-top: 6px;
            }
            .help-text.success {
              color: #10b981;
            }
            .help-text.error {
              color: #ef4444;
            }
            .help-text.info {
              color: #6b7280;
            }
            .icon {
              position: absolute;
              right: 12px;
              top: 50%;
              transform: translateY(-50%);
            }
            .input-wrapper {
              position: relative;
            }
            .success-icon {
              color: #10b981;
            }
            .error-icon {
              color: #ef4444;
            }
          </style>
        </head>
        <body>
          <div class="form-container">
            <h2>Form Validation States</h2>
            
            <div class="form-group">
              <label for="email-valid">Valid Email</label>
              <div class="input-wrapper">
                <input 
                  type="email" 
                  id="email-valid" 
                  class="valid"
                  value="user@example.com"
                  data-testid="email-valid"
                />
                <span class="icon success-icon">✓</span>
              </div>
              <p class="help-text success">Email format is valid</p>
            </div>
            
            <div class="form-group">
              <label for="email-error">Invalid Email</label>
              <div class="input-wrapper">
                <input 
                  type="email" 
                  id="email-error" 
                  class="error"
                  value="invalid-email"
                  data-testid="email-error"
                />
                <span class="icon error-icon">✗</span>
              </div>
              <p class="help-text error">Please enter a valid email address</p>
            </div>
            
            <div class="form-group">
              <label for="password-normal">Password</label>
              <input 
                type="password" 
                id="password-normal" 
                placeholder="Enter your password"
                data-testid="password-normal"
              />
              <p class="help-text info">Password must be at least 8 characters long</p>
            </div>
            
            <div class="form-group">
              <label for="required-field">Required Field</label>
              <input 
                type="text" 
                id="required-field" 
                class="error"
                placeholder="This field is required"
                data-testid="required-field"
              />
              <p class="help-text error">This field is required</p>
            </div>
          </div>
        </body>
      </html>
    `)

    await expect(page).toHaveScreenshot('form-validation-states.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('form focus states', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Form Focus States</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              margin: 0; 
              background: #f8fafc;
              padding: 40px;
            }
            .form-container {
              max-width: 400px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            }
            .form-group {
              margin-bottom: 24px;
            }
            label {
              display: block;
              margin-bottom: 6px;
              font-weight: 500;
              color: #374151;
              font-size: 14px;
            }
            input, select {
              width: 100%;
              padding: 12px 16px;
              border: 1px solid #d1d5db;
              border-radius: 8px;
              font-size: 16px;
              background: white;
              box-sizing: border-box;
            }
            .focused {
              border-color: #3b82f6;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
              outline: none;
            }
          </style>
        </head>
        <body>
          <div class="form-container">
            <h2>Form Focus States</h2>
            
            <div class="form-group">
              <label for="text-focused">Text Input (Focused)</label>
              <input 
                type="text" 
                id="text-focused" 
                class="focused"
                value="Sample text"
                data-testid="text-focused"
              />
            </div>
            
            <div class="form-group">
              <label for="text-normal">Text Input (Normal)</label>
              <input 
                type="text" 
                id="text-normal" 
                placeholder="Normal state"
                data-testid="text-normal"
              />
            </div>
            
            <div class="form-group">
              <label for="select-focused">Select (Focused)</label>
              <select id="select-focused" class="focused" data-testid="select-focused">
                <option value="">Choose option</option>
                <option value="1">Option 1</option>
                <option value="2">Option 2</option>
              </select>
            </div>
          </div>
        </body>
      </html>
    `)

    await expect(page).toHaveScreenshot('form-focus-states.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})