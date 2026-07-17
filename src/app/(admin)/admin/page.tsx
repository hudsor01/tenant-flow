import { redirect } from "next/navigation";

// ADMIN-05: give bare /admin a real route so an authenticated admin lands on
// analytics instead of a 404. This page renders inside the (admin) layout, so
// the is_admin auth-wall still runs before the redirect fires.
export default function AdminIndexPage() {
	redirect("/admin/analytics");
}
