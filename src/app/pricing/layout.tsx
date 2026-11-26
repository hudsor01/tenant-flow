import type { ReactNode } from "react";
import { MutationScope } from "#components/shared/mutation-scope";

// The plan cards' checkout and the lead-capture modal run React Query
// mutations; marketing pages carry no account providers, so they get a bare
// client here.
export default function PricingLayout({ children }: { children: ReactNode }) {
	return <MutationScope>{children}</MutationScope>;
}
