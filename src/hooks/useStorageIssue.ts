import { useSyncExternalStore } from 'react';
import { getStorageIssue, subscribeToStorageIssues, type StorageIssue } from '@/lib/storage';

export function useStorageIssue(): StorageIssue | null {
  return useSyncExternalStore(
    (listener) => subscribeToStorageIssues(listener),
    getStorageIssue,
    () => null
  );
}
