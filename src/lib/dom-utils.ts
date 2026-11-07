/**
 * `secureCookie` writes and reads a browser cookie (the sidebar's open state,
 * the theme mode): it strips the name to word characters and URI-encodes the
 * value, `set` adds `Secure` on HTTPS, and both calls are no-ops on the server
 * (no `document`).
 */

/**
 * Cookie operations with security validation
 */
export const secureCookie = {
	/**
	 * Set a cookie with security validation
	 */
	set(
		name: string,
		value: string,
		options: {
			path?: string;
			maxAge?: number;
			sameSite?: "Strict" | "Lax" | "None";
			secure?: boolean;
		} = {},
	) {
		if (typeof document === "undefined") return;

		// Validate cookie name and value
		if (!name || !value) {
			throw new Error("Cookie name and value are required");
		}

		// Sanitize cookie name and value
		const sanitizedName = name.replace(/[^\w-]/g, "");
		const sanitizedValue = encodeURIComponent(value);

		const cookieSegments = [
			`${sanitizedName}=${sanitizedValue}`,
			`path=${options.path || "/"}`,
			...(options.maxAge ? [`max-age=${options.maxAge}`] : []),
			`SameSite=${options.sameSite || "Lax"}`,
		];

		// Auto-detect secure requirement for HTTPS
		const isSecure =
			options.secure ??
			(typeof window !== "undefined" && window.location.protocol === "https:");
		if (isSecure) {
			cookieSegments.push("Secure");
		}

		document.cookie = cookieSegments.join("; ");
	},

	/**
	 * Get a cookie with validation
	 */
	get(name: string): string | null {
		if (typeof document === "undefined") return null;
		if (!name) return null;
		const sanitizedName = name.replace(/[^\w-]/g, "");
		const cookie = document.cookie
			.split("; ")
			.find((entry) => entry.startsWith(`${sanitizedName}=`));

		if (cookie) {
			const [, value] = cookie.split("=", 2);
			return value ? decodeURIComponent(value) : null;
		}

		return null;
	},
};
