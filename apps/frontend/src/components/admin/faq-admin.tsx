'use client'

import { Button } from '#components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Badge } from '#components/ui/badge'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'

interface FAQCategory {
	id: string
	name: string
	slug: string
	description?: string
	displayOrder: number
	isActive: boolean
	questionCount: number
}

interface FAQAdminProps {
	categories: FAQCategory[]
}

export default function FAQAdmin({ categories }: FAQAdminProps) {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">FAQ Management</h1>
					<p className="text-muted-foreground">
						Manage your frequently asked questions and help content
					</p>
				</div>
				<Button disabled title="Add category functionality coming soon">
					<Plus className="size-4 mr-2" />
					Add Category
				</Button>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{categories.map(category => (
					<Card key={category.id} className="relative">
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<CardTitle className="text-lg">{category.name}</CardTitle>
								<Badge variant={category.isActive ? 'default' : 'secondary'}>
									{category.isActive ? 'Active' : 'Inactive'}
								</Badge>
							</div>
							{category.description && (
								<p className="text-sm text-muted-foreground">
									{category.description}
								</p>
							)}
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
								<span>{category.questionCount} questions</span>
								<span>Order: {category.displayOrder}</span>
							</div>

							<div className="flex gap-2">
								<Button variant="outline" size="sm" asChild>
									<Link href={`/admin/faq/${category.id}`}>
										<Eye className="size-4 mr-1" />
										View
									</Link>
								</Button>
								<Button variant="outline" size="sm" disabled title="Edit functionality coming soon">
									<Edit className="size-4 mr-1" />
									Edit
								</Button>
								<Button
									variant="outline"
									size="sm"
									className="text-destructive"
									disabled
									title="Delete functionality coming soon"
								>
									<Trash2 className="size-4" />
								</Button>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{categories.length === 0 && (
				<div className="text-center py-12">
					<div className="text-muted-foreground mb-4">
						<Plus className="size-12 mx-auto mb-4 opacity-50" />
						<h3 className="text-lg font-medium mb-2">No FAQ categories yet</h3>
						<p>Create your first FAQ category to get started</p>
					</div>
					<Button disabled title="Add category functionality coming soon">
						<Plus className="size-4 mr-2" />
						Create First Category
					</Button>
				</div>
			)}
		</div>
	)
}
