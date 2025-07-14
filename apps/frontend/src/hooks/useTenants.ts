// Updated: useTenants.ts now uses our new tRPC backend routers

import { trpc } from "../lib/trpcClient";
import { handleApiError } from "@/lib/utils";
import { toast } from "sonner";

// Tenants queries
export function useTenants(query?: any) {
  return trpc.tenants.list.useQuery(query || {}, {
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60000,
  });
}

export function useTenant(id: string) {
  return trpc.tenants.byId.useQuery({ id }, {
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useTenantStats() {
  return trpc.tenants.stats.useQuery(undefined, {
    staleTime: 2 * 60 * 1000,
  });
}

// Public invitation queries
export function useVerifyInvitation(token: string) {
  return trpc.tenants.verifyInvitation.useQuery(
    { token },
    { enabled: !!token }
  );
}

// Tenant mutations
export function useCreateTenant() {
  const utils = trpc.useUtils();

  return trpc.tenants.invite.useMutation({
    onSuccess: () => {
      utils.tenants.list.invalidate();
      utils.tenants.stats.invalidate();
      toast.success("Tenant invitation sent successfully");
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

export function useInviteTenant() {
  const utils = trpc.useUtils();

  return trpc.tenants.invite.useMutation({
    onSuccess: () => {
      utils.tenants.list.invalidate();
      utils.tenants.stats.invalidate();
      toast.success("Tenant invitation sent successfully");
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

export function useUpdateTenant() {
  const utils = trpc.useUtils();

  return trpc.tenants.update.useMutation({
    onSuccess: (updatedTenant) => {
      utils.tenants.byId.setData({ id: updatedTenant.id }, updatedTenant);
      utils.tenants.list.invalidate();
      utils.tenants.stats.invalidate();
      toast.success("Tenant updated successfully");
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

export function useDeleteTenant() {
  const utils = trpc.useUtils();

  return trpc.tenants.delete.useMutation({
    onSuccess: () => {
      utils.tenants.list.invalidate();
      utils.tenants.stats.invalidate();
      toast.success("Tenant deleted successfully");
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

export function useAcceptInvitation() {
  return trpc.tenants.acceptInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation accepted successfully");
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}

// Combined hook for tenant management
export function useTenantActions() {
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();
  const inviteTenant = useInviteTenant();

  return {
    create: createTenant,
    update: updateTenant,
    delete: deleteTenant,
    invite: inviteTenant,
    isLoading:
      createTenant.isPending ||
      updateTenant.isPending ||
      deleteTenant.isPending ||
      inviteTenant.isPending,
  };
}

// Real-time tenants hook
export function useRealtimeTenants(query?: any) {
  return trpc.tenants.list.useQuery(
    query || {},
    {
      refetchInterval: 30000, // 30 seconds
      refetchIntervalInBackground: false,
    }
  );
}
