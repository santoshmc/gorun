import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { DistributionStyleToggle } from '@/features/goal/_components/DistributionStyleToggle';
import { RunningDaysSelector } from '@/features/goal/_components/RunningDaysSelector';
import {
  generateTrainingPlan,
  getPlanTotals,
  isTrainingPlanMismatch,
  moveTrainingPlanDay,
  toggleTrainingPlanDayType,
  updateTrainingPlanDayDistance,
} from '@/lib/trainingPlan';
import { useTrainingPlanStore } from '@/store/trainingPlanStore';
import type { Goal } from '@/types/goal';
import type { DistributionStyle, TrainingPlan } from '@/types/trainingPlan';

export interface TrainingPlanDialogProps {
  open: boolean;
  goal: Goal;
  plan?: TrainingPlan;
  onClose: () => void;
  onSaved: () => void;
}

export function TrainingPlanDialog({ open, goal, plan, onClose, onSaved }: TrainingPlanDialogProps) {
  const savePlan = useTrainingPlanStore((state) => state.savePlan);
  const [runningDaysPerWeek, setRunningDaysPerWeek] = useState<3 | 4 | 5>(plan?.runningDaysPerWeek ?? 4);
  const [distributionStyle, setDistributionStyle] = useState<DistributionStyle>(
    plan?.distributionStyle ?? 'even'
  );
  const [draftPlan, setDraftPlan] = useState<TrainingPlan>(() =>
    plan ??
      generateTrainingPlan({
        monthKey: goal.monthKey,
        targetDistance: goal.targetDistance,
        unit: goal.unit,
        runningDaysPerWeek,
        distributionStyle,
      })
  );

  useEffect(() => {
    if (!plan) {
      setDraftPlan(
        generateTrainingPlan({
          monthKey: goal.monthKey,
          targetDistance: goal.targetDistance,
          unit: goal.unit,
          runningDaysPerWeek,
          distributionStyle,
        })
      );
      return;
    }

    setDraftPlan(plan);
  }, [distributionStyle, goal, open, plan, runningDaysPerWeek]);

  const preview = useMemo(
    () =>
      generateTrainingPlan({
        monthKey: goal.monthKey,
        targetDistance: goal.targetDistance,
        unit: goal.unit,
        runningDaysPerWeek,
        distributionStyle,
      }),
    [distributionStyle, goal, runningDaysPerWeek]
  );

  const totals = getPlanTotals(draftPlan);
  const mismatch = isTrainingPlanMismatch(draftPlan, goal.targetDistance);

  const handleSave = () => {
    const saved = {
      ...draftPlan,
      id: `${goal.monthKey}-${runningDaysPerWeek}-${distributionStyle}`,
      monthKey: goal.monthKey,
      runningDaysPerWeek,
      distributionStyle,
      updatedAt: new Date().toISOString(),
    };
    savePlan(saved);
    onSaved();
  };

  const handleDistanceChange = (weekIndex: number, dayIndex: number, value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    setDraftPlan((current) => updateTrainingPlanDayDistance(current, weekIndex, dayIndex, parsed));
  };

  const handleToggleDay = (weekIndex: number, dayIndex: number) => {
    setDraftPlan((current) => toggleTrainingPlanDayType(current, weekIndex, dayIndex));
  };

  const handleMoveDay = (weekIndex: number, dayIndex: number, direction: -1 | 1) => {
    const nextIndex = dayIndex + direction;
    if (nextIndex < 0 || nextIndex > 6) return;
    setDraftPlan((current) => moveTrainingPlanDay(current, weekIndex, dayIndex, nextIndex));
  };

  const resetToGenerated = () => {
    setDraftPlan(preview);
  };

  return (
    <Dialog
      open={open}
      title="Build your training plan"
      description="Split your monthly goal into clear weekly targets and rest days."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save plan</Button>
        </>
      }
    >
      <div className="space-y-5">
        <RunningDaysSelector value={runningDaysPerWeek} onChange={setRunningDaysPerWeek} />
        <DistributionStyleToggle value={distributionStyle} onChange={setDistributionStyle} />

        {mismatch.isMismatch && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">Plan no longer matches your monthly goal.</p>
            <p className="mt-1">
              {totals.monthlyTotal.toFixed(1)} {goal.unit} vs {goal.targetDistance.toFixed(1)} {goal.unit}
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={resetToGenerated} className="text-xs">
                Reset to suggested plan
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-sm font-bold uppercase tracking-wide text-slate-600">
              Preview
            </p>
            <span className="text-xs font-semibold text-slate-500">
              {totals.monthlyTotal.toFixed(1)} / {goal.targetDistance.toFixed(1)} {goal.unit}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {draftPlan.weeks.slice(0, 2).map((week) => (
              <div key={week.weekIndex} className="rounded-xl bg-white p-3 shadow-soft">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-sm font-bold text-slate-700">Week {week.weekIndex}</span>
                  <span className="text-xs font-semibold text-slate-500">
                    {week.totalDistance.toFixed(1)} {goal.unit}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {week.days.map((day, dayIndex) => (
                    <div
                      key={`${week.weekIndex}-${day.dayNumber}`}
                      className={[
                        'flex items-center gap-1 rounded-full border px-2 py-1',
                        day.type === 'run'
                          ? 'border-pastel-lemon bg-pastel-lemon/80 text-slate-700'
                          : 'border-slate-200 bg-slate-100 text-slate-500',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleDay(week.weekIndex - 1, dayIndex)}
                        className="text-[11px] font-semibold"
                      >
                        {day.type === 'run' ? 'Run' : 'Rest'}
                      </button>

                      {day.type === 'run' ? (
                        <>
                          <input
                            aria-label={`${day.label} distance`}
                            type="number"
                            min="0"
                            step="0.1"
                            value={day.distance ?? 0}
                            onChange={(event) =>
                              handleDistanceChange(week.weekIndex - 1, dayIndex, event.target.value)
                            }
                            className="w-16 rounded-md border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-slate-700 outline-none"
                          />
                          <span className="text-[10px] uppercase tracking-wide text-slate-500">{goal.unit}</span>
                        </>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleMoveDay(week.weekIndex - 1, dayIndex, -1)}
                        aria-label={`Move ${day.label} earlier`}
                        className="text-[10px] text-slate-500"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDay(week.weekIndex - 1, dayIndex, 1)}
                        aria-label={`Move ${day.label} later`}
                        className="text-[10px] text-slate-500"
                      >
                        →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
