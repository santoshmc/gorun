import { describe, expect, it } from 'vitest';
import {
  generateTrainingPlan,
  getPlanTotals,
  isTrainingPlanMismatch,
  moveTrainingPlanDay,
  toggleTrainingPlanDayType,
  updateTrainingPlanDayDistance,
} from '@/lib/trainingPlan';

describe('generateTrainingPlan', () => {
  it('creates a weekly schedule for a monthly target using even spacing', () => {
    const plan = generateTrainingPlan({
      monthKey: '2026-09',
      targetDistance: 100,
      unit: 'km',
      runningDaysPerWeek: 4,
      distributionStyle: 'even',
    });

    expect(plan.weeks).toHaveLength(4);
    expect(plan.weeks[0].totalDistance).toBeGreaterThan(24);
    expect(plan.weeks[0].totalDistance).toBeLessThan(26);
    expect(plan.weeks[0].days.filter((day) => day.type === 'run')).toHaveLength(4);
    expect(plan.weeks[0].days.filter((day) => day.type === 'rest')).toHaveLength(3);
    expect(plan.weeks[0].days.some((day) => day.distance && day.distance > 0)).toBe(true);
  });

  it('creates a progressive long-run split with a heavier long run', () => {
    const plan = generateTrainingPlan({
      monthKey: '2026-09',
      targetDistance: 120,
      unit: 'km',
      runningDaysPerWeek: 3,
      distributionStyle: 'progressive',
    });

    const runDays = plan.weeks[0].days.filter((day) => day.type === 'run');
    const distances = runDays.map((day) => day.distance ?? 0);

    expect(runDays).toHaveLength(3);
    expect(Math.max(...distances)).toBeGreaterThan(Math.min(...distances));
    expect(plan.weeks[0].totalDistance).toBeGreaterThan(29);
    expect(plan.weeks[0].totalDistance).toBeLessThan(31);
  });

  it('updates distances and reports a mismatch against the monthly target', () => {
    const plan = generateTrainingPlan({
      monthKey: '2026-09',
      targetDistance: 100,
      unit: 'km',
      runningDaysPerWeek: 4,
      distributionStyle: 'even',
    });

    const updated = updateTrainingPlanDayDistance(plan, 0, 0, 4);
    const totals = getPlanTotals(updated);

    expect(updated.weeks[0].days[0].distance).toBe(4);
    expect(totals.monthlyTotal).toBeLessThan(100);
    expect(isTrainingPlanMismatch(updated, 100).isMismatch).toBe(true);
  });

  it('moves a run day to a different weekday and toggles it to rest', () => {
    const plan = generateTrainingPlan({
      monthKey: '2026-09',
      targetDistance: 100,
      unit: 'km',
      runningDaysPerWeek: 4,
      distributionStyle: 'even',
    });

    const moved = moveTrainingPlanDay(plan, 0, 0, 5);
    const toggled = toggleTrainingPlanDayType(moved, 0, 0);

    expect(moved.weeks[0].days[5].type).toBe('run');
    expect(moved.weeks[0].days[0].type).toBe('rest');
    expect(toggled.weeks[0].days[0].type).toBe('run');
  });
});
