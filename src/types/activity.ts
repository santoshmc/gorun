export type ActivityType = 'run' | 'walk' | 'other';
export type ActivitySource = 'manual' | 'imported';
export type ProviderKey = 'apple-health' | 'google-fit' | 'fitbit' | 'garmin' | 'strava';

export interface Activity {
  id: string;
  externalId?: string;
  provider?: ProviderKey;
  occurredAt: string;
  distanceKm: number;
  durationSeconds: number;
  paceMinPerKm: number | null;
  averageSpeedKmh: number | null;
  source: ActivitySource;
  activityType: ActivityType;
  autoDetectedType?: ActivityType;
  isManuallyCorrected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderConnection {
  key: ProviderKey;
  name: string;
  connected: boolean;
  lastSyncAt?: string;
}