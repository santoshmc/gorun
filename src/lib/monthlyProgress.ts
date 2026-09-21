import type { Activity } from '@/types/activity';
import { runDistanceKm } from '@/lib/activityClassification';

export function calculateMonthlyProgress(goalDistance: number, monthKey: string, activities: Activity[]) {
  const totalDistance = runDistanceKm(activities, `${monthKey}-01`, `${monthKey}-32`);
  return { totalDistance, goalDistance, percentage: goalDistance > 0 ? Math.min(100, totalDistance / goalDistance * 100) : 0, remainingDistance: Math.max(0, goalDistance - totalDistance) };
}