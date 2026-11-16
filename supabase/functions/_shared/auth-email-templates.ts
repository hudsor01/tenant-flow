// The auth emails, one function per Supabase email type, built from the shared
// blocks in email-layout.ts. The auth-email-send hook fills them with real
// values. Every value is escaped by the helpers.

import {
	BRAND_NAME,
	emailButton,
	emailDivider,
	emailHeading,
	emailLinkFallback,
	emailNote,
	emailStrong,
	emailText,
	supportLink,
	wrapEmailLayout,
} from "./email-layout.ts";

interface AuthEmail {
	subject: string;
	html: string;
}

function authEmail(params: {
	subject: string;
	preheader: string;
	body: string;
}): AuthEmail {
	return {
		subject: params.subject,
		html: wrapEmailLayout(params.body, {
			preheader: params.preheader,
			title: params.subject,
		}),
	};
}

export function signupConfirmationEmail(params: {
	confirmUrl: string;
	email: string;
}): AuthEmail {
	return authEmail({
		subject: `Confirm your email for ${BRAND_NAME}`,
		preheader: `Confirm your email address to finish creating your ${BRAND_NAME} account.`,
		body: [
			emailHeading("Confirm your email"),
			emailText(
				`Thanks for signing up. Confirm ${emailStrong(params.email)} to finish creating your ${BRAND_NAME} account.`,
			),
			emailButton(params.confirmUrl, "Confirm email"),
			emailLinkFallback(params.confirmUrl),
			emailDivider(),
			emailNote(
				`If you didn't create a ${BRAND_NAME} account, you can ignore this email.`,
			),
		].join("\n"),
	});
}

export function passwordResetEmail(params: {
	resetUrl: string;
	email: string;
}): AuthEmail {
	return authEmail({
		subject: `Reset your ${BRAND_NAME} password`,
		preheader: "Use this link to choose a new password.",
		body: [
			emailHeading("Reset your password"),
			emailText(
				`We received a request to reset the password for ${emailStrong(params.email)}. Choose a new password with the button below.`,
			),
			emailButton(params.resetUrl, "Reset password"),
			emailLinkFallback(params.resetUrl),
			emailDivider(),
			emailNote(
				"This link works once. If you didn't ask to reset your password, you can ignore this email and your password won't change.",
			),
		].join("\n"),
	});
}

export function invitationEmail(params: {
	inviteUrl: string;
	email: string;
	inviterName?: string;
}): AuthEmail {
	const intro = params.inviterName
		? `${emailStrong(params.inviterName)} invited ${emailStrong(params.email)} to ${BRAND_NAME}.`
		: `You've been invited to create a ${BRAND_NAME} account for ${emailStrong(params.email)}.`;
	return authEmail({
		subject: `You're invited to ${BRAND_NAME}`,
		preheader: "Accept your invitation and set a password.",
		body: [
			emailHeading(`You've been invited to ${BRAND_NAME}`),
			emailText(`${intro} Accept the invitation to set your password.`),
			emailButton(params.inviteUrl, "Accept invitation"),
			emailLinkFallback(params.inviteUrl),
			emailDivider(),
			emailNote(
				"If you weren't expecting this invitation, you can ignore this email.",
			),
		].join("\n"),
	});
}

export function magicLinkEmail(params: {
	magicLinkUrl: string;
	email: string;
}): AuthEmail {
	return authEmail({
		subject: `Your ${BRAND_NAME} sign-in link`,
		preheader: `Sign in to ${BRAND_NAME} with one click.`,
		body: [
			emailHeading(`Sign in to ${BRAND_NAME}`),
			emailText(
				`Use the button below to sign in as ${emailStrong(params.email)}.`,
			),
			emailButton(params.magicLinkUrl, "Sign in"),
			emailLinkFallback(params.magicLinkUrl),
			emailDivider(),
			emailNote(
				"This link works once. If you didn't ask for it, you can ignore this email.",
			),
		].join("\n"),
	});
}

export function emailChangeEmail(params: {
	confirmUrl: string;
	email: string;
	newEmail: string;
}): AuthEmail {
	return authEmail({
		subject: `Confirm your new ${BRAND_NAME} email address`,
		preheader: "Confirm the change to your sign-in email.",
		body: [
			emailHeading("Confirm your email change"),
			emailText(
				`Confirm that you want to change your ${BRAND_NAME} sign-in email from ${emailStrong(params.email)} to ${emailStrong(params.newEmail)}.`,
			),
			emailButton(params.confirmUrl, "Confirm email change"),
			emailLinkFallback(params.confirmUrl),
			emailDivider(),
			emailNote(
				`If you didn't ask for this change, don't use the button. Reset your password with ${emailStrong("Forgot password")} on the sign-in page, and email ${supportLink()}.`,
			),
		].join("\n"),
	});
}
