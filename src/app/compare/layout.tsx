import type { ReactNode } from "react";
import { MutationScope } from "#components/shared/mutation-scope";

// The lead-capture modal runs a React Query mutation; marketing pages carry
// no account providers, so it gets a bare client here.
export default function CompareLayout({ children }: { children: ReactNode }) {
	return <MutationScope>{children}</MutationScope>;
}
