import type { TrainingPlan, TrainingPlanDay, TrainingPlanInput, TrainingWeek } from '@/types/trainingPlan';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const RUN_DAY_PATTERNS: Record<3 | 4 | 5, number[]> = {
  3: [0, 2, 4],
  4: [0, 2, 3, 5],
  5: [0, 1, 2, 4, 5],
};

export function getMonthDayCount(monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

export function getWeekCountForMonth(monthKey: string): number {
  const daysInMonth = getMonthDayCount(monthKey);
  return Math.min(4, Math.ceil(daysInMonth / 7)) || 4;
}

export function getWeeklyTarget(monthlyTarget: number, monthKey: string): number {
  void monthKey;
  return Number((monthlyTarget / 4).toFixed(1));
}

function normalizeProgressiveWeights(count: number): number[] {
  const base = [0.9, 1.1, 1.15, 1.35, 1.7];
  return Array.from({ length: count }, (_, index) => base[index] ?? base[base.length - 1]);
}

function toRoundedDistance(value: number): number {
  return Number(value.toFixed(1));
}

function refreshWeekTotals(week: TrainingWeek): TrainingWeek {
  const totalDistance = toRoundedDistance(
    week.days.reduce((sum, day) => sum + (day.type === 'run' ? day.distance ?? 0 : 0), 0)
  );

  return {
    ...week,
    totalDistance,
  };
}

function clonePlan(plan: TrainingPlan): TrainingPlan {
  return {
    ...plan,
    weeks: plan.weeks.map((week) => ({
      ...week,
      days: week.days.map((day) => ({ ...day })),
    })),
  };
}

export function getPlanTotals(plan: TrainingPlan) {
  const weeklyTotals = plan.weeks.map((week) => refreshWeekTotals(week).totalDistance);
  const monthlyTotal = toRoundedDistance(weeklyTotals.reduce((sum, total) => sum + total, 0));

  return {
    weeklyTotals,
    monthlyTotal,
  };
}

export function isTrainingPlanMismatch(plan: TrainingPlan, targetDistance: number) {
  const { monthlyTotal, weeklyTotals } = getPlanTotals(plan);
  const weeklyMismatch = Object.fromEntries(
    weeklyTotals.map((total, index) => [index, Math.abs(total - targetDistance / plan.weeks.length) > 0.1])
  );

  return {
    isMismatch: Math.abs(monthlyTotal - targetDistance) > 0.1,
    weeklyMismatch,
    monthlyMismatch: Math.abs(monthlyTotal - targetDistance) > 0.1,
    targetDistance,
    actualDistance: monthlyTotal,
  };
}

export function updateTrainingPlanDayDistance(
  plan: TrainingPlan,
  weekIndex: number,
  dayIndex: number,
  distance: number
): TrainingPlan {
  const nextPlan = clonePlan(plan);
  const week = nextPlan.weeks[weekIndex];
  if (!week || !week.days[dayIndex]) return plan;

  const nextDistance = Number.isFinite(distance) ? Math.max(0, Number(distance)) : 0;
  const day = week.days[dayIndex];
  week.days[dayIndex] = {
    ...day,
    type: 'run',
    distance: toRoundedDistance(nextDistance),
  };
  week.days[dayIndex] = { ...week.days[dayIndex], distance: toRoundedDistance(nextDistance) };

  nextPlan.weeks[weekIndex] = refreshWeekTotals(week);
  nextPlan.updatedAt = new Date().toISOString();
  return nextPlan;
}

export function moveTrainingPlanDay(
  plan: TrainingPlan,
  weekIndex: number,
  fromIndex: number,
  toIndex: number
): TrainingPlan {
  const nextPlan = clonePlan(plan);
  const week = nextPlan.weeks[weekIndex];
  if (!week || !week.days[fromIndex] || !week.days[toIndex] || fromIndex === toIndex) return plan;

  const source = { ...week.days[fromIndex] };
  const target = { ...week.days[toIndex] };

  if (source.type !== 'run') {
    return plan;
  }

  const distance = source.distance ?? 1;

  week.days[fromIndex] = {
    ...target,
    type: 'rest',
    distance: undefined,
  };
  week.days[toIndex] = {
    ...source,
    type: 'run',
    distance: toRoundedDistance(distance),
    label: target.label,
    dayNumber: target.dayNumber,
  };

  nextPlan.weeks[weekIndex] = refreshWeekTotals(week);
  nextPlan.updatedAt = new Date().toISOString();
  return nextPlan;
}

export function toggleTrainingPlanDayType(
  plan: TrainingPlan,
  weekIndex: number,
  dayIndex: number
): TrainingPlan {
  const nextPlan = clonePlan(plan);
  const week = nextPlan.weeks[weekIndex];
  if (!week || !week.days[dayIndex]) return plan;

  const day = week.days[dayIndex];

  if (day.type === 'run') {
    week.days[dayIndex] = { ...day, type: 'rest', distance: undefined };
  } else {
    week.days[dayIndex] = {
      ...day,
      type: 'run',
      distance: toRoundedDistance(day.distance ?? 1),
    };
  }

  nextPlan.weeks[weekIndex] = refreshWeekTotals(week);
  nextPlan.updatedAt = new Date().toISOString();
  return nextPlan;
}

export function generateTrainingPlan(input: TrainingPlanInput): TrainingPlan {
  const weekCount = getWeekCountForMonth(input.monthKey);
  const weeklyTarget = getWeeklyTarget(input.targetDistance, input.monthKey);
  const runPattern = RUN_DAY_PATTERNS[input.runningDaysPerWeek];
  const now = new Date().toISOString();

  const weeks: TrainingWeek[] = Array.from({ length: weekCount }, (_, weekIndex) => {
    const days: TrainingPlanDay[] = Array.from({ length: 7 }, (_, dayIndex) => {
      const isRun = runPattern.includes(dayIndex);

      if (!isRun) {
        return {
          dayNumber: dayIndex + 1,
          label: WEEKDAY_LABELS[dayIndex],
          type: 'rest',
        };
      }

      const runIndex = runPattern.indexOf(dayIndex);
      let distance = weeklyTarget / input.runningDaysPerWeek;

      if (input.distributionStyle === 'progressive') {
        const weights = normalizeProgressiveWeights(input.runningDaysPerWeek);
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        distance = (weeklyTarget * weights[runIndex]) / totalWeight;
      }

      return {
        dayNumber: dayIndex + 1,
        label: WEEKDAY_LABELS[dayIndex],
        type: 'run',
        distance: toRoundedDistance(distance),
      };
    });

    return refreshWeekTotals({
      weekIndex: weekIndex + 1,
      days,
      totalDistance: 0,
    });
  });

  const finalTotal = weeks.reduce((sum, week) => sum + week.totalDistance, 0);
  const difference = toRoundedDistance(input.targetDistance - finalTotal);

  if (Math.abs(difference) > 0.1) {
    const lastWeek = weeks[weeks.length - 1];
    const adjustmentIndex = [...lastWeek.days].reverse().findIndex((day) => day.type === 'run');
    const actualAdjustmentIndex = adjustmentIndex === -1 ? -1 : lastWeek.days.length - 1 - adjustmentIndex;
    if (actualAdjustmentIndex !== -1) {
      lastWeek.days[actualAdjustmentIndex].distance = toRoundedDistance(
        (lastWeek.days[actualAdjustmentIndex].distance ?? 0) + difference
      );
      lastWeek.totalDistance = toRoundedDistance(
        lastWeek.days.reduce((sum, day) => sum + (day.type === 'run' ? day.distance ?? 0 : 0), 0)
      );
    }
  }

  return {
    id: `${input.monthKey}-${input.runningDaysPerWeek}-${input.distributionStyle}`,
    monthKey: input.monthKey,
    runningDaysPerWeek: input.runningDaysPerWeek,
    distributionStyle: input.distributionStyle,
    createdAt: now,
    updatedAt: now,
    weeks,
  };
}
