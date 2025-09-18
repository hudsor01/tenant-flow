/**
 * Media Stack Test Utilities
 * Utility functions for testing media stack services
 */

import { Page } from '@playwright/test'
import { MEDIA_STACK_CONFIG, MediaStackService } from './media-stack-config'

export interface ServiceTestResult {
  serviceName: string
  host: string
  port: number
  url: string
  accessible: boolean
  authenticated: boolean
  title: string
  errors: string[]
  screenshotPath?: string
  responseTime?: number
  statusCode?: number
}

export interface TestSummary {
  totalServices: number
  accessibleServices: number
  servicesWithErrors: number
  timestamp: string
  results: ServiceTestResult[]
}

export class MediaStackTestUtils {
  constructor(private page: Page) {}

  /**
   * Test connection to a service host/port combination
   */
  async testConnection(host: string, port: number): Promise<boolean> {
    try {
      const testUrl = `http://${host}:${port}`
      const response = await this.page.request.get(testUrl, { 
        timeout: 10000,
        ignoreHTTPSErrors: true 
      })
      return response.status() < 500
    } catch {
      return false
    }
  }

  /**
   * Find the first accessible host for a service
   */
  async findAccessibleHost(service: MediaStackService): Promise<string | null> {
    for (const host of MEDIA_STACK_CONFIG.serverHosts) {
      const accessible = await this.testConnection(host, service.port)
      if (accessible) {
        return host
      }
    }
    return null
  }

  /**
   * Generate a detailed HTML report
   */
  generateHtmlReport(summary: TestSummary): string {
    const successCount = summary.accessibleServices
    const totalCount = summary.totalServices
    const successRate = Math.round((successCount / totalCount) * 100)

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Media Stack Services Test Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .timestamp {
            opacity: 0.8;
            font-size: 1.1rem;
        }
        
        .summary {
            padding: 30px;
            background: #f7fafc;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-label {
            color: #718096;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .success { color: #38a169; }
        .warning { color: #d69e2e; }
        .error { color: #e53e3e; }
        
        .services {
            padding: 30px;
        }
        
        .service-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 20px;
            overflow: hidden;
            transition: all 0.3s ease;
        }
        
        .service-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
        
        .service-header {
            padding: 20px;
            background: #f7fafc;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: between;
        }
        
        .service-name {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .service-url {
            color: #718096;
            font-size: 0.9rem;
            font-family: monospace;
        }
        
        .service-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-left: auto;
        }
        
        .status-success {
            background: #c6f6d5;
            color: #22543d;
        }
        
        .status-error {
            background: #fed7d7;
            color: #742a2a;
        }
        
        .service-details {
            padding: 20px;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .detail-label {
            font-weight: 500;
            color: #4a5568;
        }
        
        .detail-value {
            color: #2d3748;
            font-family: monospace;
        }
        
        .errors {
            margin-top: 15px;
            padding: 15px;
            background: #fed7d7;
            border-radius: 6px;
            border-left: 4px solid #e53e3e;
        }
        
        .error-title {
            font-weight: 600;
            color: #742a2a;
            margin-bottom: 10px;
        }
        
        .error-item {
            color: #742a2a;
            margin-bottom: 5px;
            font-size: 0.9rem;
        }
        
        .screenshot {
            margin-top: 20px;
            text-align: center;
        }
        
        .screenshot img {
            max-width: 100%;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .footer {
            padding: 30px;
            background: #2d3748;
            color: white;
            text-align: center;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #48bb78, #38a169);
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>Media Stack Services Test Report</h1>
            <div class="timestamp">Generated: ${summary.timestamp}</div>
        </header>
        
        <section class="summary">
            <h2>Test Summary</h2>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${successRate}%"></div>
            </div>
            <div class="summary-grid">
                <div class="stat-card">
                    <div class="stat-value">${totalCount}</div>
                    <div class="stat-label">Total Services</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value success">${successCount}</div>
                    <div class="stat-label">Accessible</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value ${summary.servicesWithErrors > 0 ? 'error' : 'success'}">${summary.servicesWithErrors}</div>
                    <div class="stat-label">With Errors</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value ${successRate >= 80 ? 'success' : successRate >= 50 ? 'warning' : 'error'}">${successRate}%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
            </div>
        </section>
        
        <section class="services">
            <h2>Service Details</h2>
            ${summary.results.map(result => `
                <div class="service-card">
                    <div class="service-header">
                        <div>
                            <div class="service-name">${result.serviceName}</div>
                            <div class="service-url">${result.url}</div>
                        </div>
                        <div class="service-status ${result.accessible ? 'status-success' : 'status-error'}">
                            ${result.accessible ? 'Accessible' : 'Unavailable'}
                        </div>
                    </div>
                    <div class="service-details">
                        <div class="detail-row">
                            <span class="detail-label">Host:</span>
                            <span class="detail-value">${result.host}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Port:</span>
                            <span class="detail-value">${result.port}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Page Title:</span>
                            <span class="detail-value">${result.title || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Authentication:</span>
                            <span class="detail-value ${result.authenticated ? 'success' : 'error'}">${result.authenticated ? 'Success' : 'Failed/Not Required'}</span>
                        </div>
                        ${result.responseTime ? `
                        <div class="detail-row">
                            <span class="detail-label">Response Time:</span>
                            <span class="detail-value">${result.responseTime}ms</span>
                        </div>
                        ` : ''}
                        ${result.errors.length > 0 ? `
                        <div class="errors">
                            <div class="error-title">Errors Found:</div>
                            ${result.errors.map(error => `<div class="error-item">• ${error}</div>`).join('')}
                        </div>
                        ` : ''}
                        ${result.screenshotPath ? `
                        <div class="screenshot">
                            <p><strong>Screenshot:</strong></p>
                            <img src="${result.screenshotPath}" alt="${result.serviceName} Screenshot" loading="lazy">
                        </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </section>
        
        <footer class="footer">
            <p>Media Stack Services Health Check - Automated Testing Report</p>
            <p>This report was generated automatically to verify all media services are operational.</p>
        </footer>
    </div>
</body>
</html>`;
  }

  /**
   * Save HTML report to file
   */
  async saveHtmlReport(summary: TestSummary, filePath: string): Promise<void> {
    const html = this.generateHtmlReport(summary)
    const fs = await import('fs')
    await fs.promises.writeFile(filePath, html, 'utf8')
  }
}
