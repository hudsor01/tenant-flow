/**
 * Shared mock utilities
 */

// Mock Supabase client
export const mockSupabaseClient: any = {
	from: jest.fn().mockReturnThis(),
	select: jest.fn().mockReturnThis(),
	insert: jest.fn().mockReturnThis(),
	update: jest.fn().mockReturnThis(),
	delete: jest.fn().mockReturnThis(),
	eq: jest.fn().mockReturnThis(),
	single: jest.fn(() => Promise.resolve({ data: null, error: null })),
	then: jest.fn((callback: (result: any) => any) =>
		callback({ data: null, error: null })
	)
}

// Mock Auth client
export const mockAuthClient = {
	signUp: jest.fn(),
	signInWithPassword: jest.fn(),
	signOut: jest.fn(),
	getSession: jest.fn(() =>
		Promise.resolve({ data: { session: null }, error: null })
	),
	getUser: jest.fn(() =>
		Promise.resolve({ data: { user: null }, error: null })
	)
}
