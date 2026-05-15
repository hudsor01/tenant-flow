import { redirect } from "next/navigation";

// /documents is the conceptual home for property documents — but the real
// vault (search + filters + bulk download) lives at /documents/vault and
// the sidebar/marketing surfaces all point there. Redirect to keep the
// orphan path consistent with the pricing promise ("Document vault with
// global search") rather than landing on a static templates index.
export default function DocumentsPage() {
	redirect("/documents/vault");
}
