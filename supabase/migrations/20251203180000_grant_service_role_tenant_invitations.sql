-- Fix missing GRANT for service_role on tenant_invitations table
-- The RLS policy exists but the table-level GRANT was missing

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."tenant_invitations" TO "service_role";
