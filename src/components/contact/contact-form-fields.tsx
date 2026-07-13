import { Mail, Phone } from "lucide-react";
import type { ChangeEvent } from "react";
import { Field, FieldError, FieldLabel } from "#components/ui/field";
import { Input } from "#components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#components/ui/input-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import { Textarea } from "#components/ui/textarea";
import { VALIDATION_LIMITS } from "#lib/constants/billing";
import type { ContactFormRequest } from "#types/domain";

interface ContactFormFieldsProps {
	formData: ContactFormRequest;
	errors: Record<string, string>;
	onInputChange: (field: keyof ContactFormRequest, value: string) => void;
}

export function ContactFormFields({
	formData,
	errors,
	onInputChange,
}: ContactFormFieldsProps) {
	return (
		<>
			<div className="grid md:grid-cols-2 gap-4">
				<Field>
					<FieldLabel htmlFor="name">Full Name *</FieldLabel>
					<InputGroup>
						<InputGroupAddon align="inline-start">
							<Mail className="size-4" />
						</InputGroupAddon>
						<InputGroupInput
							id="name"
							name="name"
							type="text"
							autoComplete="name"
							maxLength={VALIDATION_LIMITS.CONTACT_FORM_NAME_MAX_LENGTH}
							value={formData.name}
							onChange={(e: ChangeEvent<HTMLInputElement>) =>
								onInputChange("name", e.target.value)
							}
							placeholder="John Smith"
							required
							className={errors.name ? "border-destructive" : ""}
						/>
					</InputGroup>
					{errors.name && <FieldError>{errors.name}</FieldError>}
				</Field>

				<Field>
					<FieldLabel htmlFor="email">Email Address *</FieldLabel>
					<InputGroup>
						<InputGroupAddon align="inline-start">
							<Mail className="size-4" />
						</InputGroupAddon>
						<InputGroupInput
							id="email"
							name="email"
							type="email"
							autoComplete="email"
							value={formData.email}
							onChange={(e: ChangeEvent<HTMLInputElement>) =>
								onInputChange("email", e.target.value)
							}
							placeholder="john@propertyco.com"
							required
							className={errors.email ? "border-destructive" : ""}
						/>
					</InputGroup>
					{errors.email && <FieldError>{errors.email}</FieldError>}
				</Field>
			</div>

			<div className="grid md:grid-cols-2 gap-4">
				<Field>
					<FieldLabel htmlFor="company">Company Name</FieldLabel>
					<Input
						id="company"
						name="organization"
						type="text"
						autoComplete="organization"
						maxLength={VALIDATION_LIMITS.CONTACT_FORM_COMPANY_MAX_LENGTH}
						value={formData.company || ""}
						onChange={(e: ChangeEvent<HTMLInputElement>) =>
							onInputChange("company", e.target.value)
						}
						placeholder="Property Management Co"
						className={errors.company ? "border-destructive" : ""}
					/>
					{errors.company && <FieldError>{errors.company}</FieldError>}
				</Field>

				<Field>
					<FieldLabel htmlFor="phone">Phone Number</FieldLabel>
					<InputGroup>
						<InputGroupAddon align="inline-start">
							<Phone className="size-4" />
						</InputGroupAddon>
						<InputGroupInput
							id="phone"
							name="tel"
							type="tel"
							autoComplete="tel"
							maxLength={VALIDATION_LIMITS.CONTACT_FORM_PHONE_MAX_LENGTH}
							value={formData.phone || ""}
							onChange={(e: ChangeEvent<HTMLInputElement>) =>
								onInputChange("phone", e.target.value)
							}
							placeholder="+1 (555) 123-4567"
							className={errors.phone ? "border-destructive" : ""}
						/>
					</InputGroup>
					{errors.phone && <FieldError>{errors.phone}</FieldError>}
				</Field>
			</div>

			<Field>
				<FieldLabel htmlFor="subject">I&apos;m interested in... *</FieldLabel>
				<Select
					name="subject"
					value={formData.subject}
					onValueChange={(value: string) => onInputChange("subject", value)}
					required
				>
					<SelectTrigger
						id="subject"
						className={errors.subject ? "border-destructive" : ""}
					>
						<SelectValue placeholder="What brings you to TenantFlow?" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="Product Demo">
							Scheduling a product demo
						</SelectItem>
						<SelectItem value="Pricing Information">
							Learning about pricing plans
						</SelectItem>
						<SelectItem value="Technical Support">
							Getting technical support
						</SelectItem>
						<SelectItem value="Partnership">
							Partnership opportunities
						</SelectItem>
						<SelectItem value="General Question">
							General questions about TenantFlow
						</SelectItem>
					</SelectContent>
				</Select>
				{errors.subject && <FieldError>{errors.subject}</FieldError>}
			</Field>

			<Field>
				<FieldLabel htmlFor="type">How did you hear about us?</FieldLabel>
				<Select
					name="referralSource"
					value={formData.type}
					onValueChange={(value: string) => onInputChange("type", value)}
				>
					<SelectTrigger id="type">
						<SelectValue placeholder="Please select" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="search">Google Search</SelectItem>
						<SelectItem value="social">Social Media</SelectItem>
						<SelectItem value="referral">Referral</SelectItem>
						<SelectItem value="sales">Sales Outreach</SelectItem>
						<SelectItem value="conference">Conference/Event</SelectItem>
						<SelectItem value="other">Other</SelectItem>
					</SelectContent>
				</Select>
			</Field>

			<Field>
				<FieldLabel htmlFor="message">How can we help? *</FieldLabel>
				<Textarea
					id="message"
					name="message"
					autoComplete="off"
					maxLength={VALIDATION_LIMITS.CONTACT_FORM_MESSAGE_MAX_LENGTH}
					value={formData.message}
					onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
						onInputChange("message", e.target.value)
					}
					placeholder="Tell us about your property portfolio, current challenges, or any specific questions you have about TenantFlow..."
					required
					rows={5}
					className={`resize-none ${errors.message ? "border-destructive" : ""}`}
				/>
				{errors.message && <FieldError>{errors.message}</FieldError>}
			</Field>
		</>
	);
}
