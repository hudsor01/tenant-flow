import { Page } from '@playwright/test'

export class MaintenanceTestHelpers {
  constructor(private page: Page) {}

  /**
   * Create a maintenance request with specified priority
   */
  async createMaintenanceRequest(priority: 'low' | 'medium' | 'high' | 'emergency' = 'medium') {
    const requestData = {
      id: `maint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `Test Maintenance Request ${Date.now()}`,
      description: 'This is a test maintenance request for visual testing',
      category: 'plumbing',
      priority,
      status: 'open',
      tenantId: 'test-tenant-id',
      unitId: 'test-unit-id',
      propertyId: 'test-property-id',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      photos: [],
      timeline: [
        {
          id: 'timeline-1',
          action: 'created',
          description: 'Request created by tenant',
          timestamp: new Date().toISOString(),
          userId: 'test-tenant-id'
        }
      ]
    }

    // Mock API response
    await this.page.route(`/api/v1/maintenance/${requestData.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(requestData)
      })
    })

    return requestData
  }

  /**
   * Create multiple maintenance requests with different statuses
   */
  async createMaintenanceRequests(count: number) {
    const requests = []
    const statuses = ['open', 'in_progress', 'completed', 'cancelled']
    const priorities = ['low', 'medium', 'high', 'emergency']
    const categories = ['plumbing', 'electrical', 'appliance', 'hvac', 'pest-control', 'other']

    for (let i = 0; i < count; i++) {
      const request = {
        id: `maint-${Date.now()}-${i}`,
        title: `Maintenance Request ${i + 1}`,
        description: `Description for maintenance request ${i + 1}`,
        category: categories[i % categories.length],
        priority: priorities[i % priorities.length],
        status: statuses[i % statuses.length],
        tenantId: `tenant-${i + 1}`,
        unitId: `unit-${i + 1}`,
        propertyId: `property-${Math.floor(i / 3) + 1}`,
        createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
        updatedAt: new Date().toISOString(),
        assignedTo: i % 2 === 0 ? `tech-${(i % 3) + 1}` : null,
        photos: i % 3 === 0 ? ['photo1.jpg', 'photo2.jpg'] : [],
        timeline: [
          {
            id: `timeline-${i}-1`,
            action: 'created',
            description: 'Request created',
            timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
            userId: `tenant-${i + 1}`
          }
        ]
      }
      requests.push(request)
    }

    // Mock API responses
    await this.page.route('/api/v1/maintenance*', async (route) => {
      const url = new URL(route.request().url())
      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = parseInt(url.searchParams.get('limit') || '10')
      
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedRequests = requests.slice(startIndex, endIndex)
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: paginatedRequests,
          meta: {
            total: requests.length,
            page,
            limit,
            totalPages: Math.ceil(requests.length / limit)
          }
        })
      })
    })

    return requests
  }

  /**
   * Create technician data
   */
  async createTechnicians(count: number) {
    const technicians = []
    const skills = ['plumbing', 'electrical', 'hvac', 'appliance', 'general']
    const availabilityStatuses = ['available', 'busy', 'off_duty']

    for (let i = 0; i < count; i++) {
      const tech = {
        id: `tech-${i + 1}`,
        name: `Technician ${i + 1}`,
        email: `tech${i + 1}@example.com`,
        phone: `555-${(1000 + i).toString()}`,
        skills: skills.slice(0, Math.floor(Math.random() * 3) + 2),
        availability: availabilityStatuses[i % availabilityStatuses.length],
        activeRequests: Math.floor(Math.random() * 5),
        rating: 4 + Math.random(),
        avatar: `https://images.unsplash.com/photo-150097631644${i}-${i}?w=100&h=100&fit=crop&crop=face`
      }
      technicians.push(tech)
    }

    // Mock API responses
    await this.page.route('/api/v1/technicians*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: technicians,
          meta: {
            total: technicians.length
          }
        })
      })
    })

    return technicians
  }

  /**
   * Setup maintenance dashboard mock data
   */
  async setupDashboardMockData() {
    const dashboardData = {
      stats: {
        totalRequests: 45,
        openRequests: 12,
        inProgressRequests: 8,
        completedThisMonth: 25,
        averageResponseTime: 4.2,
        averageCompletionTime: 24.6
      },
      recentRequests: [
        {
          id: 'maint-recent-1',
          title: 'Leaky Faucet in Unit 101',
          priority: 'medium',
          status: 'open',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'maint-recent-2',
          title: 'HVAC Not Working',
          priority: 'high',
          status: 'in_progress',
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'maint-recent-3',
          title: 'Electrical Outlet Issue',
          priority: 'emergency',
          status: 'open',
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        }
      ],
      urgentRequests: [
        {
          id: 'maint-urgent-1',
          title: 'Gas Leak - Unit 205',
          priority: 'emergency',
          status: 'open',
          tenantName: 'John Doe',
          unitNumber: '205'
        },
        {
          id: 'maint-urgent-2',
          title: 'No Hot Water - Building A',
          priority: 'high',
          status: 'in_progress',
          tenantName: 'Jane Smith',
          unitNumber: '301'
        }
      ]
    }

    await this.page.route('/api/v1/maintenance/dashboard*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dashboardData)
      })
    })

    return dashboardData
  }

  /**
   * Delete maintenance request (cleanup)
   */
  async deleteMaintenanceRequest(requestId: string) {
    await this.page.route(`/api/v1/maintenance/${requestId}`, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 204,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Request deleted' })
        })
      } else {
        await route.continue()
      }
    })
  }

  /**
   * Setup maintenance analytics mock data
   */
  async setupAnalyticsMockData() {
    const analyticsData = {
      requestVolume: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        data: [45, 52, 38, 61, 47, 53]
      },
      responseTime: {
        average: 4.2,
        target: 4.0,
        trend: 'improving'
      },
      completionRate: {
        percentage: 94,
        target: 95
      },
      costAnalysis: {
        totalCost: 15420,
        averageCostPerRequest: 285,
        trend: 'stable'
      },
      categoryBreakdown: [
        { category: 'Plumbing', count: 18, percentage: 35 },
        { category: 'Electrical', count: 12, percentage: 23 },
        { category: 'HVAC', count: 8, percentage: 15 },
        { category: 'Appliance', count: 7, percentage: 14 },
        { category: 'Other', count: 7, percentage: 13 }
      ]
    }

    await this.page.route('/api/v1/maintenance/analytics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(analyticsData)
      })
    })

    return analyticsData
  }
}