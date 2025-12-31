'use client'

import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import type { ClauseItem } from './template-types'

interface ClausesEditorProps {
	clauses: ClauseItem[]
	onChange: (clauses: ClauseItem[]) => void
}

export function ClausesEditor({ clauses, onChange }: ClausesEditorProps) {
	const handleAdd = () => {
		const next = [...clauses, { id: crypto.randomUUID(), text: '' }]
		onChange(next)
	}

	const handleUpdate = (index: number, value: string) => {
		const next = clauses.map((clause, idx) =>
			idx === index ? { ...clause, text: value } : clause
		)
		onChange(next)
	}

	const handleRemove = (index: number) => {
		onChange(clauses.filter((_, idx) => idx !== index))
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>State-specific clauses</CardTitle>
				<Button type="button" variant="outline" size="sm" onClick={handleAdd}>
					<Plus className="mr-2 size-4" />
					Add clause
				</Button>
			</CardHeader>
			<CardContent className="space-y-4">
				{clauses.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						Add compliance clauses tailored to your jurisdiction.
					</p>
				) : null}
				{clauses.map((clause, index) => (
					<div key={clause.id} className="space-y-2">
						<div className="flex items-center justify-between">
							<Label>Clause {index + 1}</Label>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => handleRemove(index)}
							>
								<Trash2 className="size-4" />
							</Button>
						</div>
						<Input
							value={clause.text}
							onChange={event => handleUpdate(index, event.target.value)}
							placeholder="Example: State-required disclosure text"
						/>
					</div>
				))}
			</CardContent>
		</Card>
	)
}
