import { test, expect } from '@playwright/test'
import { VisualTestHelpers } from '../../helpers/visual-helpers'

test.describe('Notifications Visual Regression', () => {
  let visualHelpers: VisualTestHelpers

  test.beforeEach(async ({ page }) => {
    visualHelpers = new VisualTestHelpers(page)
    await visualHelpers.setupVisualEnvironment()
  })

  test.describe('In-App Notifications', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
    })

    test('notification bell icon states', async ({ page }) => {
      const notificationBell = page.locator('[data-testid="notification-bell"]')
      
      // Normal state (no notifications)
      await expect(notificationBell).toHaveScreenshot('notification-bell-empty.png')
      
      // With badge (has notifications)
      await page.evaluate(() => {
        const bell = document.querySelector('[data-testid="notification-bell"]')
        if (bell) {
          bell.setAttribute('data-count', '3')
        }
      })
      await expect(notificationBell).toHaveScreenshot('notification-bell-with-badge.png')
      
      // Hover state
      await notificationBell.hover()
      await page.waitForTimeout(200)
      await expect(notificationBell).toHaveScreenshot('notification-bell-hover.png')
    })

    test('notification dropdown panel', async ({ page }) => {
      await page.click('[data-testid="notification-bell"]')
      await page.waitForTimeout(300)

      const dropdown = page.locator('[data-testid="notifications-dropdown"]')
      await expect(dropdown).toHaveScreenshot('notifications-dropdown-panel.png')
    })

    test('notification types and priorities', async ({ page }) => {
      await page.click('[data-testid="notification-bell"]')
      await page.waitForTimeout(300)

      const notifications = page.locator('[data-testid="notification-item"]')
      const count = await notifications.count()

      for (let i = 0; i < Math.min(5, count); i++) {
        const notification = notifications.nth(i)
        const type = await notification.getAttribute('data-type')
        const priority = await notification.getAttribute('data-priority')
        await expect(notification).toHaveScreenshot(`notification-${type}-${priority}-${i}.png`)
      }
    })

    test('notification read/unread states', async ({ page }) => {
      await page.click('[data-testid="notification-bell"]')
      await page.waitForTimeout(300)

      const unreadNotification = page.locator('[data-testid="notification-item"][data-read="false"]').first()
      const readNotification = page.locator('[data-testid="notification-item"][data-read="true"]').first()

      await expect(unreadNotification).toHaveScreenshot('notification-unread.png')
      await expect(readNotification).toHaveScreenshot('notification-read.png')
    })

    test('mark notification as read interaction', async ({ page }) => {
      await page.click('[data-testid="notification-bell"]')
      await page.waitForTimeout(300)

      const notification = page.locator('[data-testid="notification-item"]').first()
      
      // Before marking as read
      await expect(notification).toHaveScreenshot('notification-before-read.png')
      
      // Click to mark as read
      await notification.click()
      await page.waitForTimeout(200)
      
      // After marking as read
      await expect(notification).toHaveScreenshot('notification-after-read.png')
    })

    test('notification actions menu', async ({ page }) => {
      await page.click('[data-testid="notification-bell"]')
      await page.waitForTimeout(300)

      const firstNotification = page.locator('[data-testid="notification-item"]').first()
      await firstNotification.hover()
      await page.click('[data-testid="notification-actions-menu"]')
      await page.waitForTimeout(200)

      const actionsMenu = page.locator('[data-testid="notification-actions-dropdown"]')
      await expect(actionsMenu).toHaveScreenshot('notification-actions-menu.png')
    })

    test('bulk notification actions', async ({ page }) => {
      await page.click('[data-testid="notification-bell"]')
      await page.waitForTimeout(300)

      const bulkActions = page.locator('[data-testid="notification-bulk-actions"]')
      await expect(bulkActions).toHaveScreenshot('notification-bulk-actions.png')
      
      // Mark all as read
      await page.click('[data-testid="mark-all-read-button"]')
      await page.waitForTimeout(300)
      
      const dropdown = page.locator('[data-testid="notifications-dropdown"]')
      await expect(dropdown).toHaveScreenshot('notifications-all-read.png')
    })

    test('empty notifications state', async ({ page }) => {
      // Mock empty notifications
      await page.route('/api/v1/notifications*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [],
            meta: { total: 0, unread: 0 },
          }),
        })
      })

      await page.click('[data-testid="notification-bell"]')
      await page.waitForTimeout(300)

      const dropdown = page.locator('[data-testid="notifications-dropdown"]')
      await expect(dropdown).toHaveScreenshot('notifications-empty-state.png')
    })
  })

  test.describe('Toast Notifications', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
    })

    test('success toast notification', async ({ page }) => {
      // Trigger success toast
      await page.evaluate(() => {
        // Mock toast trigger
        const event = new CustomEvent('show-toast', {
          detail: {
            type: 'success',
            title: 'Success!',
            message: 'Property has been created successfully.',
          }
        })
        window.dispatchEvent(event)
      })

      await page.waitForTimeout(200)
      const toast = page.locator('[data-testid="toast-notification"]')
      await expect(toast).toHaveScreenshot('toast-success.png')
    })

    test('error toast notification', async ({ page }) => {
      await page.evaluate(() => {
        const event = new CustomEvent('show-toast', {
          detail: {
            type: 'error',
            title: 'Error!',
            message: 'Failed to create property. Please try again.',
          }
        })
        window.dispatchEvent(event)
      })

      await page.waitForTimeout(200)
      const toast = page.locator('[data-testid="toast-notification"]')
      await expect(toast).toHaveScreenshot('toast-error.png')
    })

    test('warning toast notification', async ({ page }) => {
      await page.evaluate(() => {
        const event = new CustomEvent('show-toast', {
          detail: {
            type: 'warning',
            title: 'Warning!',
            message: 'You are approaching your property limit.',
          }
        })
        window.dispatchEvent(event)
      })

      await page.waitForTimeout(200)
      const toast = page.locator('[data-testid="toast-notification"]')
      await expect(toast).toHaveScreenshot('toast-warning.png')
    })

    test('info toast notification', async ({ page }) => {
      await page.evaluate(() => {
        const event = new CustomEvent('show-toast', {
          detail: {
            type: 'info',
            title: 'Information',
            message: 'New features are now available in your dashboard.',
          }
        })
        window.dispatchEvent(event)
      })

      await page.waitForTimeout(200)
      const toast = page.locator('[data-testid="toast-notification"]')
      await expect(toast).toHaveScreenshot('toast-info.png')
    })

    test('toast with action button', async ({ page }) => {
      await page.evaluate(() => {
        const event = new CustomEvent('show-toast', {
          detail: {
            type: 'info',
            title: 'Backup Complete',
            message: 'Your data has been backed up successfully.',
            action: {
              label: 'View Details',
              callback: () => console.log('Action clicked')
            }
          }
        })
        window.dispatchEvent(event)
      })

      await page.waitForTimeout(200)
      const toast = page.locator('[data-testid="toast-notification"]')
      await expect(toast).toHaveScreenshot('toast-with-action.png')
    })

    test('persistent toast notification', async ({ page }) => {
      await page.evaluate(() => {
        const event = new CustomEvent('show-toast', {
          detail: {
            type: 'error',
            title: 'Connection Error',
            message: 'Unable to connect to server. Please check your internet connection.',
            persistent: true
          }
        })
        window.dispatchEvent(event)
      })

      await page.waitForTimeout(200)
      const toast = page.locator('[data-testid="toast-notification"]')
      await expect(toast).toHaveScreenshot('toast-persistent.png')
    })

    test('multiple toast notifications stack', async ({ page }) => {
      // Trigger multiple toasts
      await page.evaluate(() => {
        const events = [
          { type: 'success', title: 'Property Created', message: 'Sunset Villa has been created.' },
          { type: 'info', title: 'Email Sent', message: 'Welcome email sent to tenant.' },
          { type: 'warning', title: 'Payment Due', message: 'Rent payment is due in 3 days.' }
        ]
        
        events.forEach((toast, index) => {
          setTimeout(() => {
            const event = new CustomEvent('show-toast', { detail: toast })
            window.dispatchEvent(event)
          }, index * 100)
        })
      })

      await page.waitForTimeout(500)
      const toastContainer = page.locator('[data-testid="toast-container"]')
      await expect(toastContainer).toHaveScreenshot('toast-stack-multiple.png')
    })

    test('toast notification positions', async ({ page }) => {
      const positions = ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center']
      
      for (const position of positions) {
        await page.evaluate((pos) => {
          // Set toast position
          document.documentElement.style.setProperty('--toast-position', pos)
          
          const event = new CustomEvent('show-toast', {
            detail: {
              type: 'info',
              title: 'Position Test',
              message: `Toast at ${pos} position.`,
            }
          })
          window.dispatchEvent(event)
        }, position)

        await page.waitForTimeout(200)
        const toast = page.locator('[data-testid="toast-notification"]')
        await expect(toast).toHaveScreenshot(`toast-position-${position}.png`)
        
        // Clear toast
        await page.evaluate(() => {
          const toasts = document.querySelectorAll('[data-testid="toast-notification"]')
          toasts.forEach(toast => toast.remove())
        })
      }
    })
  })

  test.describe('Email Notification Templates', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/notifications/email-templates')
      await page.waitForLoadState('networkidle')
    })

    test('email templates list', async ({ page }) => {
      await expect(page).toHaveScreenshot('email-templates-list.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('welcome email template', async ({ page }) => {
      await page.click('[data-testid="template-welcome-email"]')
      await page.waitForSelector('[data-testid="email-template-preview"]')

      const preview = page.locator('[data-testid="email-template-preview"]')
      await expect(preview).toHaveScreenshot('welcome-email-template.png')
    })

    test('payment reminder template', async ({ page }) => {
      await page.click('[data-testid="template-payment-reminder"]')
      await page.waitForSelector('[data-testid="email-template-preview"]')

      const preview = page.locator('[data-testid="email-template-preview"]')
      await expect(preview).toHaveScreenshot('payment-reminder-template.png')
    })

    test('maintenance update template', async ({ page }) => {
      await page.click('[data-testid="template-maintenance-update"]')
      await page.waitForSelector('[data-testid="email-template-preview"]')

      const preview = page.locator('[data-testid="email-template-preview"]')
      await expect(preview).toHaveScreenshot('maintenance-update-template.png')
    })

    test('lease expiry notice template', async ({ page }) => {
      await page.click('[data-testid="template-lease-expiry"]')
      await page.waitForSelector('[data-testid="email-template-preview"]')

      const preview = page.locator('[data-testid="email-template-preview"]')
      await expect(preview).toHaveScreenshot('lease-expiry-template.png')
    })

    test('email template editor', async ({ page }) => {
      await page.click('[data-testid="template-welcome-email"]')
      await page.click('[data-testid="edit-template-button"]')
      await page.waitForSelector('[data-testid="email-template-editor"]')

      const editor = page.locator('[data-testid="email-template-editor"]')
      await expect(editor).toHaveScreenshot('email-template-editor.png')
    })

    test('template variables panel', async ({ page }) => {
      await page.click('[data-testid="template-welcome-email"]')
      await page.click('[data-testid="edit-template-button"]')
      await page.waitForSelector('[data-testid="email-template-editor"]')

      const variablesPanel = page.locator('[data-testid="template-variables-panel"]')
      await expect(variablesPanel).toHaveScreenshot('template-variables-panel.png')
    })

    test('template preview modes', async ({ page }) => {
      await page.click('[data-testid="template-welcome-email"]')
      await page.waitForSelector('[data-testid="email-template-preview"]')

      // Desktop preview
      await page.click('[data-testid="preview-desktop"]')
      await page.waitForTimeout(200)
      const desktopPreview = page.locator('[data-testid="email-template-preview"]')
      await expect(desktopPreview).toHaveScreenshot('email-template-desktop-preview.png')

      // Mobile preview
      await page.click('[data-testid="preview-mobile"]')
      await page.waitForTimeout(200)
      const mobilePreview = page.locator('[data-testid="email-template-preview"]')
      await expect(mobilePreview).toHaveScreenshot('email-template-mobile-preview.png')
    })

    test('send test email modal', async ({ page }) => {
      await page.click('[data-testid="template-welcome-email"]')
      await page.click('[data-testid="send-test-email-button"]')
      await page.waitForSelector('[data-testid="send-test-email-modal"]')

      const modal = page.locator('[data-testid="send-test-email-modal"]')
      await expect(modal).toHaveScreenshot('send-test-email-modal.png')
    })
  })

  test.describe('Notification Settings', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/settings/notifications')
      await page.waitForLoadState('networkidle')
    })

    test('notification settings page', async ({ page }) => {
      await expect(page).toHaveScreenshot('notification-settings-page.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('notification preference categories', async ({ page }) => {
      const categories = page.locator('[data-testid="notification-category"]')
      const count = await categories.count()

      for (let i = 0; i < Math.min(4, count); i++) {
        const category = categories.nth(i)
        const categoryName = await category.getAttribute('data-category')
        await expect(category).toHaveScreenshot(`notification-category-${categoryName}.png`)
      }
    })

    test('notification channel toggles', async ({ page }) => {
      const channelToggles = page.locator('[data-testid="notification-channel-toggle"]')
      
      // Test different toggle states
      const firstToggle = channelToggles.first()
      
      // Enabled state
      await expect(firstToggle).toHaveScreenshot('notification-toggle-enabled.png')
      
      // Disabled state
      await firstToggle.click()
      await page.waitForTimeout(200)
      await expect(firstToggle).toHaveScreenshot('notification-toggle-disabled.png')
    })

    test('email notification frequency', async ({ page }) => {
      const frequencySection = page.locator('[data-testid="email-frequency-section"]')
      await expect(frequencySection).toHaveScreenshot('email-frequency-settings.png')
      
      // Test different frequency options
      await page.click('[data-testid="frequency-weekly"]')
      await page.waitForTimeout(200)
      await expect(frequencySection).toHaveScreenshot('email-frequency-weekly.png')
    })

    test('push notification settings', async ({ page }) => {
      const pushSettings = page.locator('[data-testid="push-notification-settings"]')
      await expect(pushSettings).toHaveScreenshot('push-notification-settings.png')
    })

    test('quiet hours configuration', async ({ page }) => {
      const quietHours = page.locator('[data-testid="quiet-hours-section"]')
      await expect(quietHours).toHaveScreenshot('quiet-hours-settings.png')
      
      // Enable quiet hours
      await page.check('[data-testid="enable-quiet-hours"]')
      await page.waitForTimeout(200)
      await expect(quietHours).toHaveScreenshot('quiet-hours-enabled.png')
    })

    test('notification digest settings', async ({ page }) => {
      const digestSettings = page.locator('[data-testid="notification-digest-settings"]')
      await expect(digestSettings).toHaveScreenshot('notification-digest-settings.png')
      
      // Configure digest
      await page.check('[data-testid="enable-digest"]')
      await page.selectOption('[data-testid="digest-frequency"]', 'daily')
      await page.waitForTimeout(200)
      await expect(digestSettings).toHaveScreenshot('notification-digest-configured.png')
    })

    test('notification test panel', async ({ page }) => {
      const testPanel = page.locator('[data-testid="notification-test-panel"]')
      await expect(testPanel).toHaveScreenshot('notification-test-panel.png')
      
      // Send test notification
      await page.click('[data-testid="send-test-notification"]')
      await page.waitForTimeout(500)
      await expect(testPanel).toHaveScreenshot('notification-test-sent.png')
    })
  })

  test.describe('Mobile Push Notifications', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
    })

    test('mobile notification permission prompt', async ({ page }) => {
      // Mock permission request
      await page.evaluate(() => {
        // Show mock permission prompt
        const prompt = document.createElement('div')
        prompt.setAttribute('data-testid', 'permission-prompt')
        prompt.className = 'permission-prompt'
        prompt.innerHTML = `
          <div class="permission-content">
            <h3>Enable Notifications</h3>
            <p>Get notified about important updates and messages.</p>
            <div class="permission-buttons">
              <button class="allow-btn">Allow</button>
              <button class="deny-btn">Don't Allow</button>
            </div>
          </div>
        `
        document.body.appendChild(prompt)
      })

      await page.waitForTimeout(200)
      const prompt = page.locator('[data-testid="permission-prompt"]')
      await expect(prompt).toHaveScreenshot('mobile-permission-prompt.png')
    })

    test('mobile push notification banner', async ({ page }) => {
      await page.evaluate(() => {
        const banner = document.createElement('div')
        banner.setAttribute('data-testid', 'push-notification-banner')
        banner.className = 'push-notification-banner'
        banner.innerHTML = `
          <div class="notification-content">
            <div class="notification-icon">🏠</div>
            <div class="notification-text">
              <strong>Maintenance Request Update</strong>
              <p>Your plumbing repair has been completed.</p>
            </div>
            <button class="close-btn">×</button>
          </div>
        `
        document.body.appendChild(banner)
      })

      await page.waitForTimeout(200)
      const banner = page.locator('[data-testid="push-notification-banner"]')
      await expect(banner).toHaveScreenshot('mobile-push-notification-banner.png')
    })

    test('mobile notification center', async ({ page }) => {
      await page.click('[data-testid="notification-bell"]')
      await page.waitForTimeout(300)

      const notificationCenter = page.locator('[data-testid="notifications-dropdown"]')
      await expect(notificationCenter).toHaveScreenshot('mobile-notification-center.png')
    })
  })

  test.describe('Notification Responsive Design', () => {
    const viewports = [
      { width: 1440, height: 900, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' },
    ]

    test('notification dropdown responsive', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(300)

        await page.click('[data-testid="notification-bell"]')
        await page.waitForTimeout(200)

        const dropdown = page.locator('[data-testid="notifications-dropdown"]')
        await expect(dropdown).toHaveScreenshot(`notifications-dropdown-${viewport.name}.png`)
        
        // Close dropdown for next iteration
        await page.click('[data-testid="notification-bell"]')
      }
    })

    test('toast notifications responsive', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(300)

        await page.evaluate(() => {
          const event = new CustomEvent('show-toast', {
            detail: {
              type: 'success',
              title: 'Success!',
              message: 'This is a test notification to check responsive design.',
            }
          })
          window.dispatchEvent(event)
        })

        await page.waitForTimeout(200)
        const toast = page.locator('[data-testid="toast-notification"]')
        await expect(toast).toHaveScreenshot(`toast-notification-${viewport.name}.png`)
      }
    })
  })

  test.describe('Notification Themes', () => {
    test('notifications dark theme', async ({ page }) => {
      await page.goto('/dashboard')
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark')
      })
      await page.waitForTimeout(300)

      await page.click('[data-testid="notification-bell"]')
      await page.waitForTimeout(200)

      const dropdown = page.locator('[data-testid="notifications-dropdown"]')
      await expect(dropdown).toHaveScreenshot('notifications-dropdown-dark.png')
    })

    test('toast notifications dark theme', async ({ page }) => {
      await page.goto('/dashboard')
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark')
      })
      await page.waitForTimeout(300)

      await page.evaluate(() => {
        const event = new CustomEvent('show-toast', {
          detail: {
            type: 'info',
            title: 'Dark Theme Test',
            message: 'Testing toast notification in dark theme.',
          }
        })
        window.dispatchEvent(event)
      })

      await page.waitForTimeout(200)
      const toast = page.locator('[data-testid="toast-notification"]')
      await expect(toast).toHaveScreenshot('toast-notification-dark.png')
    })

    test('notification settings high contrast', async ({ page }) => {
      await page.goto('/settings/notifications')
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-contrast', 'high')
      })
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('notification-settings-high-contrast.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })
  })
})