"use client";

import { Check, Mail } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "#components/ui/button";
import { useFormWithProgress } from "#hooks/use-form-progress";
import { VALIDATION_LIMITS } from "#lib/constants/billing";
import { createLogger } from "#lib/frontend-logger";
import { createClient } from "#lib/supabase/client";
import type { ContactFormRequest } from "#types/domain";
import { ContactFormFields } from "./contact-form-fields";

const logger = createLogger({ component: "ContactForm" });

interface ContactFormProps {
	className?: string;
}

export function ContactForm({ className = "" }: ContactFormProps) {
	const [submitMessage, setSubmitMessage] = useState<string | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Validation function - must be declared before useFormWithProgress
	const validateForm = (data: ContactFormRequest): boolean => {
		const newErrors: Record<string, string> = {};

		// FORM-17: mirror the send-contact-email edge function's length caps
		// client-side so an over-length field surfaces an actionable message
		// instead of a generic, unsatisfiable 400 retry loop. All client caps are
		// <= the server caps, so anything the client accepts the server accepts.
		if (!data.name.trim()) {
			newErrors.name = "Name is required";
		} else if (data.name.trim().length < 2) {
			newErrors.name = "Name must be at least 2 characters";
		} else if (
			data.name.trim().length > VALIDATION_LIMITS.CONTACT_FORM_NAME_MAX_LENGTH
		) {
			newErrors.name = `Name cannot exceed ${VALIDATION_LIMITS.CONTACT_FORM_NAME_MAX_LENGTH} characters`;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!data.email.trim()) {
			newErrors.email = "Email is required";
		} else if (!emailRegex.test(data.email)) {
			newErrors.email = "Please enter a valid email address";
		}

		if (data.phone && data.phone.trim()) {
			const phoneRegex = /^[\d\s()+-]+$/;
			if (!phoneRegex.test(data.phone)) {
				newErrors.phone = "Please enter a valid phone number";
			} else if (
				data.phone.trim().length >
				VALIDATION_LIMITS.CONTACT_FORM_PHONE_MAX_LENGTH
			) {
				newErrors.phone = `Phone number cannot exceed ${VALIDATION_LIMITS.CONTACT_FORM_PHONE_MAX_LENGTH} characters`;
			}
		}

		if (
			data.company &&
			data.company.trim().length >
				VALIDATION_LIMITS.CONTACT_FORM_COMPANY_MAX_LENGTH
		) {
			newErrors.company = `Company name cannot exceed ${VALIDATION_LIMITS.CONTACT_FORM_COMPANY_MAX_LENGTH} characters`;
		}

		if (!data.subject) {
			newErrors.subject = "Please select what you're interested in";
		} else if (
			data.subject.trim().length >
			VALIDATION_LIMITS.CONTACT_FORM_SUBJECT_MAX_LENGTH
		) {
			newErrors.subject = `Subject cannot exceed ${VALIDATION_LIMITS.CONTACT_FORM_SUBJECT_MAX_LENGTH} characters`;
		}

		if (!data.message.trim()) {
			newErrors.message = "Message is required";
		} else if (data.message.trim().length < 10) {
			newErrors.message = "Message must be at least 10 characters";
		} else if (
			data.message.trim().length >
			VALIDATION_LIMITS.CONTACT_FORM_MESSAGE_MAX_LENGTH
		) {
			newErrors.message = `Message cannot exceed ${VALIDATION_LIMITS.CONTACT_FORM_MESSAGE_MAX_LENGTH} characters`;
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const {
		formData,
		updateField,
		handleSubmit: handleFormSubmit,
		isSubmitting,
		submitError,
		isHydrated,
	} = useFormWithProgress<ContactFormRequest>(
		"contact",
		async (data: ContactFormRequest) => {
			if (!validateForm(data)) {
				throw new Error("Please check your input");
			}

			// FORMFIX-02: actually transmit the message via the send-contact-email
			// edge function. The thank-you is gated on a real success below.
			const supabase = createClient();
			const { data: result, error } = await supabase.functions.invoke<{
				success?: boolean;
			}>("send-contact-email", { body: data });

			if (error || result?.success !== true) {
				logger.error("Contact form send failed", {
					action: "contact_form_send_failed",
					metadata: {
						email: data.email,
						subject: data.subject,
						hasError: !!error,
						detail:
							error instanceof Error
								? error.message
								: String(error ?? "send did not report success"),
					},
				});
				// Thrown message becomes submitError (rendered) — thank-you is skipped.
				throw new Error(
					"We couldn't send your message. Please try again, or email us directly at sales@tenantflow.app.",
				);
			}

			logger.info("Contact form submitted", {
				action: "contact_form_submit",
				metadata: { email: data.email, subject: data.subject },
			});

			setSubmitMessage(
				"Thank you for reaching out! We've received your message and will get back to you during US business hours, Monday through Friday.",
			);
		},
		{
			name: "",
			email: "",
			subject: "",
			message: "",
			// Neutral inquiry-type default. The "How did you hear about us?"
			// select is bound to `type`; its options (search/social/referral/
			// sales/conference/other) intentionally don't include "general",
			// so this keeps that trigger in its "Please select" placeholder
			// state instead of pre-selecting "Sales Outreach".
			type: "general",
			company: "",
			phone: "",
		},
	);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setErrors({});

		try {
			await handleFormSubmit(formData);
		} catch (error) {
			logger.error("Form submission error", {
				action: "contact_form_submit_failed",
				metadata: {
					hasName: !!formData.name,
					hasEmail: !!formData.email,
					hasSubject: !!formData.subject,
					error: error instanceof Error ? error.message : String(error),
				},
			});
		}
	};

	const handleInputChange = (
		field: keyof ContactFormRequest,
		value: string,
	) => {
		updateField(field, value);
	};

	if (submitMessage) {
		return (
			<section
				className={`min-h-screen flex-center bg-background ${className}`}
				id="contact-form"
			>
				<div className="max-w-md w-full p-8">
					<div className="p-8 bg-card rounded-2xl border border-border shadow-lg">
						<div className="size-16 rounded-full bg-primary/10 flex-center mx-auto mb-4">
							<Check className="size-8 text-primary" />
						</div>
						<h2 className="typography-h3 text-foreground text-center mb-4">
							Thank You!
						</h2>
						<p className="text-muted-foreground text-center mb-6">
							{submitMessage}
						</p>
						<Button
							onClick={() => setSubmitMessage(null)}
							variant="outline"
							className="w-full"
						>
							Send Another Message
						</Button>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section
			className={`relative min-h-screen lg:flex bg-background ${className}`}
			id="contact-form"
		>
			{/* Left side - Contact Info with Image Background */}
			<div className="relative flex flex-col justify-center w-full p-8 lg:w-1/2 lg:px-12 xl:px-32 overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
				<div className="absolute inset-0 bg-linear-to-br from-background/30 via-transparent to-background/20" />

				<div className="relative z-10 p-8 rounded-2xl backdrop-blur-lg bg-background/60 dark:bg-card/60 border border-border/20 shadow-2xl">
					<h1 className="typography-h2 text-foreground lg:text-4xl">
						Let&apos;s talk about your properties
					</h1>
					<p className="mt-4 text-muted-foreground text-lg">
						Whether you manage 5 or 500 units, we&apos;re here to help
						streamline your operations and save you time every day.
					</p>

					<div className="mt-8 space-y-6">
						<div className="flex items-start">
							<div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm">
								<Mail className="size-6 text-primary" />
							</div>
							<div className="ml-3">
								<p className="text-foreground font-semibold">Email Us</p>
								<p className="text-muted-foreground">sales@tenantflow.app</p>
								<p className="text-muted-foreground text-sm">
									US business hours, Monday through Friday
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Right side - Contact Form */}
			<div className="flex flex-col justify-center w-full p-8 lg:w-1/2 lg:px-16 xl:px-24 bg-background border-l border-border">
				<div className="max-w-xl mx-auto w-full">
					<h2 className="typography-h3 text-foreground mb-2">Get in Touch</h2>
					<p className="text-muted-foreground mb-8">
						Have questions about TenantFlow? Want to see a demo? We&apos;d love
						to hear from you. Our team responds during US business hours, Monday
						through Friday.
					</p>

					{!isHydrated && (
						<div className="mb-4 p-3 bg-muted rounded-md">
							<p className="text-muted-foreground">
								Restoring your progress...
							</p>
						</div>
					)}

					{submitError && (
						<div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
							<p className="text-sm text-destructive-text">{submitError}</p>
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-6">
						<ContactFormFields
							formData={formData}
							errors={errors}
							onInputChange={handleInputChange}
						/>

						<Button
							type="submit"
							disabled={isSubmitting}
							size="lg"
							className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
						>
							{isSubmitting ? "Sending..." : "Send Message"}
						</Button>

						<p className="text-center text-muted-foreground">
							We respond during US business hours, Monday through Friday.
						</p>
					</form>
				</div>
			</div>
		</section>
	);
}
