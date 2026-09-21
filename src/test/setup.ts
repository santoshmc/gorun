import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';
import { clearStorageIssue } from '@/lib/storage';
import { resetAudioForTests } from '@/lib/sound';
import { useGoalStore } from '@/store/goalStore';
import { useSettingsStore } from '@/store/settingsStore';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  shouldThrow = false;

  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    if (this.shouldThrow) throw new DOMException('QuotaExceededError');
    this.map.set(key, value);
  }
}

expect.extend(toHaveNoViolations);

export const memoryStorage = new MemoryStorage();

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: memoryStorage,
});

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

export function setReducedMotion(enabled: boolean) {
  (window.matchMedia as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (query: string) => ({
      matches: enabled && query.includes('reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })
  );
}

beforeEach(() => {
  memoryStorage.shouldThrow = false;
  memoryStorage.clear();
  clearStorageIssue();
  resetAudioForTests();
  setReducedMotion(false);
  useGoalStore.setState({ goals: {}, hydrated: true });
  useSettingsStore.setState({ preferredUnit: 'km', soundEnabled: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
