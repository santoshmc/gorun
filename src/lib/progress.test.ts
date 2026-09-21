import { describe, expect, it } from 'vitest';
import { calculateStreak } from '@/lib/streakCalculation';
import { calculateMonthlyProgress } from '@/lib/monthlyProgress';

describe('progress calculations', () => {
  it('calculates a streak and ignores duplicate dates', () => expect(calculateStreak(['2026-09-01', '2026-09-02', '2026-09-02'])).toMatchObject({ current: 2, longest: 2 }));
  it('counts only run activities in monthly progress', () => expect(calculateMonthlyProgress(10, '2026-09', [{ id: '1', occurredAt: '2026-09-01', distanceKm: 4, durationSeconds: 100, paceMinPerKm: 1, averageSpeedKmh: 10, source: 'manual', activityType: 'run', isManuallyCorrected: false, createdAt: '', updatedAt: '' }, { id: '2', occurredAt: '2026-09-02', distanceKm: 5, durationSeconds: 100, paceMinPerKm: 1, averageSpeedKmh: 10, source: 'manual', activityType: 'walk', isManuallyCorrected: false, createdAt: '', updatedAt: '' }])).toMatchObject({ totalDistance: 4, remainingDistance: 6 }));
});