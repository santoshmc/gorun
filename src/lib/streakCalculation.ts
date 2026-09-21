export function calculateStreak(completedDates: string[]): { current: number; longest: number; lastCompletedDate?: string } {
  const dates = [...new Set(completedDates)].sort();
  let current = 0; let longest = 0;
  for (let index = 0; index < dates.length; index += 1) {
    const previous = index === 0 ? undefined : new Date(`${dates[index - 1]}T00:00:00Z`);
    const currentDate = new Date(`${dates[index]}T00:00:00Z`);
    const consecutive = previous ? (currentDate.getTime() - previous.getTime()) / 86400000 === 1 : false;
    current = consecutive ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return { current, longest, lastCompletedDate: dates[dates.length - 1] };
}