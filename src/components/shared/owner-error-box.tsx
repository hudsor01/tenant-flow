/**
 * The box an owner page renders when its query fails (66.2-39 fix round 4,
 * G4): one for every owner list and edit page, so the seven read alike and
 * hold the p-6 they declare.
 *
 * The message is the box's last child, so `mb-0`: the `@layer base` `p` rule
 * (`margin-bottom: 1rem`) cannot collapse past the padding, and left the box
 * 16px deeper below its text than above it (40 against 24).
 */
interface OwnerErrorBoxProps {
	/** The heading, e.g. "Error Loading Leases". */
	title: string;
	/** The one-line message under it, e.g. "Failed to load leases". */
	message: string;
}

export function OwnerErrorBox({ title, message }: OwnerErrorBoxProps) {
	return (
		<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
			<h2 className="text-lg font-semibold text-destructive-text mb-2">
				{title}
			</h2>
			<p className="mb-0 text-muted-foreground">{message}</p>
		</div>
	);
}
