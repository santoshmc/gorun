/* GoRun — domain logic
 * Pure calculations for goals, plans, activities, progress, streaks,
 * badges, points, friends, challenges and coaching.
 * Canonical distance unit everywhere in here is KILOMETRES.
 */
(function (global) {
  'use strict';

  var GR = global.GR;
  var round1 = GR.round1;
  var pad2 = GR.pad2;
  var uid = GR.uid;

  /* ================================================================ units */

  var KM_PER_MILE = 1.609344;
  var MAX_DISTANCE_KM = 2000;

  function unitLabel(unit) {
    return unit === 'mi' ? 'mi' : 'km';
  }

  function unitName(unit) {
    return unit === 'mi' ? 'miles' : 'kilometres';
  }

  function toKm(value, unit) {
    return unit === 'mi' ? value * KM_PER_MILE : value;
  }

  function fromKm(km, unit) {
    return unit === 'mi' ? km / KM_PER_MILE : km;
  }

  function maxTargetDistance(unit) {
    return unit === 'mi' ? Math.floor(MAX_DISTANCE_KM / KM_PER_MILE) : MAX_DISTANCE_KM;
  }

  /** Formats a canonical km value in the runner's preferred unit. */
  function formatKm(km, unit, options) {
    var opts = options || {};
    var value = fromKm(Number(km) || 0, unit);
    var rounded = Math.round(value * 10) / 10;
    var text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return opts.bare ? text : text + ' ' + unitLabel(unit);
  }

  function numberInUnit(km, unit) {
    return Math.round(fromKm(Number(km) || 0, unit) * 10) / 10;
  }

  var QUICK_PICKS = { km: [50, 100, 150, 200], mi: [30, 60, 100, 125] };

  function formatPace(paceMinPerKm, unit) {
    if (paceMinPerKm === null || paceMinPerKm === undefined || !isFinite(paceMinPerKm)) return null;
    var perUnit = unit === 'mi' ? paceMinPerKm * KM_PER_MILE : paceMinPerKm;
    var minutes = Math.floor(perUnit);
    var seconds = Math.round((perUnit - minutes) * 60);
    if (seconds === 60) {
      minutes += 1;
      seconds = 0;
    }
    return minutes + ':' + pad2(seconds) + ' /' + unitLabel(unit);
  }

  function formatDuration(totalSeconds) {
    var s = Math.max(0, Math.round(Number(totalSeconds) || 0));
    var hours = Math.floor(s / 3600);
    var minutes = Math.floor((s % 3600) / 60);
    var seconds = s % 60;
    if (hours > 0) return hours + 'h ' + pad2(minutes) + 'm';
    if (minutes > 0) return minutes + 'm ' + pad2(seconds) + 's';
    return seconds + 's';
  }

  function parseDurationInput(text) {
    var raw = String(text || '').trim();
    if (!raw) return null;
    if (/^\d+(\.\d+)?$/.test(raw)) return Math.round(Number(raw) * 60);
    var parts = raw.split(':').map(function (p) { return Number(p); });
    if (parts.some(function (p) { return !isFinite(p) || p < 0; })) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  }

  /* =============================================================== months */

  var MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function isValidMonthKey(value) {
    return typeof value === 'string' && MONTH_RE.test(value);
  }

  function toMonthKey(year, month) {
    return year + '-' + pad2(month);
  }

  function parseMonthKey(key) {
    var bits = String(key).split('-');
    return { year: Number(bits[0]), month: Number(bits[1]) };
  }

  function currentMonthKey(now) {
    var d = now || new Date();
    return toMonthKey(d.getFullYear(), d.getMonth() + 1);
  }

  function addMonths(key, amount) {
    var p = parseMonthKey(key);
    var d = new Date(p.year, p.month - 1 + amount, 1);
    return toMonthKey(d.getFullYear(), d.getMonth() + 1);
  }

  function compareMonthKeys(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  function isPastMonth(key, now) {
    return compareMonthKeys(key, currentMonthKey(now)) < 0;
  }

  function daysInMonth(key) {
    var p = parseMonthKey(key);
    return new Date(p.year, p.month, 0).getDate();
  }

  function formatMonthLabel(key, options) {
    var opts = options || {};
    var p = parseMonthKey(key);
    var d = new Date(p.year, p.month - 1, 1);
    return d.toLocaleDateString(undefined, { month: opts.short ? 'short' : 'long', year: 'numeric' });
  }

  function selectableMonths(count, now) {
    var total = count || 12;
    var start = currentMonthKey(now);
    var list = [];
    for (var i = 0; i < total; i += 1) list.push(addMonths(start, i));
    return list;
  }

  function toDateKey(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  function parseDateKey(key) {
    var bits = String(key).split('-');
    return new Date(Number(bits[0]), Number(bits[1]) - 1, Number(bits[2]));
  }

  function todayKey(now) {
    return toDateKey(now || new Date());
  }

  function monthOfDate(dateKey) {
    return String(dateKey).slice(0, 7);
  }

  function addDays(dateKey, amount) {
    var d = parseDateKey(dateKey);
    d.setDate(d.getDate() + amount);
    return toDateKey(d);
  }

  function formatDayLabel(dateKey) {
    return parseDateKey(dateKey).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function weekdayShort(dateKey) {
    return parseDateKey(dateKey).toLocaleDateString(undefined, { weekday: 'short' });
  }

  function isValidDateKey(value) {
    if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
    var d = parseDateKey(value);
    return toDateKey(d) === value;
  }

  /* =========================================================== validation */

  var AT_MOST_ONE_DECIMAL = /^\d+(\.\d)?$/;

  function validateGoalInput(values, now) {
    var errors = {};

    if (!isValidMonthKey(values.monthKey)) {
      errors.monthKey = 'Pick a month for your goal.';
    } else if (isPastMonth(values.monthKey, now)) {
      errors.monthKey = 'That month has already finished. Pick this month or a future one.';
    }

    var raw = String(values.targetDistance == null ? '' : values.targetDistance).trim();
    var max = maxTargetDistance(values.unit);

    if (raw === '') {
      errors.targetDistance = 'Enter how far you want to run.';
    } else if (!AT_MOST_ONE_DECIMAL.test(raw)) {
      errors.targetDistance = 'Use a positive number with at most one decimal place.';
    } else if (Number(raw) <= 0) {
      errors.targetDistance = 'Your target needs to be more than zero.';
    } else if (Number(raw) > max) {
      errors.targetDistance = 'That looks like a typo — keep it under ' + max + ' ' + unitLabel(values.unit) + '.';
    }

    if (Object.keys(errors).length) return { ok: false, errors: errors };

    return {
      ok: true,
      value: { monthKey: values.monthKey, targetKm: round1(toKm(Number(raw), values.unit)), unit: values.unit }
    };
  }

  function validateActivityInput(values, unit) {
    var errors = {};

    if (!isValidDateKey(values.date)) {
      errors.date = 'Pick the date you ran.';
    } else if (values.date > todayKey()) {
      errors.date = 'That date is in the future.';
    }

    var distance = Number(values.distance);
    if (String(values.distance || '').trim() === '') errors.distance = 'How far did you go?';
    else if (!isFinite(distance) || distance <= 0) errors.distance = 'Distance must be more than zero.';
    else if (distance > maxTargetDistance(unit)) errors.distance = 'That distance looks like a typo.';

    var seconds = parseDurationInput(values.duration);
    if (String(values.duration || '').trim() === '') errors.duration = 'How long did it take?';
    else if (seconds === null || seconds <= 0) errors.duration = 'Use mm:ss, hh:mm:ss, or minutes.';
    else if (seconds > 24 * 3600) errors.duration = 'That is longer than a day.';

    if (Object.keys(errors).length) return { ok: false, errors: errors };

    return {
      ok: true,
      value: {
        date: values.date,
        distanceKm: round1(toKm(distance, unit)),
        durationSec: seconds,
        type: values.type || 'run'
      }
    };
  }

  /* ======================================================== training plan */

  var RUN_DAY_PATTERNS = { 3: [1, 3, 5], 4: [1, 2, 4, 6], 5: [1, 2, 3, 5, 6] };
  var PROGRESSIVE_WEIGHTS = [0.85, 1.0, 1.1, 1.25, 1.8];

  var DISTRIBUTION_STYLES = [
    { key: 'even', name: 'Even split', blurb: 'Same distance every run day — steady and predictable.' },
    { key: 'progressive', name: 'Long run build', blurb: 'Shorter mid-week runs, one longer run to finish the week.' }
  ];

  /** Splits a month into 4 blocks: days 1-7, 8-14, 15-21, 22-end. */
  function monthWeekBlocks(monthKey) {
    var total = daysInMonth(monthKey);
    var blocks = [];
    for (var i = 0; i < 4; i += 1) {
      var startDay = i * 7 + 1;
      var endDay = i === 3 ? total : Math.min(total, startDay + 6);
      var dates = [];
      for (var day = startDay; day <= endDay; day += 1) dates.push(monthKey + '-' + pad2(day));
      blocks.push({ index: i + 1, dates: dates });
    }
    return blocks;
  }

  function weekTotal(week) {
    return round1(
      week.days.reduce(function (sum, day) {
        return sum + (day.type === 'run' ? day.distanceKm || 0 : 0);
      }, 0)
    );
  }

  function planTotals(plan) {
    var weeklyTotals = plan.weeks.map(weekTotal);
    return {
      weeklyTotals: weeklyTotals,
      monthlyTotal: round1(
        weeklyTotals.reduce(function (sum, t) {
          return sum + t;
        }, 0)
      )
    };
  }

  function generatePlan(input) {
    var monthKey = input.monthKey;
    var targetKm = input.targetKm;
    var runDays = input.runDaysPerWeek;
    var style = input.style === 'progressive' ? 'progressive' : 'even';
    var now = new Date().toISOString();

    var blocks = monthWeekBlocks(monthKey);
    var weeklyTargetKm = targetKm / blocks.length;
    var pattern = RUN_DAY_PATTERNS[runDays] || RUN_DAY_PATTERNS[3];
    var weights = PROGRESSIVE_WEIGHTS.slice(0, runDays);
    var weightSum = weights.reduce(function (a, b) { return a + b; }, 0);

    var weeks = blocks.map(function (block) {
      var days = block.dates.map(function (date, offset) {
        var runIndex = pattern.indexOf(offset);
        var isRun = runIndex !== -1 && offset < 7;
        if (!isRun) return { date: date, label: weekdayShort(date), type: 'rest' };
        var distanceKm =
          style === 'progressive'
            ? (weeklyTargetKm * weights[runIndex]) / weightSum
            : weeklyTargetKm / runDays;
        return { date: date, label: weekdayShort(date), type: 'run', distanceKm: round1(distanceKm) };
      });
      var week = { index: block.index, startDate: block.dates[0], endDate: block.dates[block.dates.length - 1], days: days };
      week.totalKm = weekTotal(week);
      return week;
    });

    var plan = {
      id: uid('plan'),
      monthKey: monthKey,
      runDaysPerWeek: runDays,
      style: style,
      targetKm: targetKm,
      createdAt: now,
      updatedAt: now,
      mismatchAccepted: false,
      customised: false,
      weeks: weeks
    };

    // Absorb rounding drift on the final run day so the plan matches the goal exactly.
    var drift = round1(targetKm - planTotals(plan).monthlyTotal);
    if (Math.abs(drift) > 0.05) {
      var lastWeek = plan.weeks[plan.weeks.length - 1];
      for (var i = lastWeek.days.length - 1; i >= 0; i -= 1) {
        if (lastWeek.days[i].type === 'run') {
          lastWeek.days[i].distanceKm = round1(Math.max(0.1, lastWeek.days[i].distanceKm + drift));
          break;
        }
      }
      lastWeek.totalKm = weekTotal(lastWeek);
    }

    return plan;
  }

  function regeneratePlan(plan) {
    return generatePlan({
      monthKey: plan.monthKey,
      targetKm: plan.targetKm,
      runDaysPerWeek: plan.runDaysPerWeek,
      style: plan.style
    });
  }

  function planMismatch(plan, targetKm) {
    var totals = planTotals(plan);
    var diff = round1(totals.monthlyTotal - targetKm);
    return {
      isMismatch: Math.abs(diff) > 0.1,
      difference: diff,
      planned: totals.monthlyTotal,
      target: targetKm,
      weeklyTotals: totals.weeklyTotals
    };
  }

  function findDay(plan, date) {
    for (var w = 0; w < plan.weeks.length; w += 1) {
      var days = plan.weeks[w].days;
      for (var d = 0; d < days.length; d += 1) {
        if (days[d].date === date) return { week: plan.weeks[w], weekIndex: w, day: days[d], dayIndex: d };
      }
    }
    return null;
  }

  function setDayDistance(plan, date, distanceKm) {
    var next = GR.deepClone(plan);
    var hit = findDay(next, date);
    if (!hit) return plan;
    var value = isFinite(distanceKm) ? Math.max(0, Number(distanceKm)) : 0;
    hit.day.type = 'run';
    hit.day.distanceKm = round1(value);
    next.weeks[hit.weekIndex].totalKm = weekTotal(next.weeks[hit.weekIndex]);
    next.updatedAt = new Date().toISOString();
    next.customised = true;
    return next;
  }

  function toggleDayType(plan, date) {
    var next = GR.deepClone(plan);
    var hit = findDay(next, date);
    if (!hit) return plan;
    if (hit.day.type === 'run') {
      hit.day.lastDistanceKm = hit.day.distanceKm;
      hit.day.type = 'rest';
      delete hit.day.distanceKm;
    } else {
      hit.day.type = 'run';
      hit.day.distanceKm = round1(hit.day.lastDistanceKm || 5);
    }
    next.weeks[hit.weekIndex].totalKm = weekTotal(next.weeks[hit.weekIndex]);
    next.updatedAt = new Date().toISOString();
    next.customised = true;
    return next;
  }

  /** Moves a planned run (with its distance) onto another date, swapping states. */
  function moveDay(plan, fromDate, toDate) {
    if (fromDate === toDate) return plan;
    var next = GR.deepClone(plan);
    var from = findDay(next, fromDate);
    var to = findDay(next, toDate);
    if (!from || !to || from.day.type !== 'run') return plan;

    var distance = from.day.distanceKm;
    from.day.type = 'rest';
    delete from.day.distanceKm;
    to.day.type = 'run';
    to.day.distanceKm = round1(distance);

    next.weeks[from.weekIndex].totalKm = weekTotal(next.weeks[from.weekIndex]);
    next.weeks[to.weekIndex].totalKm = weekTotal(next.weeks[to.weekIndex]);
    next.updatedAt = new Date().toISOString();
    next.customised = true;
    return next;
  }

  function planRunDays(plan) {
    var out = [];
    plan.weeks.forEach(function (week) {
      week.days.forEach(function (day) {
        if (day.type === 'run') out.push(day);
      });
    });
    return out;
  }

  /* ============================================================ providers */

  var PROVIDERS = [
    { key: 'apple-health', name: 'Apple Health', accent: 'salmon', scopes: ['Workouts', 'Distance'] },
    { key: 'google-fit', name: 'Google Fit', accent: 'periwinkle', scopes: ['Activity', 'Location'] },
    { key: 'fitbit', name: 'Fitbit', accent: 'cyan', scopes: ['Activity', 'Heart rate'] },
    { key: 'garmin', name: 'Garmin Connect', accent: 'green', scopes: ['Activities', 'Metrics'] },
    { key: 'strava', name: 'Strava', accent: 'coral', scopes: ['activity:read', 'profile:read'] }
  ];

  function providerByKey(key) {
    return (
      PROVIDERS.filter(function (p) {
        return p.key === key;
      })[0] || null
    );
  }

  /* =========================================================== activities */

  var ACTIVITY_TYPES = [
    { key: 'run', name: 'Run', icon: 'run', accent: 'salmon' },
    { key: 'walk', name: 'Walk', icon: 'walk', accent: 'periwinkle' },
    { key: 'other', name: 'Other', icon: 'bike', accent: 'lavender' }
  ];

  /** Provider label wins; pace is the fallback signal. */
  function classifyActivity(input) {
    var label = String(input.providerType || '').toLowerCase();
    if (label.indexOf('run') !== -1 || label.indexOf('jog') !== -1) return 'run';
    if (label.indexOf('walk') !== -1 || label.indexOf('hike') !== -1) return 'walk';
    if (label && (label.indexOf('cycl') !== -1 || label.indexOf('bike') !== -1 || label.indexOf('swim') !== -1)) return 'other';
    var pace = input.paceMinPerKm;
    if (typeof pace === 'number' && isFinite(pace)) return pace <= 8 ? 'run' : 'walk';
    return 'other';
  }

  function calculatePace(distanceKm, durationSec) {
    return distanceKm > 0 && durationSec > 0 ? durationSec / 60 / distanceKm : null;
  }

  function calculateSpeed(distanceKm, durationSec) {
    return distanceKm > 0 && durationSec > 0 ? distanceKm / (durationSec / 3600) : null;
  }

  function buildActivity(input) {
    var now = new Date().toISOString();
    var distanceKm = round1(input.distanceKm);
    var durationSec = Math.round(input.durationSec);
    var pace = calculatePace(distanceKm, durationSec);
    var autoType = input.type || classifyActivity({ providerType: input.providerType, paceMinPerKm: pace });

    return {
      id: uid('act'),
      externalId: input.externalId || null,
      provider: input.provider || null,
      providerType: input.providerType || null,
      date: input.date,
      distanceKm: distanceKm,
      durationSec: durationSec,
      paceMinPerKm: pace,
      speedKmh: calculateSpeed(distanceKm, durationSec),
      strideM: input.strideM === undefined ? null : input.strideM,
      elevationM: input.elevationM === undefined ? null : input.elevationM,
      source: input.source || 'manual',
      type: autoType,
      autoType: autoType,
      corrected: false,
      createdAt: now,
      updatedAt: now
    };
  }

  /** Cross-source identity: same day, same distance, same duration is the same run. */
  function dedupeKey(activity) {
    return [activity.date, Math.round(activity.distanceKm * 10), Math.round(activity.durationSec / 30)].join('|');
  }

  function isDuplicate(candidate, existing) {
    return existing.some(function (a) {
      if (candidate.provider && a.provider === candidate.provider && a.externalId && a.externalId === candidate.externalId) return true;
      return dedupeKey(a) === dedupeKey(candidate);
    });
  }

  /** Deterministic PRNG so a re-sync returns the same activities (and thus de-dupes). */
  function seededRandom(seed) {
    var value = 0;
    for (var i = 0; i < seed.length; i += 1) value = (value * 31 + seed.charCodeAt(i)) >>> 0;
    return function () {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  /**
   * The runs that actually happened in a month, independent of who recorded them.
   * Seeded by month alone so every provider reports the same underlying sessions.
   */
  function groundTruthMonth(monthKey, now) {
    var rand = seededRandom('truth:' + monthKey);
    var total = daysInMonth(monthKey);
    var today = todayKey(now);
    var sessions = [];

    for (var day = 1; day <= total; day += 1) {
      var date = monthKey + '-' + pad2(day);
      if (date > today) break;
      if (rand() > 0.62) continue;

      var isWalk = rand() > 0.75;
      var distanceKm = isWalk ? round1(2 + rand() * 3) : round1(4.5 + rand() * 6);
      var paceTarget = isWalk ? 10 + rand() * 3 : 5 + rand() * 2.4;

      sessions.push({
        date: date,
        isWalk: isWalk,
        distanceKm: distanceKm,
        durationSec: Math.round(distanceKm * paceTarget * 60),
        strideM: round1(0.7 + rand() * 0.8),
        elevationM: Math.round(rand() * 180)
      });
    }

    return sessions;
  }

  /**
   * Produces a plausible activity feed for a provider + month.
   * Stands in for a real OAuth sync, which a no-backend app cannot perform.
   * Providers see overlapping subsets of the same sessions, so importing from
   * two sources exercises de-duplication exactly as a real sync would.
   */
  function fetchProviderActivities(providerKey, monthKey, now) {
    var provider = providerByKey(providerKey);
    if (!provider) return [];
    var pick = seededRandom('pick:' + providerKey + ':' + monthKey);
    var supportsRichMetrics = providerKey !== 'apple-health';

    return groundTruthMonth(monthKey, now)
      .filter(function () {
        return pick() < 0.8;
      })
      .map(function (session) {
        return {
          externalId: providerKey + '-' + session.date + '-' + (session.isWalk ? 'w' : 'r'),
          provider: providerKey,
          providerType: session.isWalk ? 'Walk' : 'Run',
          date: session.date,
          distanceKm: session.distanceKm,
          durationSec: session.durationSec,
          strideM: supportsRichMetrics ? session.strideM : null,
          elevationM: supportsRichMetrics ? session.elevationM : null,
          source: 'imported'
        };
      });
  }

  function runActivities(activities) {
    return activities.filter(function (a) {
      return a.type === 'run';
    });
  }

  function activitiesInMonth(activities, monthKey) {
    return activities.filter(function (a) {
      return monthOfDate(a.date) === monthKey;
    });
  }

  function runKmBetween(activities, fromDate, toDate) {
    return round1(
      runActivities(activities)
        .filter(function (a) {
          return (!fromDate || a.date >= fromDate) && (!toDate || a.date <= toDate);
        })
        .reduce(function (sum, a) {
          return sum + a.distanceKm;
        }, 0)
    );
  }

  function runKmOnDate(activities, date) {
    return runKmBetween(activities, date, date);
  }

  /* ============================================================= progress */

  function dailyCompletion(day, activities) {
    var actualKm = runKmOnDate(activities, day.date);
    var plannedKm = day.type === 'run' ? day.distanceKm || 0 : 0;
    var isRest = day.type === 'rest';
    return {
      date: day.date,
      label: day.label,
      isRest: isRest,
      plannedKm: plannedKm,
      actualKm: actualKm,
      complete: isRest ? actualKm > 0 : actualKm + 0.05 >= plannedKm && plannedKm > 0,
      shortfallKm: isRest ? 0 : round1(Math.max(0, plannedKm - actualKm)),
      isFuture: day.date > todayKey(),
      isToday: day.date === todayKey()
    };
  }

  function weekProgress(week, activities) {
    var rows = week.days.map(function (day) {
      return dailyCompletion(day, activities);
    });
    var plannedKm = round1(
      rows.reduce(function (sum, r) {
        return sum + r.plannedKm;
      }, 0)
    );
    var actualKm = runKmBetween(activities, week.startDate, week.endDate);
    var today = todayKey();
    var runRows = rows.filter(function (r) {
      return !r.isRest;
    });

    return {
      index: week.index,
      startDate: week.startDate,
      endDate: week.endDate,
      rows: rows,
      plannedKm: plannedKm,
      actualKm: actualKm,
      remainingKm: round1(Math.max(0, plannedKm - actualKm)),
      percent: plannedKm > 0 ? Math.min(999, Math.round((actualKm / plannedKm) * 100)) : 0,
      isComplete: week.endDate < today,
      isCurrent: week.startDate <= today && week.endDate >= today,
      achieved: actualKm + 0.05 >= plannedKm && plannedKm > 0,
      daysComplete: runRows.filter(function (r) { return r.complete; }).length,
      daysPlanned: runRows.length
    };
  }

  function monthProgress(goal, activities, now) {
    var monthKey = goal.monthKey;
    var targetKm = goal.targetKm;
    var lastDay = monthKey + '-' + pad2(daysInMonth(monthKey));
    var actualKm = runKmBetween(activities, monthKey + '-01', lastDay);
    var today = todayKey(now);
    var isCurrent = monthKey === currentMonthKey(now);
    var isPast = compareMonthKeys(monthKey, currentMonthKey(now)) < 0;

    var daysLeft = 0;
    if (isCurrent) daysLeft = daysInMonth(monthKey) - parseDateKey(today).getDate() + 1;
    else if (!isPast) daysLeft = daysInMonth(monthKey);

    var remainingKm = round1(Math.max(0, targetKm - actualKm));

    return {
      monthKey: monthKey,
      targetKm: targetKm,
      actualKm: actualKm,
      remainingKm: remainingKm,
      percent: targetKm > 0 ? Math.round((actualKm / targetKm) * 100) : 0,
      daysLeft: daysLeft,
      dailyAverageNeededKm: daysLeft > 0 ? round1(remainingKm / daysLeft) : remainingKm,
      achieved: actualKm + 0.05 >= targetKm,
      isPast: isPast,
      isCurrent: isCurrent
    };
  }

  /* ============================================================== streaks */

  /**
   * Consecutive completed planned run days. Rest days are neutral.
   * Recomputed from scratch after any activity change so corrections apply retroactively.
   */
  function calculateStreak(plans, activities, now) {
    var today = todayKey(now);
    var days = [];

    Object.keys(plans)
      .sort()
      .forEach(function (monthKey) {
        plans[monthKey].weeks.forEach(function (week) {
          week.days.forEach(function (day) {
            if (day.type === 'run' && day.date <= today) days.push(day);
          });
        });
      });

    days.sort(function (a, b) {
      return a.date < b.date ? -1 : 1;
    });

    var current = 0;
    var longest = 0;
    var lastDate = null;

    days.forEach(function (day) {
      var done = runKmOnDate(activities, day.date) + 0.05 >= (day.distanceKm || 0);
      if (done) {
        current += 1;
        lastDate = day.date;
        if (current > longest) longest = current;
      } else if (day.date < today) {
        current = 0;
      }
    });

    return { current: current, longest: longest, lastDate: lastDate, plannedDaysSoFar: days.length };
  }

  /* =============================================================== badges */

  var BADGES = [
    { id: 'first-steps', name: 'First Steps', icon: 'run', accent: 'salmon', criteria: 'Log your first run.' },
    { id: 'plan-maker', name: 'Plan Maker', icon: 'calendar', accent: 'periwinkle', criteria: 'Generate a training plan.' },
    { id: 'week-warrior', name: 'Week Warrior', icon: 'check', accent: 'green', criteria: 'Complete every planned run in a week.' },
    { id: 'month-master', name: 'Month Master', icon: 'target', accent: 'yellow', criteria: 'Reach a monthly distance goal.' },
    { id: 'streak-3', name: 'Warming Up', icon: 'flame', accent: 'coral', criteria: 'Hit a 3-day run streak.' },
    { id: 'streak-7', name: 'On Fire', icon: 'flame', accent: 'salmon', criteria: 'Hit a 7-day run streak.' },
    { id: 'streak-14', name: 'Unstoppable', icon: 'flame', accent: 'pink', criteria: 'Hit a 14-day run streak.' },
    { id: 'distance-50', name: 'Half Century', icon: 'ruler', accent: 'cyan', criteria: 'Run 50 km in total.' },
    { id: 'distance-100', name: 'Centurion', icon: 'mountain', accent: 'lavender', criteria: 'Run 100 km in total.' },
    { id: 'distance-250', name: 'Long Hauler', icon: 'trophy', accent: 'yellow', criteria: 'Run 250 km in total.' },
    { id: 'social-starter', name: 'Better Together', icon: 'users', accent: 'periwinkle', criteria: 'Have a friend accept your invite.' },
    { id: 'challenger', name: 'Challenger', icon: 'flag', accent: 'green', criteria: 'Complete a community challenge.' }
  ];

  function badgeById(id) {
    return (
      BADGES.filter(function (b) {
        return b.id === id;
      })[0] || null
    );
  }

  /** Deterministic: recomputed from current state, so corrections can revoke a badge. */
  function evaluateBadges(state, derived) {
    var earned = {};
    var activities = state.activities;
    var runs = runActivities(activities);
    var lifetimeKm = round1(
      runs.reduce(function (sum, a) {
        return sum + a.distanceKm;
      }, 0)
    );

    if (runs.length > 0) earned['first-steps'] = true;
    if (Object.keys(state.plans).length > 0) earned['plan-maker'] = true;

    Object.keys(state.plans).forEach(function (monthKey) {
      state.plans[monthKey].weeks.forEach(function (week) {
        var wp = weekProgress(week, activities);
        if (wp.daysPlanned > 0 && wp.daysComplete === wp.daysPlanned) earned['week-warrior'] = true;
      });
    });

    Object.keys(state.goals).forEach(function (monthKey) {
      var mp = monthProgress(state.goals[monthKey], activities);
      if (mp.achieved) earned['month-master'] = true;
    });

    if (derived.streak.longest >= 3) earned['streak-3'] = true;
    if (derived.streak.longest >= 7) earned['streak-7'] = true;
    if (derived.streak.longest >= 14) earned['streak-14'] = true;

    if (lifetimeKm >= 50) earned['distance-50'] = true;
    if (lifetimeKm >= 100) earned['distance-100'] = true;
    if (lifetimeKm >= 250) earned['distance-250'] = true;

    if (
      state.friends.some(function (f) {
        return f.status === 'accepted';
      })
    ) {
      earned['social-starter'] = true;
    }

    if (
      derived.challenges.some(function (c) {
        return c.joined && c.completed;
      })
    ) {
      earned['challenger'] = true;
    }

    return earned;
  }

  /* =============================================================== points */

  var POINTS_RULE = {
    perKm: 10,
    plannedDayBonus: 50,
    weekBonus: 150,
    monthBonus: 500,
    description: '10 points per verified run kilometre, +50 for each planned day completed, +150 per full week, +500 when a monthly goal is reached. Walks and other activities earn nothing.'
  };

  function calculatePoints(state) {
    var activities = state.activities;
    var ledger = [];

    runActivities(activities)
      .slice()
      .sort(function (a, b) {
        return a.date < b.date ? -1 : 1;
      })
      .forEach(function (activity) {
        ledger.push({
          id: 'pts-run-' + activity.id,
          date: activity.date,
          label: 'Run · ' + round1(activity.distanceKm) + ' km',
          points: Math.round(activity.distanceKm * POINTS_RULE.perKm),
          kind: 'run'
        });
      });

    Object.keys(state.plans)
      .sort()
      .forEach(function (monthKey) {
        var plan = state.plans[monthKey];
        plan.weeks.forEach(function (week) {
          var wp = weekProgress(week, activities);
          wp.rows.forEach(function (row) {
            if (!row.isRest && row.complete) {
              ledger.push({
                id: 'pts-day-' + row.date,
                date: row.date,
                label: 'Planned day completed',
                points: POINTS_RULE.plannedDayBonus,
                kind: 'bonus'
              });
            }
          });
          if (wp.daysPlanned > 0 && wp.daysComplete === wp.daysPlanned) {
            ledger.push({
              id: 'pts-week-' + monthKey + '-' + week.index,
              date: week.endDate,
              label: 'Week ' + week.index + ' cleared',
              points: POINTS_RULE.weekBonus,
              kind: 'bonus'
            });
          }
        });
      });

    Object.keys(state.goals)
      .sort()
      .forEach(function (monthKey) {
        var mp = monthProgress(state.goals[monthKey], activities);
        if (mp.achieved) {
          ledger.push({
            id: 'pts-month-' + monthKey,
            date: monthKey + '-' + pad2(daysInMonth(monthKey)),
            label: formatMonthLabel(monthKey, { short: true }) + ' goal reached',
            points: POINTS_RULE.monthBonus,
            kind: 'bonus'
          });
        }
      });

    ledger.sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });

    return {
      balance: ledger.reduce(function (sum, entry) {
        return sum + entry.points;
      }, 0),
      ledger: ledger
    };
  }

  var REWARDS = [
    { id: 'shoe-discount', name: '15% off running shoes', partner: 'Stride Co.', cost: 2500, accent: 'salmon' },
    { id: 'gel-pack', name: 'Free energy gel 6-pack', partner: 'FuelUp', cost: 1200, accent: 'yellow' },
    { id: 'race-entry', name: '£10 off a 10K race entry', partner: 'CityRuns', cost: 4000, accent: 'periwinkle' },
    { id: 'socks', name: 'Technical running socks', partner: 'Stride Co.', cost: 800, accent: 'green' },
    { id: 'coaching', name: '1:1 coaching session', partner: 'CoachLab', cost: 8000, accent: 'lavender' }
  ];

  /* ============================================== friends & leaderboard */

  var FRIEND_SEEDS = [
    { name: 'Maya Patel', hue: 12 },
    { name: 'Tom Okafor', hue: 210 },
    { name: 'Lena Fischer', hue: 48 },
    { name: 'Raj Mehta', hue: 150 },
    { name: 'Chloe Dubois', hue: 320 },
    { name: 'Sam Whitfield', hue: 265 }
  ];

  function makeFriend(name, status) {
    var seed = seededRandom('friend:' + name);
    var hue = Math.round(seed() * 360);
    return {
      id: uid('friend'),
      name: name,
      hue: hue,
      status: status || 'sent',
      invitedAt: new Date().toISOString(),
      acceptedAt: status === 'accepted' ? new Date().toISOString() : null,
      weeklyKm: round1(8 + seed() * 34),
      monthlyKm: round1(35 + seed() * 120)
    };
  }

  function buildLeaderboard(state, period, now) {
    var today = todayKey(now);
    var monthKey = currentMonthKey(now);
    var rows = [];

    var selfKm;
    if (period === 'week') {
      var start = addDays(today, -6);
      selfKm = runKmBetween(state.activities, start, today);
    } else {
      selfKm = runKmBetween(state.activities, monthKey + '-01', monthKey + '-' + pad2(daysInMonth(monthKey)));
    }

    state.friends
      .filter(function (f) {
        return f.status === 'accepted';
      })
      .forEach(function (friend) {
        rows.push({
          id: friend.id,
          name: friend.name,
          hue: friend.hue,
          km: period === 'week' ? friend.weeklyKm : friend.monthlyKm,
          isSelf: false
        });
      });

    rows.push({ id: 'self', name: 'You', hue: 8, km: selfKm, isSelf: true, optedOut: state.settings.leaderboardOptOut });

    rows.sort(function (a, b) {
      return b.km - a.km;
    });
    rows.forEach(function (row, index) {
      row.rank = index + 1;
    });

    return rows;
  }

  /* =========================================================== challenges */

  function challengeCatalogue(now) {
    var monthKey = currentMonthKey(now);
    var lastDay = daysInMonth(monthKey);
    return [
      {
        id: 'monthly-100',
        name: '100 km Club',
        blurb: 'Run 100 kilometres before the month is out.',
        goalKm: 100,
        accent: 'salmon',
        icon: 'target',
        participants: 1284,
        startDate: monthKey + '-01',
        endDate: monthKey + '-' + pad2(lastDay)
      },
      {
        id: 'weekend-warrior',
        name: 'Weekend Warrior',
        blurb: 'Clock 25 km across the weekends this month.',
        goalKm: 25,
        accent: 'periwinkle',
        icon: 'flag',
        participants: 642,
        startDate: monthKey + '-01',
        endDate: monthKey + '-' + pad2(lastDay),
        weekendsOnly: true
      },
      {
        id: 'daily-dash',
        name: 'Daily Dash',
        blurb: 'A 5 km-a-day habit — 50 km over the month.',
        goalKm: 50,
        accent: 'green',
        icon: 'flame',
        participants: 2310,
        startDate: monthKey + '-01',
        endDate: monthKey + '-' + pad2(lastDay)
      },
      {
        id: 'hill-hunters',
        name: 'Hill Hunters',
        blurb: 'Chase 75 km of running, elevation optional but encouraged.',
        goalKm: 75,
        accent: 'lavender',
        icon: 'mountain',
        participants: 418,
        startDate: monthKey + '-01',
        endDate: monthKey + '-' + pad2(lastDay)
      }
    ];
  }

  function isWeekend(dateKey) {
    var dow = parseDateKey(dateKey).getDay();
    return dow === 0 || dow === 6;
  }

  function evaluateChallenges(state, now) {
    var today = todayKey(now);
    return challengeCatalogue(now).map(function (challenge) {
      var joinedRecord = state.challenges[challenge.id] || null;
      // Contribution spans the whole challenge window, not just the time since joining,
      // so a runner who joins mid-month still sees where they stand.
      var relevant = runActivities(state.activities).filter(function (a) {
        if (a.date < challenge.startDate || a.date > challenge.endDate) return false;
        if (challenge.weekendsOnly && !isWeekend(a.date)) return false;
        return true;
      });
      var contributedKm = round1(
        relevant.reduce(function (sum, a) {
          return sum + a.distanceKm;
        }, 0)
      );
      var daysLeft = Math.max(0, Math.round((parseDateKey(challenge.endDate) - parseDateKey(today)) / 86400000));

      return Object.assign({}, challenge, {
        joined: !!joinedRecord,
        joinedAt: joinedRecord ? joinedRecord.joinedAt : null,
        contributedKm: contributedKm,
        percent: Math.min(100, Math.round((contributedKm / challenge.goalKm) * 100)),
        completed: contributedKm + 0.05 >= challenge.goalKm,
        daysLeft: daysLeft,
        standings: challengeStandings(challenge, contributedKm, state)
      });
    });
  }

  function challengeStandings(challenge, selfKm, state) {
    var rand = seededRandom('standings:' + challenge.id);
    var rows = FRIEND_SEEDS.slice(0, 5).map(function (seed) {
      return { name: seed.name, km: round1(challenge.goalKm * (0.25 + rand() * 0.9)), isSelf: false, hue: seed.hue };
    });
    rows.push({ name: 'You', km: selfKm, isSelf: true, hue: 8, optedOut: state.settings.leaderboardOptOut });
    rows.sort(function (a, b) {
      return b.km - a.km;
    });
    rows.forEach(function (row, index) {
      row.rank = index + 1;
    });
    return rows;
  }

  /* =========================================================== motivation */

  /** Context-aware coaching copy. Pure: same state in, same message out. */
  function coachingMessage(context) {
    var unit = context.unit;
    var month = context.month;
    var today = context.today;
    var streak = context.streak;

    if (!context.hasGoal) {
      return {
        tone: 'invite',
        icon: 'sparkle',
        title: 'Every plan starts with a number',
        body: 'Set a distance goal for the month and GoRun will build the weekly schedule around it.'
      };
    }

    if (!context.hasPlan) {
      return {
        tone: 'invite',
        icon: 'calendar',
        title: 'Turn that goal into a schedule',
        body: 'Generate a training plan and you will know exactly what to run each day.'
      };
    }

    if (today && today.complete && !today.isRest) {
      return {
        tone: 'celebrate',
        icon: 'sparkle',
        title: 'Today is in the bag',
        body:
          'You have run ' + formatKm(today.actualKm, unit) + ' today and you are ' + month.percent +
          '% of the way to your ' + formatKm(month.targetKm, unit) + ' month.' +
          (streak.current > 1 ? ' That is ' + streak.current + ' planned days in a row.' : '')
      };
    }

    if (today && today.isRest) {
      return {
        tone: 'calm',
        icon: 'rest',
        title: 'Rest day — take it',
        body:
          'Recovery is part of the plan. ' +
          (month.remainingKm > 0
            ? formatKm(month.remainingKm, unit) + ' left this month, averaging ' + formatKm(month.dailyAverageNeededKm, unit) + ' a day.'
            : 'You have already cleared your monthly target.')
      };
    }

    if (context.missedYesterday) {
      var catchUp = context.missedYesterday.shortfallKm;
      return {
        tone: 'nudge',
        icon: 'refresh',
        title: 'Yesterday slipped — no drama',
        body:
          'You were ' + formatKm(catchUp, unit) + ' short. Add ' + formatKm(round1(catchUp / 2), unit) +
          ' to each of your next two runs and you are level again.'
      };
    }

    if (today && !today.isRest && today.plannedKm > 0) {
      return {
        tone: 'push',
        icon: 'run',
        title: formatKm(today.plannedKm, unit) + ' on the plan today',
        body:
          (streak.current > 0
            ? 'Keep the ' + streak.current + '-day streak alive. '
            : 'A good day to start a streak. ') +
          formatKm(month.remainingKm, unit) + ' still to go this month.'
      };
    }

    if (month.achieved) {
      return {
        tone: 'celebrate',
        icon: 'trophy',
        title: 'Monthly goal cleared',
        body: 'You have run ' + formatKm(month.actualKm, unit) + ' against a ' + formatKm(month.targetKm, unit) + ' target. Anything now is a bonus.'
      };
    }

    return {
      tone: 'push',
      icon: 'chart',
      title: 'Nothing scheduled today',
      body:
        formatKm(month.remainingKm, unit) + ' left this month across ' + month.daysLeft +
        ' days — about ' + formatKm(month.dailyAverageNeededKm, unit) + ' a day.'
    };
  }

  /* =============================================================== export */

  GR.domain = {
    KM_PER_MILE: KM_PER_MILE,
    unitLabel: unitLabel,
    unitName: unitName,
    toKm: toKm,
    fromKm: fromKm,
    formatKm: formatKm,
    numberInUnit: numberInUnit,
    maxTargetDistance: maxTargetDistance,
    QUICK_PICKS: QUICK_PICKS,
    formatPace: formatPace,
    formatDuration: formatDuration,
    parseDurationInput: parseDurationInput,

    isValidMonthKey: isValidMonthKey,
    toMonthKey: toMonthKey,
    parseMonthKey: parseMonthKey,
    currentMonthKey: currentMonthKey,
    addMonths: addMonths,
    compareMonthKeys: compareMonthKeys,
    isPastMonth: isPastMonth,
    daysInMonth: daysInMonth,
    formatMonthLabel: formatMonthLabel,
    selectableMonths: selectableMonths,
    toDateKey: toDateKey,
    parseDateKey: parseDateKey,
    todayKey: todayKey,
    monthOfDate: monthOfDate,
    addDays: addDays,
    formatDayLabel: formatDayLabel,
    weekdayShort: weekdayShort,
    isValidDateKey: isValidDateKey,
    isWeekend: isWeekend,

    validateGoalInput: validateGoalInput,
    validateActivityInput: validateActivityInput,

    DISTRIBUTION_STYLES: DISTRIBUTION_STYLES,
    monthWeekBlocks: monthWeekBlocks,
    generatePlan: generatePlan,
    regeneratePlan: regeneratePlan,
    planTotals: planTotals,
    planMismatch: planMismatch,
    planRunDays: planRunDays,
    findDay: findDay,
    setDayDistance: setDayDistance,
    toggleDayType: toggleDayType,
    moveDay: moveDay,
    weekTotal: weekTotal,

    PROVIDERS: PROVIDERS,
    providerByKey: providerByKey,
    fetchProviderActivities: fetchProviderActivities,

    ACTIVITY_TYPES: ACTIVITY_TYPES,
    classifyActivity: classifyActivity,
    calculatePace: calculatePace,
    calculateSpeed: calculateSpeed,
    buildActivity: buildActivity,
    isDuplicate: isDuplicate,
    runActivities: runActivities,
    activitiesInMonth: activitiesInMonth,
    runKmBetween: runKmBetween,
    runKmOnDate: runKmOnDate,

    dailyCompletion: dailyCompletion,
    weekProgress: weekProgress,
    monthProgress: monthProgress,
    calculateStreak: calculateStreak,

    BADGES: BADGES,
    badgeById: badgeById,
    evaluateBadges: evaluateBadges,

    POINTS_RULE: POINTS_RULE,
    REWARDS: REWARDS,
    calculatePoints: calculatePoints,

    FRIEND_SEEDS: FRIEND_SEEDS,
    makeFriend: makeFriend,
    buildLeaderboard: buildLeaderboard,

    challengeCatalogue: challengeCatalogue,
    evaluateChallenges: evaluateChallenges,

    coachingMessage: coachingMessage
  };
})(window);
