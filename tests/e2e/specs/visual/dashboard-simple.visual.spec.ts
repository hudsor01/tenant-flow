import { test, expect } from '@playwright/test'
import { VisualTestHelpers } from '../../helpers/visual-helpers'

test.describe('Dashboard Visual Regression', () => {
  let visualHelpers: VisualTestHelpers

  test.beforeEach(async ({ page }) => {
    visualHelpers = new VisualTestHelpers(page)
    await visualHelpers.setupVisualEnvironment()
  })

  test('dashboard overview layout', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dashboard - TenantFlow</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              margin: 0; 
              background: #f8fafc; 
            }
            .dashboard { 
              display: grid; 
              grid-template-columns: 250px 1fr; 
              height: 100vh; 
            }
            .sidebar { 
              background: #1f2937; 
              color: white; 
              padding: 20px; 
            }
            .sidebar h2 { 
              margin: 0 0 30px 0; 
              color: #f9fafb; 
              font-size: 20px;
            }
            .nav-item { 
              padding: 12px 16px; 
              margin: 4px 0; 
              border-radius: 6px; 
              color: #d1d5db; 
              cursor: pointer; 
              display: flex;
              align-items: center;
              transition: background-color 0.2s;
            }
            .nav-item:hover { 
              background: #374151; 
            }
            .nav-item.active { 
              background: #3b82f6; 
              color: white; 
            }
            .main-content { 
              padding: 30px; 
              overflow-y: auto;
            }
            .page-header {
              margin-bottom: 30px;
            }
            .page-title {
              font-size: 28px;
              font-weight: 700;
              color: #1f2937;
              margin: 0 0 8px 0;
            }
            .page-subtitle {
              color: #6b7280;
              margin: 0;
            }
            .stats-grid { 
              display: grid; 
              grid-template-columns: repeat(4, 1fr); 
              gap: 20px; 
              margin-bottom: 30px; 
            }
            .stat-card { 
              background: white; 
              padding: 25px; 
              border-radius: 8px; 
              box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
              text-align: center; 
            }
            .stat-value { 
              font-size: 32px; 
              font-weight: 700; 
              color: #1f2937; 
              margin: 0; 
            }
            .stat-label { 
              font-size: 14px; 
              color: #6b7280; 
              margin: 8px 0 0 0; 
            }
            .stat-change {
              font-size: 12px;
              margin-top: 4px;
            }
            .stat-change.positive {
              color: #10b981;
            }
            .stat-change.negative {
              color: #ef4444;
            }
            .dashboard-grid {
              display: grid;
              grid-template-columns: 2fr 1fr;
              gap: 30px;
            }
            .chart-section { 
              background: white; 
              padding: 30px; 
              border-radius: 8px; 
              box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
            }
            .section-title {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin: 0 0 20px 0;
            }
            .chart-placeholder { 
              height: 300px; 
              background: #f3f4f6; 
              border-radius: 4px; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              color: #6b7280; 
              border: 2px dashed #d1d5db;
            }
            .recent-activity {
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .activity-item {
              display: flex;
              align-items: center;
              padding: 15px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .activity-item:last-child {
              border-bottom: none;
            }
            .activity-icon {
              width: 40px;
              height: 40px;
              border-radius: 20px;
              background: #eff6ff;
              color: #3b82f6;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 15px;
              font-weight: 600;
            }
            .activity-content {
              flex: 1;
            }
            .activity-title {
              font-weight: 500;
              color: #1f2937;
              margin: 0 0 4px 0;
            }
            .activity-description {
              font-size: 14px;
              color: #6b7280;
              margin: 0;
            }
            .activity-time {
              font-size: 12px;
              color: #9ca3af;
            }
          </style>
        </head>
        <body>
          <div class="dashboard">
            <div class="sidebar" data-testid="sidebar">
              <h2>TenantFlow</h2>
              <div class="nav-item active" data-testid="nav-dashboard">
                📊 Dashboard
              </div>
              <div class="nav-item" data-testid="nav-properties">
                🏠 Properties
              </div>
              <div class="nav-item" data-testid="nav-tenants">
                👥 Tenants
              </div>
              <div class="nav-item" data-testid="nav-maintenance">
                🔧 Maintenance
              </div>
              <div class="nav-item" data-testid="nav-billing">
                💳 Billing
              </div>
              <div class="nav-item" data-testid="nav-reports">
                📈 Reports
              </div>
            </div>
            
            <div class="main-content">
              <div class="page-header">
                <h1 class="page-title">Dashboard</h1>
                <p class="page-subtitle">Welcome back! Here's what's happening with your properties.</p>
              </div>
              
              <div class="stats-grid" data-testid="dashboard-stats">
                <div class="stat-card">
                  <h2 class="stat-value">24</h2>
                  <p class="stat-label">Total Properties</p>
                  <p class="stat-change positive">+2 this month</p>
                </div>
                <div class="stat-card">
                  <h2 class="stat-value">486</h2>
                  <p class="stat-label">Total Units</p>
                  <p class="stat-change positive">+12 this month</p>
                </div>
                <div class="stat-card">
                  <h2 class="stat-value">94%</h2>
                  <p class="stat-label">Occupancy Rate</p>
                  <p class="stat-change negative">-1% from last month</p>
                </div>
                <div class="stat-card">
                  <h2 class="stat-value">$125K</h2>
                  <p class="stat-label">Monthly Revenue</p>
                  <p class="stat-change positive">+8% from last month</p>
                </div>
              </div>
              
              <div class="dashboard-grid">
                <div class="chart-section" data-testid="revenue-chart">
                  <h3 class="section-title">Revenue Trends</h3>
                  <div class="chart-placeholder">📈 Revenue Chart</div>
                </div>
                
                <div class="recent-activity" data-testid="recent-activity">
                  <h3 class="section-title">Recent Activity</h3>
                  <div class="activity-item">
                    <div class="activity-icon">M</div>
                    <div class="activity-content">
                      <p class="activity-title">Maintenance Request</p>
                      <p class="activity-description">Unit 101 - Plumbing issue</p>
                    </div>
                    <div class="activity-time">2 min ago</div>
                  </div>
                  <div class="activity-item">
                    <div class="activity-icon">T</div>
                    <div class="activity-content">
                      <p class="activity-title">New Tenant</p>
                      <p class="activity-description">John Smith moved into Unit 205</p>
                    </div>
                    <div class="activity-time">1 hour ago</div>
                  </div>
                  <div class="activity-item">
                    <div class="activity-icon">P</div>
                    <div class="activity-content">
                      <p class="activity-title">Payment Received</p>
                      <p class="activity-description">Rent payment for Unit 150</p>
                    </div>
                    <div class="activity-time">3 hours ago</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `)

    await expect(page).toHaveScreenshot('dashboard-overview.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('dashboard statistics cards', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dashboard Stats</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              margin: 0; 
              background: #f8fafc; 
              padding: 40px;
            }
            .stats-grid { 
              display: grid; 
              grid-template-columns: repeat(4, 1fr); 
              gap: 20px; 
              max-width: 1200px;
              margin: 0 auto;
            }
            .stat-card { 
              background: white; 
              padding: 25px; 
              border-radius: 8px; 
              box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
              text-align: center; 
            }
            .stat-value { 
              font-size: 32px; 
              font-weight: 700; 
              color: #1f2937; 
              margin: 0; 
            }
            .stat-label { 
              font-size: 14px; 
              color: #6b7280; 
              margin: 8px 0 4px 0; 
            }
            .stat-change {
              font-size: 12px;
              margin: 0;
            }
            .stat-change.positive {
              color: #10b981;
            }
            .stat-change.negative {
              color: #ef4444;
            }
          </style>
        </head>
        <body>
          <div class="stats-grid" data-testid="dashboard-stats">
            <div class="stat-card">
              <h2 class="stat-value">24</h2>
              <p class="stat-label">Total Properties</p>
              <p class="stat-change positive">+2 this month</p>
            </div>
            <div class="stat-card">
              <h2 class="stat-value">486</h2>
              <p class="stat-label">Total Units</p>
              <p class="stat-change positive">+12 this month</p>
            </div>
            <div class="stat-card">
              <h2 class="stat-value">94%</h2>
              <p class="stat-label">Occupancy Rate</p>
              <p class="stat-change negative">-1% from last month</p>
            </div>
            <div class="stat-card">
              <h2 class="stat-value">$125K</h2>
              <p class="stat-label">Monthly Revenue</p>
              <p class="stat-change positive">+8% from last month</p>
            </div>
          </div>
        </body>
      </html>
    `)

    const statsContainer = page.locator('[data-testid="dashboard-stats"]')
    await expect(statsContainer).toHaveScreenshot('dashboard-stats-cards.png')
  })

  test('dashboard dark theme', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dashboard Dark Theme</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              margin: 0; 
              background: #111827; 
              color: #f9fafb;
            }
            .dashboard { 
              display: grid; 
              grid-template-columns: 250px 1fr; 
              height: 100vh; 
            }
            .sidebar { 
              background: #1f2937; 
              color: white; 
              padding: 20px; 
              border-right: 1px solid #374151;
            }
            .sidebar h2 { 
              margin: 0 0 30px 0; 
              color: #f9fafb; 
              font-size: 20px;
            }
            .nav-item { 
              padding: 12px 16px; 
              margin: 4px 0; 
              border-radius: 6px; 
              color: #d1d5db; 
              cursor: pointer; 
            }
            .nav-item.active { 
              background: #3b82f6; 
              color: white; 
            }
            .main-content { 
              padding: 30px; 
              background: #111827;
            }
            .page-title {
              font-size: 28px;
              font-weight: 700;
              color: #f9fafb;
              margin: 0 0 30px 0;
            }
            .stats-grid { 
              display: grid; 
              grid-template-columns: repeat(4, 1fr); 
              gap: 20px; 
            }
            .stat-card { 
              background: #1f2937; 
              padding: 25px; 
              border-radius: 8px; 
              border: 1px solid #374151;
              text-align: center; 
            }
            .stat-value { 
              font-size: 32px; 
              font-weight: 700; 
              color: #f9fafb; 
              margin: 0; 
            }
            .stat-label { 
              font-size: 14px; 
              color: #9ca3af; 
              margin: 8px 0 0 0; 
            }
          </style>
        </head>
        <body data-theme="dark">
          <div class="dashboard">
            <div class="sidebar">
              <h2>TenantFlow</h2>
              <div class="nav-item active">📊 Dashboard</div>
              <div class="nav-item">🏠 Properties</div>
              <div class="nav-item">👥 Tenants</div>
            </div>
            <div class="main-content">
              <h1 class="page-title">Dashboard</h1>
              <div class="stats-grid">
                <div class="stat-card">
                  <h2 class="stat-value">24</h2>
                  <p class="stat-label">Total Properties</p>
                </div>
                <div class="stat-card">
                  <h2 class="stat-value">486</h2>
                  <p class="stat-label">Total Units</p>
                </div>
                <div class="stat-card">
                  <h2 class="stat-value">94%</h2>
                  <p class="stat-label">Occupancy Rate</p>
                </div>
                <div class="stat-card">
                  <h2 class="stat-value">$125K</h2>
                  <p class="stat-label">Monthly Revenue</p>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `)

    await expect(page).toHaveScreenshot('dashboard-dark-theme.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})