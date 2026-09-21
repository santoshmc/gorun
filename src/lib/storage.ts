import type { StateStorage } from 'zustand/middleware';

export type StorageIssue = 'write-failed' | 'corrupt-data';

const listeners = new Set<(issue: StorageIssue | null) => void>();
let currentIssue: StorageIssue | null = null;

export function reportStorageIssue(issue: StorageIssue): void {
  currentIssue = issue;
  listeners.forEach((listener) => listener(issue));
}

export function clearStorageIssue(): void {
  currentIssue = null;
  listeners.forEach((listener) => listener(null));
}

export function getStorageIssue(): StorageIssue | null {
  return currentIssue;
}

export function subscribeToStorageIssues(
  listener: (issue: StorageIssue | null) => void
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * localStorage throws in private browsing and when the quota is exceeded, so
 * every access is guarded and downgraded to an in-memory session instead.
 */
export const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      reportStorageIssue('write-failed');
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      reportStorageIssue('write-failed');
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      reportStorageIssue('write-failed');
    }
  },
};
