import {
	act,
	render,
	screen,
	userEvent,
	waitFor
} from '@/test/utils/test-render'
import AcceptInvitePage from '../page'

const mockPush = jest.fn()
let searchParams = new URLSearchParams('token=test-token&type=invite')
const mockUseSearchParams = jest.fn(() => searchParams)

jest.mock('next/navigation', () => ({
	__esModule: true,
	useRouter: () => ({
		push: mockPush
	}),
	useSearchParams: () => mockUseSearchParams()
}))

const mockVerifyOtp = jest.fn()
const mockUpdateUser = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
	__esModule: true,
	createClient: () => ({
		auth: {
			verifyOtp: (...args: Parameters<typeof mockVerifyOtp>) =>
				mockVerifyOtp(...args),
			updateUser: (...args: Parameters<typeof mockUpdateUser>) =>
				mockUpdateUser(...args)
		}
	})
}))

const originalFetch = global.fetch

describe('AcceptInvitePage', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockPush.mockClear()
		searchParams = new URLSearchParams('token=test-token&type=invite')
		mockUseSearchParams.mockImplementation(() => searchParams)
		mockVerifyOtp.mockResolvedValue({ data: { user: { id: 'tenant-1' } } })
		mockUpdateUser.mockResolvedValue({ data: { user: { id: 'tenant-1' } } })
		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: async () => ({})
			} as unknown as Response)
		) as jest.Mock
	})

	afterEach(() => {
		jest.useRealTimers()
		global.fetch = originalFetch
	})

	it('accepts invitation token, sets password, and redirects to tenant dashboard', async () => {
		jest.useFakeTimers()

		render(<AcceptInvitePage />)

		const passwordInput = await screen.findByLabelText(/password/i)
		const confirmPasswordInput =
			screen.getByLabelText(/confirm password/i)

		const user = userEvent.setup()
		await user.type(passwordInput, 'supersecret123')
		await user.type(confirmPasswordInput, 'supersecret123')

		await user.click(screen.getByRole('button', { name: /activate account/i }))

		expect(mockVerifyOtp).toHaveBeenCalledWith({
			token_hash: 'test-token',
			type: 'invite'
		})
		expect(mockUpdateUser).toHaveBeenCalledWith({
			password: 'supersecret123'
		})
		expect(global.fetch).toHaveBeenCalledWith(
			expect.stringContaining(
				'/api/v1/tenants/invitation/test-token/accept'
			),
			expect.objectContaining({ method: 'POST' })
		)

		await waitFor(() =>
			expect(
				screen.getByText(/welcome to tenantflow!/i)
			).toBeInTheDocument()
		)

		await act(async () => {
			jest.runAllTimers()
		})

		expect(mockPush).toHaveBeenCalledWith('/tenant')
	})

	it('shows invalid invitation state when token is missing or malformed', async () => {
		searchParams = new URLSearchParams('type=invite')
		mockUseSearchParams.mockImplementation(() => searchParams)

		render(<AcceptInvitePage />)

		expect(
			await screen.findByText(/invalid invitation/i)
		).toBeInTheDocument()
		expect(
			screen.getByText(/invalid or missing invitation token/i)
		).toBeInTheDocument()
		expect(mockPush).not.toHaveBeenCalled()
	})
})
