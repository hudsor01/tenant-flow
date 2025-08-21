import type { Meta, StoryObj } from '@storybook/react'
import {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
	MoreHorizontal,
	Heart,
	MessageCircle,
	Share,
	Star,
	Calendar,
	MapPin,
	User,
	Clock,
	TrendingUp,
	DollarSign,
	Users,
	Activity
} from 'lucide-react'

const meta: Meta<typeof Card> = {
	title: 'UI/Card',
	component: Card,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A flexible card component with header, content, and footer sections. Perfect for displaying structured content in a visually appealing way.'
			}
		}
	},
	tags: ['autodocs'],
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes to apply to the card'
		}
	}
}

export default meta
type Story = StoryObj<typeof Card>

// Basic Card Stories
export const Default: Story = {
	render: () => (
		<Card className="w-80">
			<CardHeader>
				<CardTitle>Card Title</CardTitle>
				<CardDescription>
					This is a basic card description that explains what this
					card is about.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p>
					This is the main content area of the card where you can put
					any content you need.
				</p>
			</CardContent>
			<CardFooter>
				<Button>Action</Button>
			</CardFooter>
		</Card>
	)
}

export const WithAction: Story = {
	render: () => (
		<Card className="w-80">
			<CardHeader>
				<CardTitle>Card with Action</CardTitle>
				<CardDescription>
					This card has an action button in the header
				</CardDescription>
				<CardAction>
					<Button variant="ghost" size="sm">
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				<p>
					The action button is positioned in the top-right corner of
					the card header.
				</p>
			</CardContent>
		</Card>
	)
}

export const ProductCard: Story = {
	render: () => (
		<Card className="w-80">
			<CardHeader>
				<CardTitle>Premium Plan</CardTitle>
				<CardDescription>
					Perfect for growing businesses
				</CardDescription>
				<CardAction>
					<Badge variant="secondary">Popular</Badge>
				</CardAction>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<div className="text-3xl font-bold">
						$29<span className="text-base font-normal">/month</span>
					</div>
					<ul className="space-y-2 text-sm">
						<li className="flex items-center gap-2">
							<div className="h-1.5 w-1.5 rounded-full bg-green-500" />
							Unlimited projects
						</li>
						<li className="flex items-center gap-2">
							<div className="h-1.5 w-1.5 rounded-full bg-green-500" />
							24/7 support
						</li>
						<li className="flex items-center gap-2">
							<div className="h-1.5 w-1.5 rounded-full bg-green-500" />
							Advanced analytics
						</li>
					</ul>
				</div>
			</CardContent>
			<CardFooter>
				<Button className="w-full" variant="cta">
					Get Started
				</Button>
			</CardFooter>
		</Card>
	)
}

export const UserProfileCard: Story = {
	render: () => (
		<Card className="w-80">
			<CardHeader>
				<CardTitle className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 font-semibold text-white">
						JD
					</div>
					John Doe
				</CardTitle>
				<CardDescription>Senior Frontend Developer</CardDescription>
				<CardAction>
					<Button variant="outline" size="sm">
						Follow
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					<div className="text-muted-foreground flex items-center gap-2 text-sm">
						<MapPin className="h-4 w-4" />
						San Francisco, CA
					</div>
					<div className="text-muted-foreground flex items-center gap-2 text-sm">
						<Calendar className="h-4 w-4" />
						Joined March 2023
					</div>
					<p className="text-sm">
						Passionate about creating beautiful user interfaces and
						seamless user experiences. Love working with React,
						TypeScript, and modern web technologies.
					</p>
				</div>
			</CardContent>
			<CardFooter>
				<div className="flex w-full gap-2">
					<Button variant="ghost" size="sm" className="flex-1">
						<Heart className="h-4 w-4" />
					</Button>
					<Button variant="ghost" size="sm" className="flex-1">
						<MessageCircle className="h-4 w-4" />
					</Button>
					<Button variant="ghost" size="sm" className="flex-1">
						<Share className="h-4 w-4" />
					</Button>
				</div>
			</CardFooter>
		</Card>
	)
}

export const ArticleCard: Story = {
	render: () => (
		<Card className="w-96">
			<CardHeader>
				<CardTitle>Building Scalable React Applications</CardTitle>
				<CardDescription>
					Learn best practices for structuring large-scale React
					applications with TypeScript, state management, and testing
					strategies.
				</CardDescription>
				<CardAction>
					<Button variant="ghost" size="sm">
						<Star className="h-4 w-4" />
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<div className="aspect-video w-full rounded-lg bg-gradient-to-r from-orange-400 to-pink-500" />
					<div className="text-muted-foreground flex items-center gap-4 text-sm">
						<div className="flex items-center gap-1">
							<User className="h-4 w-4" />
							Jane Smith
						</div>
						<div className="flex items-center gap-1">
							<Clock className="h-4 w-4" />5 min read
						</div>
					</div>
				</div>
			</CardContent>
			<CardFooter>
				<div className="flex w-full items-center justify-between">
					<div className="flex gap-2">
						<Badge variant="secondary">React</Badge>
						<Badge variant="secondary">TypeScript</Badge>
					</div>
					<Button size="sm">Read More</Button>
				</div>
			</CardFooter>
		</Card>
	)
}

export const StatsCard: Story = {
	render: () => (
		<Card className="w-64">
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>Total Revenue</span>
					<DollarSign className="text-muted-foreground h-5 w-5" />
				</CardTitle>
				<CardDescription>+12% from last month</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					<div className="text-2xl font-bold">$45,231.89</div>
					<div className="flex items-center gap-1 text-sm text-green-600">
						<TrendingUp className="h-4 w-4" />
						+12.5%
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

export const MetricCards: Story = {
	render: () => (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between text-sm font-medium">
						<span>Total Users</span>
						<Users className="text-muted-foreground h-4 w-4" />
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">2,345</div>
					<p className="text-muted-foreground text-xs">
						+180 from last month
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between text-sm font-medium">
						<span>Active Now</span>
						<Activity className="text-muted-foreground h-4 w-4" />
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">573</div>
					<p className="text-muted-foreground text-xs">
						+201 since last hour
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between text-sm font-medium">
						<span>Revenue</span>
						<DollarSign className="text-muted-foreground h-4 w-4" />
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">$12,234</div>
					<p className="text-muted-foreground text-xs">
						+19% from last month
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between text-sm font-medium">
						<span>Growth</span>
						<TrendingUp className="text-muted-foreground h-4 w-4" />
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">+573</div>
					<p className="text-muted-foreground text-xs">
						+201 since last hour
					</p>
				</CardContent>
			</Card>
		</div>
	),
	parameters: {
		layout: 'fullscreen',
		docs: {
			source: {
				type: 'code'
			}
		}
	}
}

export const InteractiveCard: Story = {
	render: () => (
		<Card className="w-80 cursor-pointer transition-all duration-200 hover:shadow-lg">
			<CardHeader>
				<CardTitle>Interactive Card</CardTitle>
				<CardDescription>
					This card responds to hover interactions
				</CardDescription>
				<CardAction>
					<Button variant="ghost" size="sm">
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				<p>
					Hover over this card to see the subtle shadow effect and
					transform animation.
				</p>
			</CardContent>
			<CardFooter>
				<Button variant="outline" className="w-full">
					Click me
				</Button>
			</CardFooter>
		</Card>
	)
}

export const MinimalCard: Story = {
	render: () => (
		<Card className="w-80">
			<CardContent>
				<p>
					This is a minimal card with just content, no header or
					footer.
				</p>
			</CardContent>
		</Card>
	)
}

export const HeaderOnlyCard: Story = {
	render: () => (
		<Card className="w-80">
			<CardHeader>
				<CardTitle>Header Only Card</CardTitle>
				<CardDescription>
					Sometimes you just need a header
				</CardDescription>
			</CardHeader>
		</Card>
	)
}

// Kitchen Sink - Multiple Card Variations
export const AllCardTypes: Story = {
	render: () => (
		<div className="space-y-8 p-6">
			<div>
				<h3 className="mb-4 text-lg font-semibold">Basic Cards</h3>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					<Card>
						<CardHeader>
							<CardTitle>Simple Card</CardTitle>
							<CardDescription>
								Basic card structure
							</CardDescription>
						</CardHeader>
						<CardContent>
							<p>Basic card content goes here.</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>With Action</CardTitle>
							<CardDescription>
								Card with header action
							</CardDescription>
							<CardAction>
								<Button variant="ghost" size="sm">
									•••
								</Button>
							</CardAction>
						</CardHeader>
						<CardContent>
							<p>This card has an action button.</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Full Structure</CardTitle>
							<CardDescription>
								Complete card with all sections
							</CardDescription>
						</CardHeader>
						<CardContent>
							<p>This card has header, content, and footer.</p>
						</CardContent>
						<CardFooter>
							<Button size="sm">Action</Button>
						</CardFooter>
					</Card>
				</div>
			</div>

			<div>
				<h3 className="mb-4 text-lg font-semibold">
					Specialized Cards
				</h3>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<div className="h-8 w-8 rounded bg-blue-500" />
								Product Card
							</CardTitle>
							<CardDescription>
								Showcase your products
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="mb-2 text-2xl font-bold">$99</div>
							<ul className="space-y-1 text-sm">
								<li>• Feature one</li>
								<li>• Feature two</li>
								<li>• Feature three</li>
							</ul>
						</CardContent>
						<CardFooter>
							<Button className="w-full">Buy Now</Button>
						</CardFooter>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Stats Card</CardTitle>
							<CardDescription>
								Display key metrics
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								<div className="text-3xl font-bold">1,234</div>
								<div className="flex items-center gap-1 text-sm text-green-600">
									<TrendingUp className="h-4 w-4" />
									+12.5%
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	),
	parameters: {
		layout: 'fullscreen'
	}
}
