import { useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export interface UseServerActionOptions<T = unknown> {
  onSuccess?: (data?: T) => void;
  onError?: (error: string) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  revalidatePath?: string;
}

export interface ServerActionState<T = unknown> {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: T;
}

/**
 * Hook for executing server actions with optimistic UI updates
 * Handles loading states, error handling, and toast notifications
 */
export function useServerAction<T extends unknown[], R extends ServerActionState>(
  action: (...args: T) => Promise<R>,
  options: UseServerActionOptions<R extends ServerActionState<infer U> ? U : unknown> = {}
) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  
  const {
    onSuccess,
    onError,
    showSuccessToast = true,
    showErrorToast = true,
    successMessage = 'Action completed successfully',
    revalidatePath,
  } = options;

  const execute = useCallback(async (...args: T): Promise<R> => {
    return new Promise((resolve) => {
      startTransition(async () => {
        try {
          const result = await action(...args);
          
          if (result.success) {
            if (showSuccessToast) {
              toast.success(result.message || successMessage);
            }
            
            if (revalidatePath) {
              router.push(revalidatePath);
            }
            
            onSuccess?.(result.data as R extends ServerActionState<infer U> ? U : unknown);
          } else {
            const errorMessage = result.errors?._form?.[0] || result.message || 'Action failed';
            
            if (showErrorToast) {
              toast.error(errorMessage);
            }
            
            onError?.(errorMessage);
          }
          
          resolve(result);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
          
          if (showErrorToast) {
            toast.error(errorMessage);
          }
          
          onError?.(errorMessage);
          
          const errorResult = {
            success: false,
            message: errorMessage,
            errors: { _form: [errorMessage] }
          } as unknown as R;
          
          resolve(errorResult);
        }
      });
    });
  }, [action, onSuccess, onError, showSuccessToast, showErrorToast, successMessage, revalidatePath, router]);

  return [execute, isPending] as const;
}