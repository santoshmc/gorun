import { describe, expect, it } from 'vitest';
import { getStorageIssue } from '@/lib/storage';
import { useGoalStore } from '@/store/goalStore';
import { memoryStorage } from '@/test/setup';

const INPUT = { monthKey: '2026-10', targetDistance: 100, unit: 'km' } as const;

describe('goalStore', () => {
  it('creates a goal keyed by month', () => {
    const goal = useGoalStore.getState().saveGoal(INPUT);

    expect(goal.id).toBeTruthy();
    expect(useGoalStore.getState().goals['2026-10']).toEqual(goal);
  });

  it('never holds two goals for the same month', () => {
    useGoalStore.getState().saveGoal(INPUT);
    useGoalStore.getState().saveGoal({ ...INPUT, targetDistance: 150 });

    const { goals } = useGoalStore.getState();
    expect(Object.keys(goals)).toEqual(['2026-10']);
    expect(goals['2026-10'].targetDistance).toBe(150);
  });

  it('preserves id and createdAt when replacing a goal for the same month', () => {
    const first = useGoalStore.getState().saveGoal(INPUT);
    const second = useGoalStore.getState().saveGoal({ ...INPUT, targetDistance: 150 });

    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe(first.createdAt);
  });

  it('keeps goals for other months independent', () => {
    useGoalStore.getState().saveGoal(INPUT);
    useGoalStore.getState().saveGoal({ ...INPUT, monthKey: '2026-11' });

    expect(Object.keys(useGoalStore.getState().goals).sort()).toEqual(['2026-10', '2026-11']);
  });

  it('deletes a goal', () => {
    useGoalStore.getState().saveGoal(INPUT);
    useGoalStore.getState().deleteGoal('2026-10');

    expect(useGoalStore.getState().goals['2026-10']).toBeUndefined();
  });

  it('persists to localStorage and round-trips', async () => {
    useGoalStore.getState().saveGoal(INPUT);

    const raw = memoryStorage.getItem('gorun.goals.v1');
    expect(raw).toContain('2026-10');

    // Clearing in-memory state also rewrites storage, so restore the snapshot.
    useGoalStore.setState({ goals: {} });
    memoryStorage.setItem('gorun.goals.v1', raw as string);
    await useGoalStore.persist.rehydrate();

    expect(useGoalStore.getState().goals['2026-10'].targetDistance).toBe(100);
  });

  it('discards corrupt persisted entries instead of crashing', async () => {
    memoryStorage.setItem(
      'gorun.goals.v1',
      JSON.stringify({
        version: 1,
        state: { goals: { '2026-10': { id: 1, nope: true }, 'not-a-month': {} } },
      })
    );

    await useGoalStore.persist.rehydrate();

    expect(useGoalStore.getState().goals).toEqual({});
    expect(getStorageIssue()).toBe('corrupt-data');
  });

  it('keeps the goal in memory and reports an issue when storage writes fail', () => {
    memoryStorage.shouldThrow = true;

    const goal = useGoalStore.getState().saveGoal(INPUT);

    expect(useGoalStore.getState().goals['2026-10']).toEqual(goal);
    expect(getStorageIssue()).toBe('write-failed');
  });
});
