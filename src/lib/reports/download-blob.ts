/**
 * Trigger a browser download for a Blob. Creates a hidden anchor + clicks it +
 * revokes the object URL after the click handler resolves.
 */

export function downloadBlob(blob: Blob, filename: string): void {
	if (typeof window === "undefined") {
		throw new Error("downloadBlob requires a browser environment");
	}
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.hidden = true;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	// Defer revoke so the browser has time to start the download
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
