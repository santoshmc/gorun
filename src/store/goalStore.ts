import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { isValidMonthKey } from '@/lib/month';
import { reportStorageIssue, safeStorage } from '@/lib/storage';
import type { Goal, GoalInput, MonthKey } from '@/types/goal';

interface GoalState {
  goals: Record<MonthKey, Goal>;
  hydrated: boolean;
  saveGoal: (input: GoalInput) => Goal;
  deleteGoal: (monthKey: MonthKey) => void;
  setHydrated: (hydrated: boolean) => void;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function isGoal(value: unknown): value is Goal {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Goal>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.monthKey === 'string' &&
    isValidMonthKey(candidate.monthKey) &&
    typeof candidate.targetDistance === 'number' &&
    Number.isFinite(candidate.targetDistance) &&
    candidate.targetDistance > 0 &&
    (candidate.unit === 'km' || candidate.unit === 'mi')
  );
}

/** Drops anything that does not match the current shape rather than crashing. */
function sanitiseGoals(value: unknown): { goals: Record<MonthKey, Goal>; dropped: boolean } {
  if (typeof value !== 'object' || value === null) {
    return { goals: {}, dropped: value !== undefined };
  }

  const goals: Record<MonthKey, Goal> = {};
  let dropped = false;

  for (const [monthKey, goal] of Object.entries(value as Record<string, unknown>)) {
    if (isValidMonthKey(monthKey) && isGoal(goal) && goal.monthKey === monthKey) {
      goals[monthKey] = goal;
    } else {
      dropped = true;
    }
  }

  return { goals, dropped };
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set) => ({
      goals: {},
      hydrated: false,

      // Keying by monthKey makes "one goal per month" a store invariant.
      saveGoal: (input) => {
        const now = new Date().toISOString();
        let saved!: Goal;

        set((state) => {
          const existing = state.goals[input.monthKey];
          saved = {
            id: existing?.id ?? createId(),
            monthKey: input.monthKey,
            targetDistance: input.targetDistance,
            unit: input.unit,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          };
          return { goals: { ...state.goals, [input.monthKey]: saved } };
        });

        return saved;
      },

      deleteGoal: (monthKey) =>
        set((state) => {
          const { [monthKey]: _removed, ...rest } = state.goals;
          return { goals: rest };
        }),

      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'gorun.goals.v1',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: ({ goals }) => ({ goals }),
      merge: (persisted, current) => {
        const { goals, dropped } = sanitiseGoals(
          (persisted as { goals?: unknown } | undefined)?.goals
        );
        if (dropped) reportStorageIssue('corrupt-data');
        return { ...current, goals };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) reportStorageIssue('corrupt-data');
        state?.setHydrated(true);
      },
    }
  )
);

export function selectGoal(monthKey: MonthKey) {
  return (state: GoalState): Goal | undefined => state.goals[monthKey];
}
