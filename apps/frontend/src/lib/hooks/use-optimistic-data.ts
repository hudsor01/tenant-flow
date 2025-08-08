import { useOptimistic, useCallback } from 'react';

export type OptimisticAction<T> = {
  type: 'add' | 'update' | 'delete' | 'replace';
  data?: T;
  id?: string;
  predicate?: (item: T) => boolean;
};

/**
 * Hook for optimistic UI updates with server actions
 * Provides immediate feedback while server action is pending
 */
export function useOptimisticData<T extends { id: string }>(
  initialData: T[],
  reducer?: (state: T[], action: OptimisticAction<T>) => T[]
) {
  const defaultReducer = useCallback((state: T[], action: OptimisticAction<T>): T[] => {
    switch (action.type) {
      case 'add':
        return action.data ? [...state, action.data] : state;
        
      case 'update':
        return action.data
          ? state.map(item => item.id === action.data!.id ? action.data! : item)
          : state;
          
      case 'delete':
        return action.id
          ? state.filter(item => item.id !== action.id)
          : action.predicate
          ? state.filter(item => !action.predicate!(item))
          : state;
          
      case 'replace':
        return action.data ? [action.data] : [];
        
      default:
        return state;
    }
  }, []);

  const [optimisticData, setOptimisticData] = useOptimistic(
    initialData,
    reducer || defaultReducer
  );

  const addOptimistic = useCallback((data: T) => {
    setOptimisticData({ type: 'add', data });
  }, [setOptimisticData]);

  const updateOptimistic = useCallback((data: T) => {
    setOptimisticData({ type: 'update', data });
  }, [setOptimisticData]);

  const deleteOptimistic = useCallback((id: string) => {
    setOptimisticData({ type: 'delete', id });
  }, [setOptimisticData]);

  const deleteOptimisticWhere = useCallback((predicate: (item: T) => boolean) => {
    setOptimisticData({ type: 'delete', predicate });
  }, [setOptimisticData]);

  const replaceOptimistic = useCallback((data: T) => {
    setOptimisticData({ type: 'replace', data });
  }, [setOptimisticData]);

  return {
    data: optimisticData,
    addOptimistic,
    updateOptimistic,
    deleteOptimistic,
    deleteOptimisticWhere,
    replaceOptimistic,
    setOptimisticData,
  };
}

/**
 * Hook for optimistic single item updates
 */
export function useOptimisticItem<T>(
  initialData: T,
  reducer?: (state: T, action: { type: 'update'; data: Partial<T> }) => T
) {
  const defaultReducer = useCallback((state: T, action: { type: 'update'; data: Partial<T> }): T => {
    if (action.type === 'update') {
      return { ...state, ...action.data };
    }
    return state;
  }, []);

  const [optimisticData, setOptimisticData] = useOptimistic(
    initialData,
    reducer || defaultReducer
  );

  const updateOptimistic = useCallback((data: Partial<T>) => {
    setOptimisticData({ type: 'update', data });
  }, [setOptimisticData]);

  return {
    data: optimisticData,
    updateOptimistic,
    setOptimisticData,
  };
}