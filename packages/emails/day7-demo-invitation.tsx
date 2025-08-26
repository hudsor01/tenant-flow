import React from 'react'
import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	Preview,
	Section,
	Text
} from '@react-email/components'
import { baseStyles } from './styles/base'

interface Day7DemoInvitationProps {
	recipientName?: string
	demoLink?: string
}

const Day7DemoInvitation: React.FC<Day7DemoInvitationProps> = ({
	recipientName = 'there',
	demoLink = 'https://tenantflow.app/demo'
}) => {
	return (
		<Html>
			<Head />
			<Preview>See TenantFlow in action with a personalized demo</Preview>
			<Body style={baseStyles.body}>
				<Container style={baseStyles.container}>
					<Heading style={baseStyles.heading}>
						Ready for a TenantFlow Demo?
					</Heading>
					
					<Text style={baseStyles.text}>
						Hi {recipientName},
					</Text>
					
					<Text style={baseStyles.text}>
						You've been exploring TenantFlow for a week now, and we'd love to show you how to get the most out of our platform.
					</Text>
					
					<Text style={baseStyles.text}>
						Join us for a personalized 15-minute demo where we'll:
					</Text>
					
					<Section style={baseStyles.section}>
						<Text style={baseStyles.listItem}>
							• Show you advanced features tailored to your property portfolio
						</Text>
						<Text style={baseStyles.listItem}>
							• Answer any questions you have
						</Text>
						<Text style={baseStyles.listItem}>
							• Help you set up automation workflows
						</Text>
						<Text style={baseStyles.listItem}>
							• Demonstrate our reporting capabilities
						</Text>
					</Section>
					
					<Section style={{ textAlign: 'center', margin: '32px 0' }}>
						<Button
							href={demoLink}
							style={baseStyles.button}
						>
							Schedule Your Demo
						</Button>
					</Section>
					
					<Text style={baseStyles.text}>
						Can't make it? No problem! Reply to this email and we'll find a time that works for you.
					</Text>
					
					<Text style={baseStyles.footer}>
						Best regards,
						<br />
						The TenantFlow Team
					</Text>
				</Container>
			</Body>
		</Html>
	)
}

export default Day7DemoInvitation