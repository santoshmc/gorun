import type { DistanceUnit } from '@/types/goal';

export type DistributionStyle = 'even' | 'progressive';
export type TrainingDayType = 'run' | 'rest';

export interface TrainingPlanDay {
  dayNumber: number;
  label: string;
  type: TrainingDayType;
  distance?: number;
}

export interface TrainingWeek {
  weekIndex: number;
  days: TrainingPlanDay[];
  totalDistance: number;
}

export interface TrainingPlan {
  id: string;
  monthKey: string;
  runningDaysPerWeek: 3 | 4 | 5;
  distributionStyle: DistributionStyle;
  createdAt: string;
  updatedAt: string;
  weeks: TrainingWeek[];
}

export interface TrainingPlanInput {
  monthKey: string;
  targetDistance: number;
  unit: DistanceUnit;
  runningDaysPerWeek: 3 | 4 | 5;
  distributionStyle: DistributionStyle;
}
