import type { ReactNode } from "react";
import { ownerPageMetadata } from "#lib/seo/owner-page-metadata";

export const metadata = ownerPageMetadata(
	"Financials",
	"Financial overview, revenue, expenses, and profit analysis",
);

export default function Layout({ children }: { children: ReactNode }) {
	return <>{children}</>;
}
