'use client'

import { toast } from 'sonner'
import { createLogger } from '@repo/shared'

import { Button } from '@/components/ui/button'

const logger = createLogger({ component: 'SonnerDemo' })

export function SonnerDemo() {
	return (
		<Button
			variant="outline"
			onClick={() =>
				toast('Event has been created', {
					description: 'Sunday, December 03, 2023 at 9:00 AM',
					action: {
						label: 'Undo',
						onClick: () => logger.info('Toast undo action triggered', {
							action: 'toast_undo_clicked'
						})
					}
				})
			}
		>
			Show Toast
		</Button>
	)
}
