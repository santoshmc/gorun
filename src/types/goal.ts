export type DistanceUnit = 'km' | 'mi';

/** Calendar month identity in `YYYY-MM` form. */
export type MonthKey = string;

export interface Goal {
  id: string;
  monthKey: MonthKey;
  /** Stored in the unit the runner entered, never silently converted. */
  targetDistance: number;
  unit: DistanceUnit;
  createdAt: string;
  updatedAt: string;
}

export interface GoalInput {
  monthKey: MonthKey;
  targetDistance: number;
  unit: DistanceUnit;
}

export interface GoalFormValues {
  monthKey: MonthKey;
  targetDistance: string;
  unit: DistanceUnit;
}

export type GoalFieldName = 'monthKey' | 'targetDistance';

export type GoalValidationErrors = Partial<Record<GoalFieldName, string>>;

export type GoalValidationResult =
  | { ok: true; value: GoalInput }
  | { ok: false; errors: GoalValidationErrors };
