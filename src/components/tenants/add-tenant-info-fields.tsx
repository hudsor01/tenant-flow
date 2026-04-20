'use client'

import { Field, FieldError, FieldLabel } from '#components/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '#components/ui/input-group'
import {
	addTenantSchema
} from '#lib/validation/tenants'
import { Mail, Phone, User } from 'lucide-react'
import type { ChangeEvent } from 'react'
import type { AddTenantFormApi } from './add-tenant-form-types'

interface AddTenantInfoFieldsProps {
	form: AddTenantFormApi
}

export function AddTenantInfoFields({ form }: AddTenantInfoFieldsProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2 typography-large">
				<User className="size-5" />
				Tenant Information
			</div>

			<div className="grid grid-cols-2 gap-4">
				<form.Field
					name="first_name"
					validators={{
						onChange: addTenantSchema.shape.first_name
					}}
				>
					{field => (
						<Field>
							<FieldLabel htmlFor="first_name">First Name</FieldLabel>
							<InputGroup>
								<InputGroupAddon align="inline-start">
									<User className="size-4" />
								</InputGroupAddon>
								<InputGroupInput
									id="first_name"
									value={field.state.value}
									onChange={(e: ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
									placeholder="John"
								/>
							</InputGroup>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>

				<form.Field
					name="last_name"
					validators={{
						onChange: addTenantSchema.shape.last_name
					}}
				>
					{field => (
						<Field>
							<FieldLabel htmlFor="last_name">Last Name</FieldLabel>
							<InputGroup>
								<InputGroupAddon align="inline-start">
									<User className="size-4" />
								</InputGroupAddon>
								<InputGroupInput
									id="last_name"
									value={field.state.value}
									onChange={(e: ChangeEvent<HTMLInputElement>) =>
										field.handleChange(e.target.value)
									}
									onBlur={field.handleBlur}
									placeholder="Smith"
								/>
							</InputGroup>
							<FieldError errors={field.state.meta.errors} />
						</Field>
					)}
				</form.Field>
			</div>

			<form.Field
				name="email"
				validators={{
					onChange: addTenantSchema.shape.email
				}}
			>
				{field => (
					<Field>
						<FieldLabel htmlFor="email">Email Address</FieldLabel>
						<InputGroup>
							<InputGroupAddon align="inline-start">
								<Mail className="size-4" />
							</InputGroupAddon>
							<InputGroupInput
								id="email"
								type="email"
								autoFocus
								value={field.state.value}
								onChange={(e: ChangeEvent<HTMLInputElement>) =>
									field.handleChange(e.target.value)
								}
								onBlur={field.handleBlur}
								placeholder="john.smith@example.com"
							/>
						</InputGroup>
						<p className="text-muted-foreground">
							Used for lease records and payment receipts
						</p>
						<FieldError errors={field.state.meta.errors} />
					</Field>
				)}
			</form.Field>

			<form.Field name="phone">
				{field => (
					<Field>
						<FieldLabel htmlFor="phone">Phone Number (Optional)</FieldLabel>
						<InputGroup>
							<InputGroupAddon align="inline-start">
								<Phone className="size-4" />
							</InputGroupAddon>
							<InputGroupInput
								id="phone"
								type="tel"
								value={field.state.value}
								onChange={(e: ChangeEvent<HTMLInputElement>) =>
									field.handleChange(e.target.value)
								}
								onBlur={field.handleBlur}
								placeholder="(555) 123-4567"
							/>
						</InputGroup>
						<FieldError errors={field.state.meta.errors} />
					</Field>
				)}
			</form.Field>
		</div>
	)
}
