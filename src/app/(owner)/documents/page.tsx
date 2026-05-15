import { permanentRedirect } from "next/navigation";

// /documents is the conceptual home for property documents — but the real
// vault (search + filters + bulk download) lives at /documents/vault and
// the sidebar/marketing surfaces all point there. `permanentRedirect` emits
// 308 so search engines and bookmarks transfer to the canonical vault path
// (the redirect is permanent — there's no plan to bring back a /documents
// index).
export default function DocumentsPage() {
	permanentRedirect("/documents/vault");
}
