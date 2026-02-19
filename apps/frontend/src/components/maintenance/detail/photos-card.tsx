'use client'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Image as ImageIcon } from 'lucide-react'

export function PhotosCard() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Photos</CardTitle>
				<CardDescription>Photo documentation for this request</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="text-center py-8 text-muted-foreground">
					<ImageIcon className="size-8 mx-auto mb-2 opacity-50" />
					<p>Photo upload is not yet available</p>
				</div>
			</CardContent>
		</Card>
	)
}
