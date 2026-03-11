import { Field, FieldError, FieldLabel } from '#components/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '#components/ui/input-group'
import { Building2, Lock, Mail, User } from 'lucide-react'

interface StringFieldApi {
	state: { value: string; meta: { errors?: unknown[] } }
	handleChange: (v: string) => void
	handleBlur: () => void
}

interface SubscribeFormFieldsProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Form's generic signature is too complex for extracted components
	form: { Field: React.ComponentType<any> }
	isSubmitting: boolean
}

export function SubscribeFormFields({ form, isSubmitting }: SubscribeFormFieldsProps) {
	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<form.Field name="first_name">
					{(field: StringFieldApi) => (
						<Field>
							<FieldLabel htmlFor="first_name">First name</FieldLabel>
							<InputGroup>
								<InputGroupAddon align="inline-start"><User /></InputGroupAddon>
								<InputGroupInput
									id="first_name"
									placeholder="Jamie"
									value={field.state.value}
									onChange={event => field.handleChange(event.target.value)}
									onBlur={field.handleBlur}
									disabled={isSubmitting}
								/>
							</InputGroup>
							<FieldError>{String(field.state.meta.errors?.[0] ?? '')}</FieldError>
						</Field>
					)}
				</form.Field>
				<form.Field name="last_name">
					{(field: StringFieldApi) => (
						<Field>
							<FieldLabel htmlFor="last_name">Last name</FieldLabel>
							<InputGroup>
								<InputGroupAddon align="inline-start"><User /></InputGroupAddon>
								<InputGroupInput
									id="last_name"
									placeholder="Rivera"
									value={field.state.value}
									onChange={event => field.handleChange(event.target.value)}
									onBlur={field.handleBlur}
									disabled={isSubmitting}
								/>
							</InputGroup>
							<FieldError>{String(field.state.meta.errors?.[0] ?? '')}</FieldError>
						</Field>
					)}
				</form.Field>
			</div>
			<form.Field name="company">
				{(field: StringFieldApi) => (
					<Field>
						<FieldLabel htmlFor="company">Company</FieldLabel>
						<InputGroup>
							<InputGroupAddon align="inline-start"><Building2 /></InputGroupAddon>
							<InputGroupInput
								id="company"
								placeholder="Rivera Property Group"
								value={field.state.value}
								onChange={event => field.handleChange(event.target.value)}
								onBlur={field.handleBlur}
								disabled={isSubmitting}
							/>
						</InputGroup>
						<FieldError>{String(field.state.meta.errors?.[0] ?? '')}</FieldError>
					</Field>
				)}
			</form.Field>
			<form.Field name="email">
				{(field: StringFieldApi) => (
					<Field>
						<FieldLabel htmlFor="email">Work email</FieldLabel>
						<InputGroup>
							<InputGroupAddon align="inline-start"><Mail /></InputGroupAddon>
							<InputGroupInput
								id="email"
								type="email"
								placeholder="jamie@riverapm.com"
								value={field.state.value}
								onChange={event => field.handleChange(event.target.value)}
								onBlur={field.handleBlur}
								disabled={isSubmitting}
							/>
						</InputGroup>
						<FieldError>{String(field.state.meta.errors?.[0] ?? '')}</FieldError>
					</Field>
				)}
			</form.Field>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<form.Field name="password">
					{(field: StringFieldApi) => (
						<Field>
							<FieldLabel htmlFor="password">Password</FieldLabel>
							<InputGroup>
								<InputGroupAddon align="inline-start"><Lock /></InputGroupAddon>
								<InputGroupInput
									id="password"
									type="password"
									placeholder="Create a password"
									autoComplete="new-password"
									value={field.state.value}
									onChange={event => field.handleChange(event.target.value)}
									onBlur={field.handleBlur}
									disabled={isSubmitting}
								/>
							</InputGroup>
							<FieldError>{String(field.state.meta.errors?.[0] ?? '')}</FieldError>
						</Field>
					)}
				</form.Field>
				<form.Field name="confirmPassword">
					{(field: StringFieldApi) => (
						<Field>
							<FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
							<InputGroup>
								<InputGroupAddon align="inline-start"><Lock /></InputGroupAddon>
								<InputGroupInput
									id="confirmPassword"
									type="password"
									placeholder="Repeat password"
									autoComplete="new-password"
									value={field.state.value}
									onChange={event => field.handleChange(event.target.value)}
									onBlur={field.handleBlur}
									disabled={isSubmitting}
								/>
							</InputGroup>
							<FieldError>{String(field.state.meta.errors?.[0] ?? '')}</FieldError>
						</Field>
					)}
				</form.Field>
			</div>
		</>
	)
}
