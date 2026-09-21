import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Confetti } from '@/components/ui/Confetti';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GoalEmptyState } from '@/features/goal/_components/GoalEmptyState';
import { GoalFormDialog } from '@/features/goal/_components/GoalFormDialog';
import { GoalSummaryCard } from '@/features/goal/_components/GoalSummaryCard';
import { TrainingPlanDialog } from '@/features/goal/_components/TrainingPlanDialog';
import { TrainingPlanSection } from '@/features/goal/_components/TrainingPlanSection';
import { useSound } from '@/hooks/useSound';
import { useStorageIssue } from '@/hooks/useStorageIssue';
import { currentMonthKey } from '@/lib/month';
import { useGoalStore } from '@/store/goalStore';
import { useTrainingPlanStore } from '@/store/trainingPlanStore';
import { ActivitySection } from '@/features/goal/_components/ActivitySection';

function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading your goal"
      className="h-56 animate-pulse rounded-3xl bg-white/60 shadow-soft"
    />
  );
}

function StorageBanner({ issue }: { issue: 'write-failed' | 'corrupt-data' }) {
  const message =
    issue === 'write-failed'
      ? "We couldn't save your goal on this device. It will stay for this visit only."
      : 'Some saved data could not be read, so we started fresh.';

  return (
    <div role="alert" className="rounded-2xl bg-pastel-lemon px-4 py-3 text-sm text-slate-700">
      {message}
    </div>
  );
}

export function DashboardPage() {
  const hydrated = useGoalStore((state) => state.hydrated);
  const goals = useGoalStore((state) => state.goals);
  const deleteGoal = useGoalStore((state) => state.deleteGoal);
  const plan = useTrainingPlanStore((state) => state.plans[currentMonthKey()]);
  const storageIssue = useStorageIssue();
  const { play } = useSound();

  const monthKey = currentMonthKey();
  const goal = goals[monthKey];

  const [formOpen, setFormOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [burstId, setBurstId] = useState(0);

  const openCreate = () => {
    setEditing(false);
    setFormOpen(true);
  };

  const openEdit = () => {
    setEditing(true);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {storageIssue && <StorageBanner issue={storageIssue} />}

      {!hydrated ? (
        <DashboardSkeleton />
      ) : (
        <AnimatePresence mode="wait">
          {goal ? (
            <>
              <GoalSummaryCard
                key={goal.id}
                goal={goal}
                onEdit={openEdit}
                onDelete={() => setConfirmDelete(true)}
              />
              <TrainingPlanSection
                goal={goal}
                plan={plan}
                onGenerate={() => setPlanOpen(true)}
                onEdit={() => setPlanOpen(true)}
              />
            </>
          ) : (
            <GoalEmptyState key="empty" onCreate={openCreate} />
          )}
        </AnimatePresence>
      )}

      {hydrated && <ActivitySection />}

      {formOpen && (
        <GoalFormDialog
          open
          goal={editing ? goal : undefined}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            setBurstId((value) => value + 1);
          }}
        />
      )}

      {goal && (
        <TrainingPlanDialog
          open={planOpen}
          goal={goal}
          plan={plan}
          onClose={() => setPlanOpen(false)}
          onSaved={() => setPlanOpen(false)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this goal?"
        description="You can always set a new one afterwards."
        confirmLabel="Yes, delete it"
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          deleteGoal(monthKey);
          play('whoosh');
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <Confetti burstId={burstId} />
    </div>
  );
}
