import Navbar from '@/components/navbar'
import { Mail, MessageSquare, Phone } from 'lucide-react'

export default function ContactPage() {
	return (
		<main className="min-h-screen bg-background">
			<Navbar />
			<div className="pt-10">
				{/* Hero Section */}
				<section className="marketing-hero surface-pattern">
					<div className="container text-center max-w-4xl">
						<h1 className="text-display text-gradient-premium mb-6">
							Ready to increase your NOI by 40%?
						</h1>
						<p className="text-xl text-muted-foreground">
							Join 10,000+ property managers who have transformed their operations with TenantFlow. 
							Our experts will show you exactly how to reduce costs by 32% and automate 80% of daily tasks.
						</p>
					</div>
				</section>

				{/* Contact Options */}
				<section className="py-12">
					<div className="container max-w-6xl">
						<div className="grid md:grid-cols-3 gap-8">
							{[
								{
									icon: MessageSquare,
									title: 'Free ROI Calculator',
									description: 'See exactly how much TenantFlow can save your properties in 90 days',
									action: 'Get My ROI Report',
									available: 'Instant results in 2 minutes'
								},
								{
									icon: Phone,
									title: 'Expert Consultation',
									description: 'Speak with a property management automation specialist',
									action: 'Schedule Free Call',
									available: 'Available Mon-Fri, 9AM-6PM PST'
								},
								{
									icon: Mail,
									title: 'Custom Demo',
									description: 'See TenantFlow configured for your specific portfolio',
									action: 'Request Demo',
									available: 'Personalized for your properties'
								}
							].map((option, index) => (
								<div
									key={index}
									className="text-center p-8 border rounded-lg hover:shadow-md transition-shadow"
								>
									<option.icon className="w-12 h-12 mx-auto mb-4 text-primary" />
									<h3 className="text-xl font-semibold mb-3">{option.title}</h3>
									<p className="text-muted-foreground mb-4">
										{option.description}
									</p>
									<button className="button-primary mb-2">
										{option.action}
									</button>
									<p className="text-sm text-muted-foreground">
										{option.available}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Contact Form */}
				<section className="py-24 bg-muted/20">
					<div className="container mx-auto px-4 max-w-4xl">
						<div className="text-center mb-12">
							<h2 className="text-3xl font-bold mb-4">Get your custom ROI projection in 24 hours</h2>
							<p className="text-muted-foreground">
								Tell us about your portfolio and we'll show you exactly how much TenantFlow can save you. 
								Most property managers see $2,400+ savings per property within 90 days.
							</p>
						</div>

						<div className="bg-card border rounded-lg p-8">
							<form className="space-y-6">
								<div className="grid md:grid-cols-2 gap-6">
									<div>
										<label className="block text-sm font-medium mb-2">
											First Name
										</label>
										<input
											type="text"
											className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
											placeholder="Enter your first name"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-2">
											Last Name
										</label>
										<input
											type="text"
											className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
											placeholder="Enter your last name"
										/>
									</div>
								</div>

								<div className="grid md:grid-cols-2 gap-6">
									<div>
										<label className="block text-sm font-medium mb-2">
											Email
										</label>
										<input
											type="email"
											className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
											placeholder="Enter your email"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-2">
											Company
										</label>
										<input
											type="text"
											className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
											placeholder="Enter your company name"
										/>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium mb-2">
										How can we help?
									</label>
									<select className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
										<option value="">How many properties do you manage?</option>
										<option value="1-5">1-5 properties (Starter Plan)</option>
										<option value="6-20">6-20 properties (Growth Plan)</option>
										<option value="21-100">21-100 properties (Scale Plan)</option>
										<option value="100+">100+ properties (Enterprise)</option>
										<option value="demo">I want to see a demo first</option>
										<option value="other">Other inquiry</option>
									</select>
								</div>

								<div>
									<label className="block text-sm font-medium mb-2">
										Message
									</label>
									<textarea
										rows={6}
										className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
										placeholder="Tell us more about how we can help you..."
									></textarea>
								</div>

								<div className="text-center">
									<button
										type="submit"
										className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
									>
										Get My Custom ROI Report
									</button>
									<p className="text-sm text-muted-foreground mt-2">
										Free analysis • No commitment required • Results in 24 hours
									</p>
								</div>
							</form>
						</div>
					</div>
				</section>

				{/* Office Info */}
				<section className="py-24">
					<div className="container mx-auto px-4 max-w-6xl">
						<div className="text-center mb-16">
							<h2 className="text-3xl font-bold mb-4">Visit our offices</h2>
							<p className="text-muted-foreground">
								We have offices around the world. Stop by for a coffee and chat
								about property management.
							</p>
						</div>

						<div className="grid md:grid-cols-3 gap-8">
							{[
								{
									city: 'San Francisco',
									address:
										'123 Market Street\nSuite 500\nSan Francisco, CA 94103',
									phone: '+1 (555) 123-4567',
									email: 'sf@tenantflow.com'
								},
								{
									city: 'New York',
									address: '456 Broadway\nFloor 12\nNew York, NY 10013',
									phone: '+1 (555) 987-6543',
									email: 'ny@tenantflow.com'
								},
								{
									city: 'Austin',
									address: '789 Congress Ave\nBuilding A\nAustin, TX 78701',
									phone: '+1 (555) 456-7890',
									email: 'austin@tenantflow.com'
								}
							].map((office, index) => (
								<div key={index} className="text-center p-6 border rounded-lg">
									<h3 className="text-xl font-semibold mb-4">{office.city}</h3>
									<div className="space-y-3 text-muted-foreground">
										<div>
											<p className="font-medium text-foreground mb-1">
												Address
											</p>
											<p className="whitespace-pre-line text-sm">
												{office.address}
											</p>
										</div>
										<div>
											<p className="font-medium text-foreground mb-1">Phone</p>
											<p className="text-sm">{office.phone}</p>
										</div>
										<div>
											<p className="font-medium text-foreground mb-1">Email</p>
											<p className="text-sm">{office.email}</p>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* FAQ Quick Links */}
				<section className="py-16 bg-muted/20">
					<div className="container mx-auto px-4 max-w-4xl text-center">
						<h2 className="text-2xl font-bold mb-4">Need quick answers?</h2>
						<p className="text-muted-foreground mb-8">
							Check out our frequently asked questions or browse our help
							center.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<button className="border border-border px-6 py-2 rounded-lg hover:bg-muted/50 transition-colors">
								View FAQ
							</button>
							<button className="border border-border px-6 py-2 rounded-lg hover:bg-muted/50 transition-colors">
								Help Center
							</button>
						</div>
					</div>
				</section>
			</div>
		</main>
	)
}
