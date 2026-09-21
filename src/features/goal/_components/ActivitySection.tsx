import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useActivityStore } from '@/store/activityStore';
import type { ActivityType, ProviderKey } from '@/types/activity';

const providerKeys: ProviderKey[] = ['apple-health', 'google-fit', 'fitbit', 'garmin', 'strava'];

export function ActivitySection() {
  const activities = useActivityStore((state) => state.activities);
  const providers = useActivityStore((state) => state.providers);
  const addActivity = useActivityStore((state) => state.addActivity);
  const importActivities = useActivityStore((state) => state.importActivities);
  const connectProvider = useActivityStore((state) => state.connectProvider);
  const updateActivityType = useActivityStore((state) => state.updateActivityType);
  const [distance, setDistance] = useState('5');
  const [duration, setDuration] = useState('30');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<ActivityType>('run');
  const [provider, setProvider] = useState<ProviderKey>('strava');
  const connected = Object.values(providers).filter((item) => item.connected);

  return <section className="space-y-4 rounded-3xl bg-white/75 p-5 shadow-soft" aria-labelledby="activity-heading">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="activity-heading" className="font-display text-2xl font-bold text-slate-800">Activity log</h2><p className="text-sm text-slate-500">Runs count toward your goal. Every activity stays visible.</p></div><Button onClick={() => addActivity({ occurredAt: date, distanceKm: Number(distance), durationSeconds: Number(duration) * 60, activityType: type })}>Add activity</Button></div>
    <div className="grid gap-3 sm:grid-cols-4"><input aria-label="Activity date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-2xl border-2 border-slate-200 p-2" /><input aria-label="Distance in kilometres" type="number" min="0.1" value={distance} onChange={(event) => setDistance(event.target.value)} className="rounded-2xl border-2 border-slate-200 p-2" /><input aria-label="Duration in minutes" type="number" min="1" value={duration} onChange={(event) => setDuration(event.target.value)} className="rounded-2xl border-2 border-slate-200 p-2" /><select aria-label="Activity type" value={type} onChange={(event) => setType(event.target.value as ActivityType)} className="rounded-2xl border-2 border-slate-200 p-2"><option value="run">Run</option><option value="walk">Walk</option><option value="other">Other</option></select></div>
    <div className="flex flex-wrap items-center gap-2"><select aria-label="Provider" value={provider} onChange={(event) => setProvider(event.target.value as ProviderKey)} className="rounded-full border border-slate-200 px-3 py-2">{providerKeys.map((key) => <option key={key} value={key}>{providers[key].name}</option>)}</select><Button variant="secondary" onClick={() => connectProvider(provider)}>Connect source</Button><Button variant="secondary" onClick={() => { connectProvider(provider); importActivities([{ occurredAt: date, distanceKm: 4.2, durationSeconds: 1500, provider, externalId: `${provider}-${date}`, providerType: 'run' }]); }}>Refresh sample</Button>{connected.length > 0 && <span className="text-sm text-emerald-700">{connected.length} source{connected.length === 1 ? '' : 's'} connected</span>}</div>
    <div className="space-y-2">{activities.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No activities yet.</p> : activities.slice().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).map((activity) => <article key={activity.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3"><div><p className="font-semibold text-slate-800">{activity.distanceKm.toFixed(1)} km <span className="rounded-full bg-pastel-mint px-2 py-1 text-xs">{activity.activityType}</span></p><p className="text-sm text-slate-500">{activity.occurredAt} · {Math.round(activity.durationSeconds / 60)} min · {activity.source}</p></div><select aria-label={`Classify activity on ${activity.occurredAt}`} value={activity.activityType} onChange={(event) => updateActivityType(activity.id, event.target.value as ActivityType)} className="rounded-full border border-slate-200 px-3 py-2 text-sm"><option value="run">Run</option><option value="walk">Walk</option><option value="other">Other</option></select></article>)}</div>
  </section>;
}