import type { Activity, ActivityType } from '@/types/activity';

export function classifyActivity(input: {
  providerType?: string;
  paceMinPerKm?: number | null;
}): ActivityType {
  const label = input.providerType?.toLowerCase() ?? '';
  if (label.includes('run') || label.includes('jog')) return 'run';
  if (label.includes('walk') || label.includes('hike')) return 'walk';
  if (typeof input.paceMinPerKm === 'number' && input.paceMinPerKm <= 8) return 'run';
  if (typeof input.paceMinPerKm === 'number') return 'walk';
  return 'other';
}

export function runDistanceKm(activities: Activity[], from?: string, to?: string): number {
  return activities
    .filter((activity) => activity.activityType === 'run')
    .filter((activity) => !from || activity.occurredAt >= from)
    .filter((activity) => !to || activity.occurredAt < to)
    .reduce((total, activity) => total + activity.distanceKm, 0);
}

export function calculatePace(distanceKm: number, durationSeconds: number): number | null {
  return distanceKm > 0 && durationSeconds > 0 ? durationSeconds / 60 / distanceKm : null;
}