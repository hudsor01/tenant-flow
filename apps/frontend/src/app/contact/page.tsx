import Footer from '@/components/layout/footer'
import { Navbar } from '@/components/layout/navbar'
import { ContactForm } from '@/components/marketing/contact-form'

export default function ContactPage() {
	return (
		<main className="min-h-screen bg-background">
			<Navbar />
			<ContactForm />
			<Footer />
		</main>
	)
}
