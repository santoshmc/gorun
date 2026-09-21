import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeStorage } from '@/lib/storage';
import type { StreakData } from '@/types/streak';

interface StreakState extends StreakData { recalculate: (dates: string[]) => void; }
export const useStreakStore = create<StreakState>()(persist((set) => ({ current: 0, longest: 0, recalculate: (dates) => { const sorted = [...new Set(dates)].sort(); let current = 0; let longest = 0; sorted.forEach((date, index) => { const previous = index ? new Date(`${sorted[index - 1]}T00:00:00Z`) : undefined; const next = new Date(`${date}T00:00:00Z`); current = previous && (next.getTime() - previous.getTime()) === 86400000 ? current + 1 : 1; longest = Math.max(longest, current); }); set({ current, longest, lastCompletedDate: sorted[sorted.length - 1] }); } }), { name: 'gorun.streak.v1', storage: createJSONStorage(() => safeStorage) }));