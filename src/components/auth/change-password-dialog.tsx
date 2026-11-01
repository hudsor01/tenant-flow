"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import type { FormEvent } from "react";
import { useId, useState } from "react";
import { Button } from "#components/ui/button";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#components/ui/dialog";
import { Field, FieldLabel } from "#components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#components/ui/input-group";
import { useChangePasswordMutation } from "#hooks/api/use-auth-mutations";
import { VALIDATION_LIMITS } from "#lib/constants/billing";
import { logger } from "#lib/frontend-logger";
import { PASSWORD_COMPLEXITY_RE } from "#lib/validation/auth";

interface ChangePasswordDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({
	open,
	onOpenChange,
}: ChangePasswordDialogProps) {
	const changePassword = useChangePasswordMutation();

	const currentPasswordId = useId();
	const newPasswordId = useId();
	const confirmPasswordId = useId();

	const [formData, setFormData] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const [showPasswords, setShowPasswords] = useState({
		current: false,
		new: false,
		confirm: false,
	});

	const [validationErrors, setValidationErrors] = useState<string[]>([]);

	const handleChange = (field: keyof typeof formData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		// Clear validation errors when user types
		setValidationErrors([]);
	};

	const validatePassword = (password: string): string[] => {
		// Single source of truth: PASSWORD_COMPLEXITY_RE in
		// #lib/validation/auth (used by signup + settings password-section
		// + reset-password flow). Cycle-2 review caught three different
		// rules across these surfaces; this dialog now uses the shared one.
		const errors: string[] = [];

		if (password.length < VALIDATION_LIMITS.PASSWORD_MIN_LENGTH) {
			errors.push(
				`Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} characters long`,
			);
		}

		if (!/[A-Z]/.test(password)) {
			errors.push("Password must contain at least one uppercase letter");
		}

		if (!/[a-z]/.test(password)) {
			errors.push("Password must contain at least one lowercase letter");
		}

		if (!/[0-9]/.test(password)) {
			errors.push("Password must contain at least one number");
		}

		if (!/[^A-Za-z0-9]/.test(password)) {
			errors.push("Password must contain at least one special character");
		}

		// Defense in depth: the four individual checks above are kept so the
		// user gets specific per-rule messages. The shared regex also fires
		// here so any future tightening (e.g. min length bump) propagates.
		if (
			password.length >= VALIDATION_LIMITS.PASSWORD_MIN_LENGTH &&
			!PASSWORD_COMPLEXITY_RE.test(password)
		) {
			errors.push("Password does not meet complexity requirements");
		}

		return errors;
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		// Validation
		const errors: string[] = [];

		if (!formData.currentPassword) {
			errors.push("Current password is required");
		}

		if (!formData.newPassword) {
			errors.push("New password is required");
		} else {
			errors.push(...validatePassword(formData.newPassword));
		}

		if (formData.newPassword !== formData.confirmPassword) {
			errors.push("New passwords do not match");
		}

		if (formData.currentPassword === formData.newPassword) {
			errors.push("New password must be different from current password");
		}

		if (errors.length > 0) {
			setValidationErrors(errors);
			return;
		}

		try {
			await changePassword.mutateAsync({
				currentPassword: formData.currentPassword,
				newPassword: formData.newPassword,
			});

			// Success - reset form and close dialog
			setFormData({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});
			setValidationErrors([]);
			onOpenChange(false);
		} catch (error) {
			logger.error("Failed to change password", {
				action: "change_password",
				metadata: {
					error: error instanceof Error ? error.message : "Unknown error",
				},
			});
			// Error toast is handled by mutation hook
		}
	};

	const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
		setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
	};

	const handleCancel = () => {
		setFormData({
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		});
		setValidationErrors([]);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-125" intent="edit">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Lock className="size-5" />
						Change Password
					</DialogTitle>
					<DialogDescription>
						Enter your current password and choose a new secure password
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-6">
					<DialogBody>
						{/* Current Password */}
						<Field>
							<FieldLabel htmlFor={currentPasswordId}>
								Current Password *
							</FieldLabel>
							<InputGroup>
								<InputGroupInput
									id={currentPasswordId}
									type={showPasswords.current ? "text" : "password"}
									value={formData.currentPassword}
									onChange={(e) =>
										handleChange("currentPassword", e.target.value)
									}
									disabled={changePassword.isPending}
									required
									autoComplete="current-password"
								/>
								<InputGroupAddon align="inline-end">
									<button
										type="button"
										onClick={() => togglePasswordVisibility("current")}
										className="text-muted-foreground hover:text-foreground transition-colors"
										disabled={changePassword.isPending}
										aria-label={
											showPasswords.current
												? "Hide current password"
												: "Show current password"
										}
									>
										{showPasswords.current ? (
											<EyeOff className="size-4" />
										) : (
											<Eye className="size-4" />
										)}
									</button>
								</InputGroupAddon>
							</InputGroup>
						</Field>

						{/* New Password */}
						<Field>
							<FieldLabel htmlFor={newPasswordId}>New Password *</FieldLabel>
							<InputGroup>
								<InputGroupInput
									id={newPasswordId}
									type={showPasswords.new ? "text" : "password"}
									value={formData.newPassword}
									onChange={(e) => handleChange("newPassword", e.target.value)}
									disabled={changePassword.isPending}
									required
									autoComplete="new-password"
								/>
								<InputGroupAddon align="inline-end">
									<button
										type="button"
										onClick={() => togglePasswordVisibility("new")}
										className="text-muted-foreground hover:text-foreground transition-colors"
										disabled={changePassword.isPending}
										aria-label={
											showPasswords.new
												? "Hide new password"
												: "Show new password"
										}
									>
										{showPasswords.new ? (
											<EyeOff className="size-4" />
										) : (
											<Eye className="size-4" />
										)}
									</button>
								</InputGroupAddon>
							</InputGroup>
							<p className="text-caption text-muted-foreground mt-1">
								Must be at least {VALIDATION_LIMITS.PASSWORD_MIN_LENGTH}{" "}
								characters with uppercase, lowercase, number, and special
								character
							</p>
						</Field>

						{/* Confirm Password */}
						<Field>
							<FieldLabel htmlFor={confirmPasswordId}>
								Confirm New Password *
							</FieldLabel>
							<InputGroup>
								<InputGroupInput
									id={confirmPasswordId}
									type={showPasswords.confirm ? "text" : "password"}
									value={formData.confirmPassword}
									onChange={(e) =>
										handleChange("confirmPassword", e.target.value)
									}
									disabled={changePassword.isPending}
									required
									autoComplete="new-password"
								/>
								<InputGroupAddon align="inline-end">
									<button
										type="button"
										onClick={() => togglePasswordVisibility("confirm")}
										className="text-muted-foreground hover:text-foreground transition-colors"
										disabled={changePassword.isPending}
										aria-label={
											showPasswords.confirm
												? "Hide confirm password"
												: "Show confirm password"
										}
									>
										{showPasswords.confirm ? (
											<EyeOff className="size-4" />
										) : (
											<Eye className="size-4" />
										)}
									</button>
								</InputGroupAddon>
							</InputGroup>
						</Field>

						{/* Validation Errors */}
						{validationErrors.length > 0 && (
							<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
								<p className="font-semibold text-destructive-text mb-2">
									Please fix the following errors:
								</p>
								<ul className="list-disc list-inside space-y-1 text-xs text-destructive-text">
									{validationErrors.map((error) => (
										<li key={error}>{error}</li>
									))}
								</ul>
							</div>
						)}
					</DialogBody>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							disabled={changePassword.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={changePassword.isPending}>
							{changePassword.isPending ? "Changing..." : "Change Password"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
