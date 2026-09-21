import type { Activity } from '@/types/activity';
import { runDistanceKm } from '@/lib/activityClassification';
import type { TrainingPlanDay } from '@/types/trainingPlan';

export function calculateDailyCompletion(day: TrainingPlanDay, activities: Activity[], date: string) {
  const actualDistance = runDistanceKm(activities, date, `${date}T23:59:59.999Z`);
  const plannedDistance = day.type === 'run' ? day.distance ?? 0 : 0;
  return { date, plannedDistance, actualDistance, isRest: day.type === 'rest', isComplete: day.type === 'rest' || actualDistance >= plannedDistance, shortfall: Math.max(0, plannedDistance - actualDistance) };
}