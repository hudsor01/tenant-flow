import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "TenantFlow",
  version: packageJson.version,
  copyright: `© ${currentYear}, TenantFlow.`,
  meta: {
    title: "TenantFlow - Property Management Platform",
    description:
      "TenantFlow is a comprehensive property management platform built with Next.js 15, Tailwind CSS v4, and shadcn/ui. Streamline your property operations, tenant management, and financial tracking.",
  },
};
