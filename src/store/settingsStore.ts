import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeStorage } from '@/lib/storage';
import type { DistanceUnit } from '@/types/goal';

interface SettingsState {
  preferredUnit: DistanceUnit;
  soundEnabled: boolean;
  setPreferredUnit: (unit: DistanceUnit) => void;
  toggleSound: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      preferredUnit: 'km',
      soundEnabled: true,
      setPreferredUnit: (preferredUnit) => set({ preferredUnit }),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
    }),
    {
      name: 'gorun.settings.v1',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: ({ preferredUnit, soundEnabled }) => ({ preferredUnit, soundEnabled }),
    }
  )
);
