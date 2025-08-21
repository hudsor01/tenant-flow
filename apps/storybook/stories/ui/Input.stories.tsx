import type { Meta, StoryObj } from '@storybook/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
	User,
	Mail,
	Search,
	Phone,
	Lock,
	CreditCard,
	Calendar,
	Globe
} from 'lucide-react'
import { useState } from 'react'

const meta: Meta<typeof Input> = {
	title: 'UI/Input',
	component: Input,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A comprehensive input component with validation states, floating labels, password visibility toggle, character counting, and full accessibility support.'
			}
		}
	},
	tags: ['autodocs'],
	argTypes: {
		type: {
			control: { type: 'select' },
			options: [
				'text',
				'email',
				'password',
				'number',
				'tel',
				'url',
				'search'
			],
			description: 'The type of input field'
		},
		label: {
			control: 'text',
			description: 'Label text for the input'
		},
		placeholder: {
			control: 'text',
			description: 'Placeholder text'
		},
		error: {
			control: 'text',
			description: 'Error message to display'
		},
		success: {
			control: 'text',
			description: 'Success message to display'
		},
		floatingLabel: {
			control: 'boolean',
			description: 'Whether to use a floating label animation'
		},
		showValidation: {
			control: 'boolean',
			description: 'Whether to show validation icons'
		},
		characterCount: {
			control: 'boolean',
			description: 'Whether to show character count'
		},
		maxLength: {
			control: 'number',
			description: 'Maximum number of characters'
		},
		disabled: {
			control: 'boolean',
			description: 'Whether the input is disabled'
		}
	}
}

export default meta
type Story = StoryObj<typeof Input>

// Basic Input Stories
export const Default: Story = {
	args: {
		placeholder: 'Enter some text...'
	}
}

export const WithLabel: Story = {
	render: () => (
		<div className="space-y-2">
			<Label htmlFor="input-with-label">Full Name</Label>
			<Input id="input-with-label" placeholder="Enter your full name" />
		</div>
	)
}

export const FloatingLabel: Story = {
	args: {
		label: 'Email Address',
		floatingLabel: true,
		type: 'email',
		placeholder: 'user@example.com'
	}
}

// Input Types
export const InputTypes: Story = {
	render: () => (
		<div className="w-80 space-y-4">
			<div className="space-y-2">
				<Label>Text Input</Label>
				<Input type="text" placeholder="Enter text..." />
			</div>

			<div className="space-y-2">
				<Label>Email Input</Label>
				<Input type="email" placeholder="user@example.com" />
			</div>

			<div className="space-y-2">
				<Label>Password Input</Label>
				<Input type="password" placeholder="Enter password..." />
			</div>

			<div className="space-y-2">
				<Label>Number Input</Label>
				<Input type="number" placeholder="Enter number..." />
			</div>

			<div className="space-y-2">
				<Label>Tel Input</Label>
				<Input type="tel" placeholder="+1 (555) 123-4567" />
			</div>

			<div className="space-y-2">
				<Label>URL Input</Label>
				<Input type="url" placeholder="https://example.com" />
			</div>

			<div className="space-y-2">
				<Label>Search Input</Label>
				<Input type="search" placeholder="Search..." />
			</div>
		</div>
	)
}

// Validation States
export const ValidationStates: Story = {
	render: () => (
		<div className="w-80 space-y-4">
			<div className="space-y-2">
				<Label>Default State</Label>
				<Input placeholder="Normal input" />
			</div>

			<div className="space-y-2">
				<Label>Success State</Label>
				<Input placeholder="Valid input" success="Looks good!" />
			</div>

			<div className="space-y-2">
				<Label>Error State</Label>
				<Input
					placeholder="Invalid input"
					error="This field is required"
				/>
			</div>

			<div className="space-y-2">
				<Label>Disabled State</Label>
				<Input placeholder="Disabled input" disabled />
			</div>
		</div>
	)
}

// Password Input with Visibility Toggle
export const PasswordInput: Story = {
	render: () => (
		<div className="w-80 space-y-4">
			<div className="space-y-2">
				<Label>Standard Password</Label>
				<Input type="password" placeholder="Enter password..." />
			</div>

			<div className="space-y-2">
				<Label>Floating Label Password</Label>
				<Input
					type="password"
					label="Password"
					floatingLabel
					placeholder="Enter password..."
				/>
			</div>

			<div className="space-y-2">
				<Label>Password with Validation</Label>
				<Input
					type="password"
					placeholder="Enter password..."
					success="Strong password!"
				/>
			</div>
		</div>
	)
}

// Character Count
export const CharacterCount: Story = {
	render: () => (
		<div className="w-80 space-y-4">
			<div className="space-y-2">
				<Label>Bio (max 150 characters)</Label>
				<Input
					placeholder="Tell us about yourself..."
					characterCount
					maxLength={150}
				/>
			</div>

			<div className="space-y-2">
				<Label>Floating Label with Character Count</Label>
				<Input
					label="Short Description"
					floatingLabel
					placeholder="Describe your project..."
					characterCount
					maxLength={100}
				/>
			</div>
		</div>
	)
}

// Form Examples
export const LoginForm: Story = {
	render: () => {
		const [formData, setFormData] = useState({
			email: '',
			password: ''
		})

		const [errors, setErrors] = useState({
			email: '',
			password: ''
		})

		const handleSubmit = (e: React.FormEvent) => {
			e.preventDefault()
			const newErrors = { email: '', password: '' }

			if (!formData.email) {
				newErrors.email = 'Email is required'
			} else if (!/\S+@\S+\.\S+/.test(formData.email)) {
				newErrors.email = 'Please enter a valid email'
			}

			if (!formData.password) {
				newErrors.password = 'Password is required'
			} else if (formData.password.length < 6) {
				newErrors.password = 'Password must be at least 6 characters'
			}

			setErrors(newErrors)

			if (!newErrors.email && !newErrors.password) {
				alert('Form submitted successfully!')
			}
		}

		return (
			<form onSubmit={handleSubmit} className="w-80 space-y-4">
				<div className="space-y-2">
					<Label htmlFor="login-email">Email</Label>
					<Input
						id="login-email"
						type="email"
						value={formData.email}
						onChange={e =>
							setFormData(prev => ({
								...prev,
								email: e.target.value
							}))
						}
						placeholder="Enter your email"
						error={errors.email}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="login-password">Password</Label>
					<Input
						id="login-password"
						type="password"
						value={formData.password}
						onChange={e =>
							setFormData(prev => ({
								...prev,
								password: e.target.value
							}))
						}
						placeholder="Enter your password"
						error={errors.password}
					/>
				</div>

				<Button type="submit" className="w-full">
					Sign In
				</Button>
			</form>
		)
	}
}

export const FloatingLabelForm: Story = {
	render: () => {
		const [formData, setFormData] = useState({
			firstName: '',
			lastName: '',
			email: '',
			phone: '',
			company: '',
			website: ''
		})

		return (
			<div className="w-96 space-y-6">
				<h3 className="text-lg font-semibold">Contact Information</h3>

				<div className="grid grid-cols-2 gap-4">
					<Input
						label="First Name"
						floatingLabel
						value={formData.firstName}
						onChange={e =>
							setFormData(prev => ({
								...prev,
								firstName: e.target.value
							}))
						}
						placeholder="John"
					/>
					<Input
						label="Last Name"
						floatingLabel
						value={formData.lastName}
						onChange={e =>
							setFormData(prev => ({
								...prev,
								lastName: e.target.value
							}))
						}
						placeholder="Doe"
					/>
				</div>

				<Input
					label="Email Address"
					floatingLabel
					type="email"
					value={formData.email}
					onChange={e =>
						setFormData(prev => ({
							...prev,
							email: e.target.value
						}))
					}
					placeholder="john@example.com"
				/>

				<Input
					label="Phone Number"
					floatingLabel
					type="tel"
					value={formData.phone}
					onChange={e =>
						setFormData(prev => ({
							...prev,
							phone: e.target.value
						}))
					}
					placeholder="+1 (555) 123-4567"
				/>

				<Input
					label="Company"
					floatingLabel
					value={formData.company}
					onChange={e =>
						setFormData(prev => ({
							...prev,
							company: e.target.value
						}))
					}
					placeholder="Acme Corp"
				/>

				<Input
					label="Website"
					floatingLabel
					type="url"
					value={formData.website}
					onChange={e =>
						setFormData(prev => ({
							...prev,
							website: e.target.value
						}))
					}
					placeholder="https://example.com"
				/>

				<Button className="w-full">Save Contact</Button>
			</div>
		)
	}
}

// Input with Icons (using icons in labels/wrappers)
export const InputWithIcons: Story = {
	render: () => (
		<div className="w-80 space-y-4">
			<div className="space-y-2">
				<Label className="flex items-center gap-2">
					<User className="h-4 w-4" />
					Username
				</Label>
				<Input placeholder="Enter username" />
			</div>

			<div className="space-y-2">
				<Label className="flex items-center gap-2">
					<Mail className="h-4 w-4" />
					Email
				</Label>
				<Input type="email" placeholder="Enter email" />
			</div>

			<div className="space-y-2">
				<Label className="flex items-center gap-2">
					<Lock className="h-4 w-4" />
					Password
				</Label>
				<Input type="password" placeholder="Enter password" />
			</div>

			<div className="space-y-2">
				<Label className="flex items-center gap-2">
					<Phone className="h-4 w-4" />
					Phone
				</Label>
				<Input type="tel" placeholder="Enter phone number" />
			</div>
		</div>
	)
}

// Search Input
export const SearchInput: Story = {
	render: () => {
		const [searchTerm, setSearchTerm] = useState('')

		return (
			<div className="w-80 space-y-4">
				<div className="space-y-2">
					<Label className="flex items-center gap-2">
						<Search className="h-4 w-4" />
						Search Products
					</Label>
					<Input
						type="search"
						value={searchTerm}
						onChange={e => setSearchTerm(e.target.value)}
						placeholder="Search for products..."
					/>
				</div>

				{searchTerm && (
					<div className="text-muted-foreground text-sm">
						Searching for: "{searchTerm}"
					</div>
				)}
			</div>
		)
	}
}

// Payment Form
export const PaymentForm: Story = {
	render: () => (
		<div className="w-80 space-y-4">
			<h3 className="flex items-center gap-2 text-lg font-semibold">
				<CreditCard className="h-5 w-5" />
				Payment Information
			</h3>

			<Input
				label="Card Number"
				floatingLabel
				placeholder="1234 5678 9012 3456"
				maxLength={19}
			/>

			<div className="grid grid-cols-2 gap-4">
				<Input
					label="MM/YY"
					floatingLabel
					placeholder="12/25"
					maxLength={5}
				/>
				<Input
					label="CVV"
					floatingLabel
					type="password"
					placeholder="123"
					maxLength={3}
				/>
			</div>

			<Input
				label="Cardholder Name"
				floatingLabel
				placeholder="John Doe"
			/>

			<Button className="w-full">Process Payment</Button>
		</div>
	)
}

// Input Sizes (custom styling)
export const InputSizes: Story = {
	render: () => (
		<div className="w-80 space-y-4">
			<div className="space-y-2">
				<Label>Small Input</Label>
				<Input placeholder="Small input" className="h-8 px-2 text-sm" />
			</div>

			<div className="space-y-2">
				<Label>Default Input</Label>
				<Input placeholder="Default input" />
			</div>

			<div className="space-y-2">
				<Label>Large Input</Label>
				<Input
					placeholder="Large input"
					className="h-11 px-4 text-base"
				/>
			</div>
		</div>
	)
}

// Real-time Validation Example
export const RealTimeValidation: Story = {
	render: () => {
		const [email, setEmail] = useState('')
		const [password, setPassword] = useState('')

		const emailError =
			email && !/\S+@\S+\.\S+/.test(email)
				? 'Please enter a valid email address'
				: ''
		const emailSuccess =
			email && /\S+@\S+\.\S+/.test(email) ? 'Email format is valid' : ''

		const passwordError =
			password && password.length < 8
				? 'Password must be at least 8 characters'
				: ''
		const passwordSuccess =
			password && password.length >= 8 ? 'Password strength is good' : ''

		return (
			<div className="w-80 space-y-4">
				<h3 className="text-lg font-semibold">Real-time Validation</h3>

				<Input
					label="Email Address"
					floatingLabel
					type="email"
					value={email}
					onChange={e => setEmail(e.target.value)}
					placeholder="user@example.com"
					error={emailError}
					success={emailSuccess}
				/>

				<Input
					label="Password"
					floatingLabel
					type="password"
					value={password}
					onChange={e => setPassword(e.target.value)}
					placeholder="Enter password"
					error={passwordError}
					success={passwordSuccess}
					characterCount
					maxLength={50}
				/>
			</div>
		)
	}
}

// Kitchen Sink - All Input Features
export const AllInputFeatures: Story = {
	render: () => (
		<div className="space-y-8 p-6">
			<div>
				<h3 className="mb-4 text-lg font-semibold">Basic Inputs</h3>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Input placeholder="Basic input" />
					<Input
						placeholder="With value"
						defaultValue="Hello World"
					/>
					<Input placeholder="Disabled" disabled />
					<Input
						placeholder="Read-only"
						readOnly
						defaultValue="Read-only text"
					/>
				</div>
			</div>

			<div>
				<h3 className="mb-4 text-lg font-semibold">Floating Labels</h3>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Input
						label="First Name"
						floatingLabel
						placeholder="John"
					/>
					<Input label="Last Name" floatingLabel placeholder="Doe" />
					<Input
						label="Email"
						floatingLabel
						type="email"
						placeholder="john@example.com"
					/>
					<Input
						label="Password"
						floatingLabel
						type="password"
						placeholder="Password"
					/>
				</div>
			</div>

			<div>
				<h3 className="mb-4 text-lg font-semibold">
					Validation States
				</h3>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<Input placeholder="Normal" />
					<Input placeholder="Success" success="Looks good!" />
					<Input placeholder="Error" error="Something went wrong" />
				</div>
			</div>

			<div>
				<h3 className="mb-4 text-lg font-semibold">Special Features</h3>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Input
						placeholder="Character counter"
						characterCount
						maxLength={50}
					/>
					<Input type="password" placeholder="Password with toggle" />
				</div>
			</div>
		</div>
	),
	parameters: {
		layout: 'fullscreen'
	}
}
