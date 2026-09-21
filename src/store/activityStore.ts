import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeStorage } from '@/lib/storage';
import { calculatePace, classifyActivity } from '@/lib/activityClassification';
import type { Activity, ActivityType, ProviderConnection, ProviderKey } from '@/types/activity';

const providerNames: Record<ProviderKey, string> = {
  'apple-health': 'Apple Health', 'google-fit': 'Google Fit', fitbit: 'Fitbit', garmin: 'Garmin', strava: 'Strava',
};
const providers = (): Record<ProviderKey, ProviderConnection> =>
  Object.fromEntries(Object.entries(providerNames).map(([key, name]) => [key, { key, name, connected: false }])) as Record<ProviderKey, ProviderConnection>;
const id = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `activity-${Date.now()}`;

interface ActivityState {
  activities: Activity[];
  providers: Record<ProviderKey, ProviderConnection>;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  connectProvider: (key: ProviderKey) => void;
  disconnectProvider: (key: ProviderKey, removeActivities?: boolean) => void;
  addActivity: (input: { occurredAt: string; distanceKm: number; durationSeconds: number; activityType?: ActivityType; source?: 'manual' | 'imported'; provider?: ProviderKey; externalId?: string }) => Activity;
  importActivities: (items: Array<{ occurredAt: string; distanceKm: number; durationSeconds: number; providerType?: string; provider: ProviderKey; externalId: string }>) => number;
  updateActivityType: (activityId: string, activityType: ActivityType) => void;
  deleteActivity: (activityId: string) => void;
}

export const useActivityStore = create<ActivityState>()(persist((set, get) => ({
  activities: [], providers: providers(), hydrated: false, setHydrated: (value) => set({ hydrated: value }),
  connectProvider: (key) => set((state) => ({ providers: { ...state.providers, [key]: { ...state.providers[key], connected: true, lastSyncAt: new Date().toISOString() } } })),
  disconnectProvider: (key, removeActivities = false) => set((state) => ({ providers: { ...state.providers, [key]: { ...state.providers[key], connected: false } }, activities: removeActivities ? state.activities.filter((activity) => activity.provider !== key) : state.activities })),
  addActivity: (input) => {
    const now = new Date().toISOString();
    const pace = calculatePace(input.distanceKm, input.durationSeconds);
    const activity: Activity = { id: id(), ...input, source: input.source ?? 'manual', activityType: input.activityType ?? classifyActivity({ paceMinPerKm: pace }), autoDetectedType: input.activityType, paceMinPerKm: pace, averageSpeedKmh: input.distanceKm / (input.durationSeconds / 3600), isManuallyCorrected: false, createdAt: now, updatedAt: now };
    set((state) => ({ activities: [...state.activities, activity] }));
    return activity;
  },
  importActivities: (items) => {
    let added = 0;
    for (const item of items) {
      if (get().activities.some((activity) => activity.provider === item.provider && activity.externalId === item.externalId)) continue;
      get().addActivity({ ...item, source: 'imported', activityType: classifyActivity({ providerType: item.providerType, paceMinPerKm: calculatePace(item.distanceKm, item.durationSeconds) }) });
      added += 1;
    }
    return added;
  },
  updateActivityType: (activityId, activityType) => set((state) => ({ activities: state.activities.map((activity) => activity.id === activityId ? { ...activity, activityType, isManuallyCorrected: true, updatedAt: new Date().toISOString() } : activity) })),
  deleteActivity: (activityId) => set((state) => ({ activities: state.activities.filter((activity) => activity.id !== activityId) })),
}), { name: 'gorun.activities.v1', version: 1, storage: createJSONStorage(() => safeStorage), partialize: ({ activities, providers }) => ({ activities, providers }), onRehydrateStorage: () => (state) => state?.setHydrated(true) }));