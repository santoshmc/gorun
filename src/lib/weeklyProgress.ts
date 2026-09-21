import type { Activity } from '@/types/activity';
import type { TrainingWeek } from '@/types/trainingPlan';
import { runDistanceKm } from '@/lib/activityClassification';

export function calculateWeeklyProgress(week: TrainingWeek, activities: Activity[], startDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 7);
  const actualDistance = runDistanceKm(activities, start.toISOString(), end.toISOString());
  return { plannedDistance: week.totalDistance, actualDistance, remainingDistance: Math.max(0, week.totalDistance - actualDistance), achieved: actualDistance >= week.totalDistance };
}