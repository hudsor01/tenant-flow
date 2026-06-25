import { Lock, Mail, User } from "lucide-react";
import { Field, FieldError, FieldLabel } from "#components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#components/ui/input-group";
import type { SubscribeFormApi } from "./owner-subscribe-form-types";

interface SubscribeFormFieldsProps {
	form: SubscribeFormApi;
	isSubmitting: boolean;
}

export function SubscribeFormFields({
	form,
	isSubmitting,
}: SubscribeFormFieldsProps) {
	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<form.Field name="first_name">
					{(field) => (
						<Field>
							<FieldLabel htmlFor="first_name">First name</FieldLabel>
							<InputGroup>
								<InputGroupAddon align="inline-start">
									<User />
								</InputGroupAddon>
								<InputGroupInput
									id="first_name"
									placeholder="Jamie"
									value={field.state.value}
									onChange={(event) => field.handleChange(event.target.value)}
									onBlur={field.handleBlur}
									disabled={isSubmitting}
								/>
							</InputGroup>
							<FieldError>
								{String(field.state.meta.errors?.[0] ?? "")}
							</FieldError>
						</Field>
					)}
				</form.Field>
				<form.Field name="last_name">
					{(field) => (
						<Field>
							<FieldLabel htmlFor="last_name">Last name</FieldLabel>
							<InputGroup>
								<InputGroupAddon align="inline-start">
									<User />
								</InputGroupAddon>
								<InputGroupInput
									id="last_name"
									placeholder="Rivera"
									value={field.state.value}
									onChange={(event) => field.handleChange(event.target.value)}
									onBlur={field.handleBlur}
									disabled={isSubmitting}
								/>
							</InputGroup>
							<FieldError>
								{String(field.state.meta.errors?.[0] ?? "")}
							</FieldError>
						</Field>
					)}
				</form.Field>
			</div>
			<form.Field name="email">
				{(field) => (
					<Field>
						<FieldLabel htmlFor="email">Work email</FieldLabel>
						<InputGroup>
							<InputGroupAddon align="inline-start">
								<Mail />
							</InputGroupAddon>
							<InputGroupInput
								id="email"
								type="email"
								placeholder="jamie@riverapm.com"
								value={field.state.value}
								onChange={(event) => field.handleChange(event.target.value)}
								onBlur={field.handleBlur}
								disabled={isSubmitting}
							/>
						</InputGroup>
						<FieldError>
							{String(field.state.meta.errors?.[0] ?? "")}
						</FieldError>
					</Field>
				)}
			</form.Field>
			<form.Field name="password">
				{(field) => (
					<Field>
						<FieldLabel htmlFor="password">Password</FieldLabel>
						<InputGroup>
							<InputGroupAddon align="inline-start">
								<Lock />
							</InputGroupAddon>
							<InputGroupInput
								id="password"
								type="password"
								placeholder="Create a password"
								autoComplete="new-password"
								value={field.state.value}
								onChange={(event) => field.handleChange(event.target.value)}
								onBlur={field.handleBlur}
								disabled={isSubmitting}
							/>
						</InputGroup>
						<FieldError>
							{String(field.state.meta.errors?.[0] ?? "")}
						</FieldError>
					</Field>
				)}
			</form.Field>
		</>
	);
}
