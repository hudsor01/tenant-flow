/**
 * Comprehensive SupabaseService mock factory for testing
 * Following ultra-native architecture patterns
 */

export interface MockSupabaseClient {
	from: jest.Mock
	select: jest.Mock
	insert: jest.Mock
	update: jest.Mock
	upsert: jest.Mock
	delete: jest.Mock
	eq: jest.Mock
	neq: jest.Mock
	gt: jest.Mock
	gte: jest.Mock
	lt: jest.Mock
	lte: jest.Mock
	like: jest.Mock
	ilike: jest.Mock
	in: jest.Mock
	is: jest.Mock
	order: jest.Mock
	limit: jest.Mock
	single: jest.Mock
	maybeSingle: jest.Mock
	rpc: jest.Mock
	storage: {
		from: jest.Mock
		upload: jest.Mock
		download: jest.Mock
		remove: jest.Mock
		list: jest.Mock
		createSignedUrl: jest.Mock
		createSignedUrls: jest.Mock
	}
}

export interface MockSupabaseService {
	getAdminClient: jest.Mock<MockSupabaseClient>
	getUserClient: jest.Mock<MockSupabaseClient>
}

/**
 * Create a chainable Supabase client mock with all methods
 */
export function createMockSupabaseClient(defaultReturn = { data: null, error: null }): MockSupabaseClient {
	const mockClient: MockSupabaseClient = {
		from: jest.fn().mockReturnThis(),
		select: jest.fn().mockReturnThis(),
		insert: jest.fn().mockReturnThis(),
		update: jest.fn().mockReturnThis(),
		upsert: jest.fn().mockReturnThis(),
		delete: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		neq: jest.fn().mockReturnThis(),
		gt: jest.fn().mockReturnThis(),
		gte: jest.fn().mockReturnThis(),
		lt: jest.fn().mockReturnThis(),
		lte: jest.fn().mockReturnThis(),
		like: jest.fn().mockReturnThis(),
		ilike: jest.fn().mockReturnThis(),
		in: jest.fn().mockReturnThis(),
		is: jest.fn().mockReturnThis(),
		order: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnThis(),
		single: jest.fn().mockResolvedValue(defaultReturn),
		maybeSingle: jest.fn().mockResolvedValue(defaultReturn),
		rpc: jest.fn().mockResolvedValue(defaultReturn),
		storage: {
			from: jest.fn().mockReturnThis(),
			upload: jest.fn().mockResolvedValue(defaultReturn),
			download: jest.fn().mockResolvedValue(defaultReturn),
			remove: jest.fn().mockResolvedValue(defaultReturn),
			list: jest.fn().mockResolvedValue(defaultReturn),
			createSignedUrl: jest.fn().mockResolvedValue(defaultReturn),
			createSignedUrls: jest.fn().mockResolvedValue(defaultReturn),
		}
	}

	return mockClient as MockSupabaseClient
}

/**
 * Create a comprehensive SupabaseService mock
 */
export function createMockSupabaseService(
	adminClientReturn = { data: null, error: null },
	userClientReturn = { data: null, error: null }
): MockSupabaseService {
	const mockAdminClient = createMockSupabaseClient(adminClientReturn)
	const mockUserClient = createMockSupabaseClient(userClientReturn)

	return {
		getAdminClient: jest.fn().mockReturnValue(mockAdminClient) as jest.Mock<MockSupabaseClient>,
		getUserClient: jest.fn().mockReturnValue(mockUserClient) as jest.Mock<MockSupabaseClient>,
	}
}

/**
 * Helper to configure RPC responses for dashboard tests
 */
export function configureDashboardRPCMocks(mockSupabaseService: MockSupabaseService) {
	const mockAdminClient = mockSupabaseService.getAdminClient()

	// Mock successful dashboard stats RPC
	mockAdminClient.rpc.mockImplementation((functionName: string, _params?: unknown) => {
		switch (functionName) {
			case 'get_user_dashboard_stats':
				return Promise.resolve({
					data: {
						properties: {
							total: 10,
							occupied: 8,
							vacant: 2,
							occupancyRate: 80,
							totalrent_amount: 15000,
							averageRent: 1500
						},
						tenants: {
							total: 8,
							active: 7,
							inactive: 1,
							newThisMonth: 2
						},
						units: {
							total: 10,
							occupied: 8,
							vacant: 2,
							maintenance: 0,
							averageRent: 1500,
							available: 2,
							occupancyRate: 80,
							totalPotentialRent: 15000,
							totalActualRent: 15000
						},
						leases: {
							total: 8,
							active: 6,
							expired: 2,
							expiringSoon: 1
						},
						maintenance: {
							total: 0,
							open: 0,
							inProgress: 0,
							completed: 0,
							avgResolutionTime: 0,
							byPriority: {
								low: 0,
								medium: 0,
								high: 0,
								emergency: 0
							}
						},
						revenue: {
							monthly: 15000,
							yearly: 180000,
							growth: 0
						}
					},
					error: null
				})

			case 'get_user_dashboard_activity':
				return Promise.resolve({
					data: { activities: [] },
					error: null
				})

			case 'get_stripe_billing_insights':
				return Promise.resolve({
					data: {
						revenue: [],
						churn: [],
						customerLifetimeValue: [],
						mrr: [],
						subscriptionStatusBreakdown: {}
					},
					error: null
				})

			case 'check_stripe_sync_health':
				return Promise.resolve({
					data: true,
					error: null
				})

			default:
				return Promise.resolve({ data: null, error: null })
		}
	})

	return mockSupabaseService
}

/**
 * Helper to mock RPC errors for testing error scenarios
 */
export function mockRPCError(mockSupabaseService: MockSupabaseService, functionName: string, error: unknown) {
	const mockAdminClient = mockSupabaseService.getAdminClient()

	mockAdminClient.rpc.mockImplementation((name: string) => {
		if (name === functionName) {
			return Promise.resolve({ data: null, error })
		}
		return Promise.resolve({ data: null, error: null })
	})
}