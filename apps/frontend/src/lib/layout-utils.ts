export function updateContentLayout(value: "centered" | "full-width") {
  // Ensure DOM access only happens on client to prevent hydration mismatches
  if (typeof document === "undefined") return;
  
  const target = document.querySelector('[data-slot="sidebar-inset"]');
  if (target) {
    target.setAttribute("data-content-layout", value);
  }
}
