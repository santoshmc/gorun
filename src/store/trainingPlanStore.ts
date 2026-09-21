import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeStorage } from '@/lib/storage';
import type { TrainingPlan } from '@/types/trainingPlan';

interface TrainingPlanState {
  plans: Record<string, TrainingPlan>;
  hydrated: boolean;
  savePlan: (plan: TrainingPlan) => TrainingPlan;
  deletePlan: (monthKey: string) => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useTrainingPlanStore = create<TrainingPlanState>()(
  persist(
    (set) => ({
      plans: {},
      hydrated: false,
      savePlan: (plan) => {
        set((state) => ({
          plans: {
            ...state.plans,
            [plan.monthKey]: plan,
          },
        }));
        return plan;
      },
      deletePlan: (monthKey) =>
        set((state) => {
          const { [monthKey]: _removed, ...rest } = state.plans;
          return { plans: rest };
        }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'gorun.training-plan.v1',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: ({ plans }) => ({ plans }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
