// Updated: useProperties.ts now uses our new tRPC backend routers

import { trpc } from "../lib/trpcClient";
import { toast } from "sonner";
import { handleApiError } from "@/lib/utils";
import type { PropertyQuery } from "@/types/query-types";

// Properties queries
export const useProperties = (query?: PropertyQuery) => {
  return trpc.properties.list.useQuery(query || {}, {
    refetchInterval: 30000,
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (error?.data?.code === 'UNAUTHORIZED') {
        return false;
      }
      return failureCount < 3;
    },
    // Enable only when user is potentially authenticated
    enabled: true, // Let TRPC handle auth errors gracefully
  });
};

export const useProperty = (id: string) => {
  return trpc.properties.byId.useQuery({ id }, {
    enabled: !!id,
  });
};

export const usePropertyStats = () => {
  return trpc.properties.stats.useQuery(undefined, {
    refetchInterval: 60000,
    retry: 2,
  });
};

// Properties mutations
export const useCreateProperty = () => {
  const utils = trpc.useUtils();

  return trpc.properties.create.useMutation({
    onSuccess: () => {
      utils.properties.list.invalidate();
      utils.properties.stats.invalidate();
      toast.success("Property created successfully");
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
};

export const useUpdateProperty = () => {
  const utils = trpc.useUtils();

  return trpc.properties.update.useMutation({
    onSuccess: (updatedProperty) => {
      utils.properties.byId.setData({ id: updatedProperty.id }, updatedProperty);
      utils.properties.list.invalidate();
      utils.properties.stats.invalidate();
      toast.success("Property updated successfully");
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
};

export const useDeleteProperty = () => {
  const utils = trpc.useUtils();

  return trpc.properties.delete.useMutation({
    onSuccess: () => {
      utils.properties.list.invalidate();
      utils.properties.stats.invalidate();
      toast.success("Property deleted successfully");
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
};

// Optimistic updates version
export const useOptimisticUpdateProperty = () => {
  const utils = trpc.useUtils();

  return trpc.properties.update.useMutation({
    onMutate: async (variables) => {
      await utils.properties.byId.cancel({ id: variables.id });
      const previousProperty = utils.properties.byId.getData({ id: variables.id });
      
      if (previousProperty) {
        utils.properties.byId.setData({ id: variables.id }, {
          ...previousProperty,
          ...variables,
          updatedAt: new Date(),
        });
      }
      
      return { previousProperty };
    },
    onError: (err, variables, context) => {
      if (context?.previousProperty) {
        utils.properties.byId.setData({ id: variables.id }, context.previousProperty);
      }
      toast.error(handleApiError(err));
    },
    onSuccess: () => {
      toast.success("Property updated successfully");
    },
    onSettled: (data, error, variables) => {
      utils.properties.byId.invalidate({ id: variables.id });
    },
  });
};
