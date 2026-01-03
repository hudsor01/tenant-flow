'use client'

import { useMemo } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { Input } from '#components/ui/input'
import { Textarea } from '#components/ui/textarea'
import { Label } from '#components/ui/label'
import { Checkbox } from '#components/ui/checkbox'
import { Button } from '#components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Plus, Trash2 } from 'lucide-react'

export type ListItemField = {
	key: string
	label: string
	type: 'text' | 'email' | 'tel' | 'number' | 'checkbox'
	placeholder?: string
}

export type DynamicField = {
	name: string
	label: string
	type:
		| 'text'
		| 'email'
		| 'tel'
		| 'date'
		| 'textarea'
		| 'select'
		| 'checkbox'
		| 'number'
		| 'list'
	placeholder?: string
	description?: string
	options?: Array<{ value: string; label: string }>
	section?: string
	fullWidth?: boolean
	rows?: number
	itemFields?: ListItemField[]
	addLabel?: string
	itemLabel?: string
}

interface FieldRenderProps {
	state: { value: unknown }
	handleChange: (value: unknown) => void
	handleBlur: () => void
}

interface DynamicFormProps {
	form: unknown
	fields: DynamicField[]
}

export function DynamicForm({ form, fields }: DynamicFormProps) {
	const formApi = form as {
		Field: ComponentType<{
			name: string
			children: (fieldApi: FieldRenderProps) => ReactNode
		}>
	}
	const sections = useMemo(() => {
		const map = new Map<string, DynamicField[]>()
		fields.forEach(field => {
			const section = field.section ?? 'Details'
			const current = map.get(section) ?? []
			current.push(field)
			map.set(section, current)
		})
		return Array.from(map.entries())
	}, [fields])

	return (
		<div className="space-y-6">
			{sections.map(([section, sectionFields]) => (
				<div key={section} className="space-y-4">
					<h3 className="text-sm font-semibold text-muted-foreground">
						{section}
					</h3>
					<div className="grid gap-4 sm:grid-cols-2">
						{sectionFields.map(field => (
							<formApi.Field key={field.name} name={field.name}>
								{fieldApi => {
									const value = fieldApi.state.value
									const isFullWidth = field.fullWidth || field.type === 'textarea'
									const listValue = Array.isArray(value) ? value : []

									const createEmptyItem = () => {
										const fields = field.itemFields ?? []
										return fields.reduce<Record<string, unknown>>((acc, item) => {
											acc[item.key] = item.type === 'checkbox' ? false : ''
											return acc
										}, {})
									}

									return (
										<div
											className={
												isFullWidth ? 'sm:col-span-2' : undefined
											}
										>
											<div className="space-y-2">
												{field.type !== 'checkbox' && field.type !== 'list' ? (
													<Label htmlFor={field.name}>{field.label}</Label>
												) : null}
												{field.type === 'list' ? (
													<div className="space-y-3">
														<Label>{field.label}</Label>
														{listValue.length === 0 ? (
															<p className="text-sm text-muted-foreground">
																No items yet. Add one to start.
															</p>
														) : null}
														{listValue.map(
															(item: Record<string, unknown>, index: number) => (
																<div
																	key={`${field.name}-${index}`}
																	className="space-y-3 rounded border p-3"
																>
																	<div className="flex items-center justify-between">
																		<p className="text-sm font-medium">
																			{field.itemLabel ?? `Item ${index + 1}`}
																		</p>
																		<Button
																			type="button"
																			variant="ghost"
																			size="sm"
																			onClick={() => {
																				const next = listValue.filter(
																					(_, idx: number) => idx !== index
																				)
																				fieldApi.handleChange(next)
																			}}
																		>
																			<Trash2 className="size-4" />
																		</Button>
																	</div>
																	<div className="grid gap-3 sm:grid-cols-2">
																		{field.itemFields?.map(itemField => {
																			const itemValue = item?.[itemField.key]
																			const updateItem = (nextValue: unknown) => {
																				const next = listValue.map(
																					(current: Record<string, unknown>, idx: number) =>
																							idx === index
																								? { ...current, [itemField.key]: nextValue }
																								: current
																				)
																				fieldApi.handleChange(next)
																			}

																			return itemField.type === 'checkbox' ? (
																				<div
																					key={itemField.key}
																					className="flex items-center gap-2"
																				>
																					<Checkbox
																						checked={Boolean(itemValue)}
																						onCheckedChange={checked =>
																							updateItem(Boolean(checked))
																						}
																					/>
																					<span className="text-sm">{itemField.label}</span>
																				</div>
																			) : (
																				<div key={itemField.key} className="space-y-1">
																					<Label className="text-xs text-muted-foreground">
																						{itemField.label}
																					</Label>
																					<Input
																						type={itemField.type}
																						value={(itemValue as string) ?? ''}
																						onChange={event => updateItem(event.target.value)}
																						placeholder={itemField.placeholder}
																					/>
																				</div>
																			)
																		})}
																	</div>
																</div>
															)
														)}
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={() => {
																const next = [...listValue, createEmptyItem()]
																fieldApi.handleChange(next)
															}}
														>
															<Plus className="mr-2 size-4" />
															{field.addLabel ?? 'Add item'}
														</Button>
													</div>
												) : field.type === 'textarea' ? (
													<Textarea
														id={field.name}
														value={String(value ?? '')}
														onChange={event =>
															fieldApi.handleChange(event.target.value)
														}
														onBlur={fieldApi.handleBlur}
														rows={field.rows ?? 4}
														placeholder={field.placeholder}
													/>
												) : field.type === 'select' ? (
													<Select
														value={String(value ?? '')}
														onValueChange={fieldApi.handleChange}
													>
														<SelectTrigger id={field.name}>
															<SelectValue placeholder={field.placeholder} />
														</SelectTrigger>
														<SelectContent>
															{field.options?.map(option => (
																<SelectItem
																	key={option.value}
																	value={option.value}
																>
																	{option.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												) : field.type === 'checkbox' ? (
													<div className="flex items-start gap-3 rounded border p-3">
														<Checkbox
															id={field.name}
															checked={Boolean(value)}
															onCheckedChange={checked =>
																fieldApi.handleChange(Boolean(checked))
															}
														/>
														<div>
															<p className="text-sm font-medium">{field.label}</p>
															{field.description ? (
																<p className="text-sm text-muted-foreground">
																	{field.description}
																</p>
															) : null}
														</div>
													</div>
												) : (
													<Input
														id={field.name}
														type={field.type}
														value={String(value ?? '')}
														onChange={event =>
															fieldApi.handleChange(event.target.value)
														}
														onBlur={fieldApi.handleBlur}
														placeholder={field.placeholder}
													/>
												)}
												{field.description && field.type !== 'checkbox' ? (
													<p className="text-sm text-muted-foreground">
														{field.description}
													</p>
												) : null}
											</div>
										</div>
									)
								}}
							</formApi.Field>
						))}
					</div>
				</div>
			))}
		</div>
	)
}
