/**
 * The app's logger: a thin adapter over Sentry Logs (2026-11-28).
 *
 * Sentry Logs store, timestamp and index every log, linked to its trace and
 * issue, so this file no longer formats entries or keeps breadcrumbs. It does
 * only what calling `Sentry.logger` directly would not do for the app:
 * - load the SDK on first use (`#lib/sentry-lazy`), so marketing pages keep
 *   it out of their initial JavaScript (2026-11-24 SEO audit S1);
 * - open an issue for an error (captureException), not only write a log;
 * - print in development, where no log is sent (every init's beforeSendLog).
 *
 * A log's attributes are the context's fields, its `metadata` spread to the
 * top level (each a searchable column), an Error argument's name and message,
 * and any other arguments (which the SDK stringifies). Debug is development
 * console output only.
 */

import {
	captureException,
	captureMessage,
	log,
	type SentryLogLevel,
} from "#lib/sentry-lazy";

export interface LogContext {
	component?: string;
	action?: string;
	user_id?: string;
	sessionId?: string;
	requestId?: string;
	lease_id?: string;
	metadata?: Record<string, unknown>;
	[key: string]: unknown;
}

type Level = "debug" | SentryLogLevel;

const isDevelopment = () => process.env["NODE_ENV"] === "development";

// The one place app code reaches the console: development output only.
const devConsole: Partial<Console> | undefined =
	typeof globalThis !== "undefined"
		? (globalThis["console"] as Console | undefined)
		: undefined;

function printInDevelopment(
	level: Level,
	message: string,
	context: LogContext,
	args: unknown[],
): void {
	if (!isDevelopment()) return;
	const line = `[${context.component ?? "app"}] ${message}`;
	const print =
		level === "error"
			? devConsole?.error
			: level === "warn"
				? devConsole?.warn
				: devConsole?.info;
	print?.(line, context, ...args);
}

function attributesFor(
	context: LogContext,
	args: unknown[],
): Record<string, unknown> {
	const { metadata, ...fields } = context;
	const attributes: Record<string, unknown> = { ...metadata, ...fields };
	const others: unknown[] = [];
	for (const arg of args) {
		if (arg instanceof Error) {
			attributes["error.type"] = arg.name;
			attributes["error.message"] = arg.message;
		} else {
			others.push(arg);
		}
	}
	if (others.length > 0) attributes["args"] = others;
	return attributes;
}

function write(
	level: Level,
	message: string,
	context: LogContext,
	args: unknown[],
): void {
	printInDevelopment(level, message, context, args);
	if (level === "debug") return;
	try {
		log(level, message, attributesFor(context, args));
		if (level === "error") {
			const extra = {
				...context,
				...(args.length > 0 ? { args } : {}),
			};
			const error = args.find((arg): arg is Error => arg instanceof Error);
			if (error) captureException(error, { extra: { message, ...extra } });
			else captureMessage(message, { level: "error", extra });
		}
	} catch {
		// Never let logging break the app.
	}
}

/**
 * A logger with `defaultContext` on every entry (typically its component).
 * Each method takes a message, optional context, and any further arguments.
 */
export const createLogger = (defaultContext?: LogContext) => {
	const at =
		(level: Level) =>
		(message: string, context?: LogContext, ...args: unknown[]) =>
			write(level, message, { ...defaultContext, ...context }, args);
	return {
		debug: at("debug"),
		info: at("info"),
		warn: at("warn"),
		error: at("error"),
	};
};

/** A logger with no default context. */
export const logger = createLogger();
