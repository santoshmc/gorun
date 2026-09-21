import type { DistanceUnit } from '@/types/goal';

const KM_PER_MILE = 1.609344;

/** Sanity ceiling — beyond this a target is almost certainly a typo. */
const MAX_DISTANCE_KM = 2000;

export function unitLabel(unit: DistanceUnit): string {
  return unit === 'km' ? 'km' : 'mi';
}

export function unitName(unit: DistanceUnit): string {
  return unit === 'km' ? 'kilometres' : 'miles';
}

export function maxTargetDistance(unit: DistanceUnit): number {
  return unit === 'km' ? MAX_DISTANCE_KM : Math.floor(MAX_DISTANCE_KM / KM_PER_MILE);
}

export function toKilometres(value: number, unit: DistanceUnit): number {
  return unit === 'km' ? value : value * KM_PER_MILE;
}

export function formatDistance(value: number, unit: DistanceUnit): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${unitLabel(unit)}`;
}

export const QUICK_PICK_DISTANCES: Record<DistanceUnit, number[]> = {
  km: [50, 100, 150, 200],
  mi: [30, 60, 100, 125],
};
