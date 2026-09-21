/* GoRun — progress + coaching panels
 * Stories 9 (today), 10 (week), 11 (month + history), 12 (streak), 20 (coach).
 * Reads only through GR.select.derive(); writes only through GR.actions.*
 */
(function (global) {
  'use strict';

  var GR = global.GR;
  var D = GR.domain;
  var h = GR.h;
  var icon = GR.icon;

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var RING_RADIUS = 52;
  var RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  var TONE_ACCENT = {
    celebrate: 'green',
    push: 'salmon',
    nudge: 'yellow',
    calm: 'periwinkle',
    invite: 'lavender'
  };

  var REMINDER_FREQUENCIES = [
    { value: 'planned-days', label: 'Planned days' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' }
  ];

  /* --------------------------------------------------------------- helpers */

  function head(title, iconName, actions) {
    return h(
      'div.card__head',
      {},
      h('h2.card__title', {}, icon(iconName), h('span', { text: title })),
      actions && actions.length ? h('div.card__actions', {}, actions) : null
    );
  }

  function body(children, accent) {
    return h('div.card__body', accent ? { dataset: { accent: accent } } : {}, children);
  }

  function empty(iconName, title, text) {
    return h(
      'div.empty',
      {},
      h('span.empty__icon', {}, icon(iconName)),
      h('p.empty__title', { text: title }),
      h('p.empty__text', { text: text })
    );
  }

  function statBox(label, value, unitText) {
    return h(
      'div.stat-box',
      {},
      h(
        'div.stat',
        {},
        h('span.stat__value', {}, String(value), unitText ? h('span.stat__unit', { text: ' ' + unitText }) : null),
        h('span.stat__label', { text: label })
      )
    );
  }

  function meter(percent, extraClass) {
    var width = Math.max(0, Math.min(100, Math.round(percent || 0)));
    return h(
      'div.meter' + (extraClass ? '.' + extraClass : ''),
      {
        role: 'progressbar',
        'aria-valuenow': width,
        'aria-valuemin': '0',
        'aria-valuemax': '100'
      },
      h('span.meter__fill', { style: { width: width + '%' } })
    );
  }

  function ring(percent) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    var track = document.createElementNS(SVG_NS, 'circle');
    track.setAttribute('class', 'ring__track');
    track.setAttribute('cx', '60');
    track.setAttribute('cy', '60');
    track.setAttribute('r', String(RING_RADIUS));
    track.setAttribute('fill', 'none');
    track.setAttribute('stroke-width', '12');

    var bar = document.createElementNS(SVG_NS, 'circle');
    bar.setAttribute('class', 'ring__bar');
    bar.setAttribute('cx', '60');
    bar.setAttribute('cy', '60');
    bar.setAttribute('r', String(RING_RADIUS));
    bar.setAttribute('fill', 'none');
    bar.setAttribute('stroke-width', '12');
    bar.setAttribute('stroke-dasharray', String(RING_CIRCUMFERENCE));
    bar.setAttribute('stroke-dashoffset', String(RING_CIRCUMFERENCE * (1 - Math.min(1, (percent || 0) / 100))));

    svg.appendChild(track);
    svg.appendChild(bar);

    return h(
      'div.ring',
      {},
      svg,
      h(
        'div.ring__center',
        {},
        h('span.ring__value', { text: Math.round(percent || 0) + '%' }),
        h('span.ring__label', { text: 'of goal' })
      )
    );
  }

  function banner(kind, title, text) {
    return h(
      'div.banner.banner--' + kind,
      { role: 'status' },
      h('div.banner__body', {}, h('strong', { text: title }), text ? h('p', { text: text }) : null)
    );
  }

  /** Streak days can span months, so look the date up in whichever plan owns it. */
  function planDayFor(derived, date) {
    var plans = derived.state.plans || {};
    var plan = plans[D.monthOfDate(date)] || derived.plan;
    if (!plan) return null;
    var hit = D.findDay(plan, date);
    return hit ? hit.day : null;
  }

  /* ------------------------------------------------------- month (story 11) */

  function renderMonth(/* state */) {
    var derived = GR.select.derive();
    var unit = derived.unit;
    var month = derived.month;

    var actions = [h('span.chip.chip--muted', { text: D.formatMonthLabel(derived.monthKey, { short: true }) })];

    if (!month) {
      GR.mount(
        GR.$('#card-month'),
        [head('This month', 'chart', actions), body(empty('target', 'No goal for this month', 'Set a distance goal to start tracking progress.'))]
      );
      return;
    }

    var showForecast = !month.isPast && !month.achieved;

    var stats = [
      statBox('Distance run', D.formatKm(month.actualKm, unit, { bare: true }), D.unitLabel(unit)),
      statBox('Target', D.formatKm(month.targetKm, unit, { bare: true }), D.unitLabel(unit)),
      statBox('Remaining', D.formatKm(month.remainingKm, unit, { bare: true }), D.unitLabel(unit))
    ];

    var forecast = showForecast
      ? h('p.field__hint', {
          text:
            month.daysLeft +
            (month.daysLeft === 1 ? ' day left — ' : ' days left — ') +
            D.formatKm(month.dailyAverageNeededKm, unit) +
            ' a day to finish on target.'
        })
      : null;

    var outcome = null;
    if (month.achieved) {
      outcome = banner('ok', 'Goal achieved', 'You ran ' + D.formatKm(month.actualKm, unit) + ' against a ' + D.formatKm(month.targetKm, unit) + ' target.');
    } else if (month.isPast) {
      outcome = banner('danger', 'Goal missed', D.formatKm(month.remainingKm, unit) + ' short of the target.');
    }

    var shareBtn = null;
    if (GR.ui && typeof GR.ui.shareDialog === 'function') {
      shareBtn = h(
        'button.btn.btn--sm',
        {
          type: 'button',
          onclick: function () {
            GR.ui.shareDialog({ kind: 'month', monthKey: month.monthKey, month: month, unit: unit });
          }
        },
        icon('share'),
        h('span', { text: 'Share' })
      );
    }
    if (shareBtn) actions.push(shareBtn);

    GR.mount(GR.$('#card-month'), [
      head('This month', 'chart', actions),
      body([
        h(
          'div',
          { style: { display: 'flex', gap: '16px', 'align-items': 'center', 'flex-wrap': 'wrap' } },
          ring(month.percent),
          h(
            'div',
            { style: { flex: '1', 'min-width': '180px' } },
            h('p.field__hint', {
              text:
                D.formatKm(month.actualKm, unit) +
                ' of ' +
                D.formatKm(month.targetKm, unit) +
                ' run this month.'
            }),
            forecast
          )
        ),
        h('div.stat-grid.stat-grid--tight', {}, stats),
        outcome
      ])
    ]);
  }

  /* ------------------------------------------------------ streak (story 12) */

  function renderStreak(/* state */) {
    var derived = GR.select.derive();
    var streak = derived.streak || { current: 0, longest: 0 };

    var today = D.todayKey();
    var markers = [];
    for (var offset = 6; offset >= 0; offset -= 1) {
      var date = D.addDays(today, -offset);
      var day = planDayFor(derived, date);
      var plannedKm = day && day.type === 'run' ? day.distanceKm || 0 : 0;
      var isRest = !day || day.type !== 'run';
      var completed = !isRest && D.runKmOnDate(derived.activities, date) + 0.05 >= plannedKm;
      var isFuture = date > today;
      // Today is still in play, so an unfinished run is pending rather than missed.
      var isPending = !completed && (isFuture || date === today);

      var tone = isRest ? 'chip--muted' : completed ? 'chip--ok' : isPending ? 'chip--warn' : 'chip--bad';
      var description = isRest
        ? 'rest day'
        : completed
          ? 'planned run completed'
          : isPending
            ? 'planned run still to do'
            : 'planned run missed';

      markers.push(
        h('span.chip.' + tone, { title: D.formatDayLabel(date) + ' — ' + description }, h('span', { text: D.weekdayShort(date) }))
      );
    }

    var headline =
      streak.current === 0
        ? h('p.field__hint', { text: 'No streak yet — complete today\'s planned run to start one.' })
        : h('p.field__hint', {
            text: streak.current === 1 ? 'One planned run down. Keep it rolling.' : streak.current + ' planned runs in a row.'
          });

    var hasPlan = !!derived.plan;

    GR.mount(GR.$('#card-streak'), [
      head('Streak', 'flame'),
      body(
        hasPlan
          ? [
              h(
                'div',
                { style: { display: 'flex', gap: '20px', 'align-items': 'flex-end', 'flex-wrap': 'wrap' } },
                h(
                  'div.stat',
                  {},
                  h(
                    'span.stat__value.stat__value--xl',
                    {},
                    String(streak.current),
                    h('span.stat__unit', { text: streak.current === 1 ? ' day' : ' days' })
                  ),
                  h('span.stat__label', { text: 'Current streak' })
                ),
                h(
                  'div.stat',
                  {},
                  h(
                    'span.stat__value.stat__value--sm',
                    {},
                    String(streak.longest || 0),
                    h('span.stat__unit', { text: streak.longest === 1 ? ' day' : ' days' })
                  ),
                  h('span.stat__label', { text: 'Longest streak' })
                )
              ),
              headline,
              h('div.day-strip', { 'aria-label': 'Last seven days' }, markers),
              h('p.field__hint', { text: 'Rest days never break a streak. Missing a planned run resets it to zero.' })
            ]
          : [
              h(
                'div.empty',
                {},
                h('span.empty__icon', {}, icon('flame', { size: 22 })),
                h('p.empty__title', { text: 'No streak yet' }),
                h('p.empty__text', {
                  text: 'Once you have a training plan, every planned run you complete builds your streak. Rest days never break it.'
                })
              )
            ]
      )
    ]);
  }

  /* ------------------------------------------------------- today (story 9) */

  function renderToday(/* state */) {
    var derived = GR.select.derive();
    var unit = derived.unit;
    var today = derived.today;
    var todayDate = D.todayKey();
    var dateChip = h('span.chip.chip--muted', { text: D.formatDayLabel(todayDate) });

    if (!derived.plan) {
      GR.mount(GR.$('#card-today'), [
        head('Today', 'clock', [dateChip]),
        body(empty('calendar', 'No training plan yet', 'Generate a plan and today\'s target will show up here.'))
      ]);
      return;
    }

    var ranToday = D.runKmOnDate(derived.activities, todayDate);

    var logButton = h(
      'button.btn.btn--primary.btn--block',
      {
        type: 'button',
        onclick: function () {
          document.dispatchEvent(new CustomEvent('gorun:log-run', { detail: { date: todayDate } }));
        }
      },
      icon('plus'),
      h('span', { text: 'Log this run' })
    );

    if (!today) {
      GR.mount(GR.$('#card-today'), [
        head('Today', 'clock', [dateChip]),
        body([
          h('div.banner.banner--info', { role: 'status' }, h(
            'div.banner__body',
            {},
            h('strong', { text: 'Nothing scheduled today' }),
            h('p', {
              text:
                'Today sits outside the plan for ' +
                D.formatMonthLabel(derived.monthKey, { short: true }) +
                '. You have run ' +
                D.formatKm(ranToday, unit) +
                ' today.'
            })
          )),
          logButton
        ])
      ]);
      return;
    }

    if (today.isRest) {
      GR.mount(GR.$('#card-today'), [
        head('Today', 'clock', [dateChip]),
        body([
          h(
            'div.row.row--rest.row--today',
            {},
            h('span.row__end', {}, icon('rest')),
            h(
              'div.row__main',
              {},
              h('p.row__title', { text: 'Rest day' }),
              h('p.row__meta', {
                text:
                  today.actualKm > 0
                    ? 'Bonus ' + D.formatKm(today.actualKm, unit) + ' logged — nice, but recovery counts too.'
                    : 'Recovery is part of the plan. Nothing to run today.'
              })
            )
          ),
          logButton
        ])
      ]);
      return;
    }

    var percent = today.plannedKm > 0 ? (today.actualKm / today.plannedKm) * 100 : 0;
    var stateChip = today.complete
      ? h('span.chip.chip--ok', {}, icon('check'), h('span', { text: 'Complete' }))
      : h('span.chip.chip--warn', { text: D.formatKm(today.shortfallKm, unit) + ' to go' });

    GR.mount(GR.$('#card-today'), [
      head('Today', 'clock', [dateChip]),
      body([
        h(
          'div',
          { style: { display: 'flex', gap: '8px', 'align-items': 'center', 'flex-wrap': 'wrap' } },
          h('span.stat__value.stat__value--sm', {
            text: D.formatKm(today.actualKm, unit, { bare: true }) + ' of ' + D.formatKm(today.plannedKm, unit)
          }),
          stateChip
        ),
        meter(percent, 'meter--chunky'),
        h('p.field__hint', {
          text: today.complete
            ? 'Planned distance met. Anything more is a bonus.'
            : 'Planned ' + D.formatKm(today.plannedKm, unit) + ' — ' + D.formatKm(today.shortfallKm, unit) + ' still to run.'
        }),
        logButton
      ])
    ]);
  }

  /* -------------------------------------------------------- week (story 10) */

  var selectedWeekIndex = null; // view-only state; not persisted

  function pickWeek(derived) {
    var weeks = derived.weeks;
    if (!weeks.length) return null;
    for (var i = 0; i < weeks.length; i += 1) {
      if (weeks[i].index === selectedWeekIndex) return weeks[i];
    }
    for (var c = 0; c < weeks.length; c += 1) {
      if (weeks[c].isCurrent) return weeks[c];
    }
    return weeks[weeks.length - 1];
  }

  function dayRow(row, unit) {
    var classes = '.row';
    if (row.isRest) classes += '.row--rest';
    else if (row.complete) classes += '.row--done';
    else if (!row.isFuture) classes += '.row--missed';
    if (row.isToday) classes += '.row--today';

    var chip;
    if (row.isRest) {
      chip = h('span.chip.chip--muted', { text: row.actualKm > 0 ? 'Rest + bonus' : 'Rest' });
    } else if (row.complete) {
      chip = h('span.chip.chip--ok', {}, icon('check'), h('span', { text: 'Done' }));
    } else if (row.isFuture) {
      chip = h('span.chip.chip--muted', { text: 'Upcoming' });
    } else {
      chip = h('span.chip.chip--bad', { text: D.formatKm(row.shortfallKm, unit) + ' short' });
    }

    var meta = row.isRest
      ? row.actualKm > 0
        ? 'Rest day — ' + D.formatKm(row.actualKm, unit) + ' logged anyway'
        : 'Rest day'
      : D.formatKm(row.actualKm, unit, { bare: true }) + ' of ' + D.formatKm(row.plannedKm, unit) + ' planned';

    return h(
      'div' + classes,
      {},
      h(
        'div.row__main',
        {},
        h('p.row__title', { text: D.formatDayLabel(row.date) }),
        h('p.row__meta', { text: meta })
      ),
      h('div.row__end', {}, chip)
    );
  }

  function renderWeek(/* state */) {
    var derived = GR.select.derive();
    var unit = derived.unit;

    if (!derived.plan || !derived.weeks.length) {
      GR.mount(GR.$('#card-week'), [
        head('Weekly progress', 'calendar'),
        body(empty('calendar', 'No plan to track', 'Generate a training plan to see weekly totals.'))
      ]);
      return;
    }

    var week = pickWeek(derived);

    var selector = h(
      'div.seg',
      { role: 'group', 'aria-label': 'Choose a week' },
      derived.weeks.map(function (w) {
        return h('button.seg__btn' + (w.index === week.index ? '.is-active' : ''), {
          type: 'button',
          text: 'W' + w.index,
          'aria-pressed': w.index === week.index ? 'true' : 'false',
          onclick: function () {
            selectedWeekIndex = w.index;
            renderWeek();
          }
        });
      })
    );

    var outcome = null;
    if (week.isComplete) {
      outcome = week.achieved
        ? banner('ok', 'Week achieved', 'You ran ' + D.formatKm(week.actualKm, unit) + ' against ' + D.formatKm(week.plannedKm, unit) + ' planned.')
        : banner('danger', 'Week missed', D.formatKm(week.remainingKm, unit) + ' short of the weekly plan.');
    }

    GR.mount(GR.$('#card-week'), [
      head('Weekly progress', 'calendar', [selector]),
      body([
        h('p.field__hint', {
          text: D.formatDayLabel(week.startDate) + ' – ' + D.formatDayLabel(week.endDate)
        }),
        h('div.stat-grid.stat-grid--tight', {}, [
          statBox('Run', D.formatKm(week.actualKm, unit, { bare: true }), D.unitLabel(unit)),
          statBox('Planned', D.formatKm(week.plannedKm, unit, { bare: true }), D.unitLabel(unit)),
          statBox('Remaining', D.formatKm(week.remainingKm, unit, { bare: true }), D.unitLabel(unit))
        ]),
        meter(week.percent),
        h('p.field__hint', { text: week.daysComplete + ' of ' + week.daysPlanned + ' planned runs done' }),
        outcome,
        h(
          'div.list.scroll-y',
          {},
          week.rows.map(function (row) {
            return dayRow(row, unit);
          })
        )
      ])
    ]);
  }

  /* ------------------------------------------------------- coach (story 20) */

  var notificationNote = null;

  function confirmNotifications() {
    if (!('Notification' in global)) {
      notificationNote = 'Notifications are not available here — reminders will appear in the app instead.';
      renderCoach();
      return;
    }
    try {
      var result = Notification.requestPermission();
      var handle = function (permission) {
        try {
          if (permission === 'granted') {
            notificationNote = null;
            new Notification('GoRun reminders on', { body: 'We will nudge you when a run is due.' });
          } else {
            notificationNote = 'Notifications are blocked — reminders will appear in the app instead.';
          }
        } catch (err) {
          notificationNote = 'Notifications could not be shown — reminders will appear in the app instead.';
        }
        renderCoach();
      };
      if (result && typeof result.then === 'function') {
        result.then(handle, function () {
          notificationNote = 'Notifications are unavailable — reminders will appear in the app instead.';
          renderCoach();
        });
      } else {
        handle(result);
      }
    } catch (err) {
      notificationNote = 'Notifications are unavailable — reminders will appear in the app instead.';
      renderCoach();
    }
  }

  function renderCoach(/* state */) {
    var derived = GR.select.derive();
    var coach = derived.coach || { tone: 'invite', icon: 'sparkle', title: 'Keep moving', body: 'Set a goal to get tailored guidance.' };
    var settings = derived.state.settings;
    var enabled = !!settings.remindersEnabled;
    var frequency = settings.reminderFrequency || 'planned-days';

    var toggle = h(
      'button.btn.btn--sm' + (enabled ? '.btn--primary' : '.btn--secondary'),
      {
        type: 'button',
        'aria-pressed': enabled ? 'true' : 'false',
        onclick: function () {
          var next = !enabled;
          GR.actions.setReminders(next);
          if (next) confirmNotifications();
          else {
            notificationNote = null;
            renderCoach();
          }
        }
      },
      icon('bell'),
      h('span', { text: enabled ? 'Reminders on' : 'Reminders off' })
    );

    var frequencyPicker = enabled
      ? h(
          'div.field',
          {},
          h('span.field__label', { text: 'Reminder frequency', id: 'reminder-frequency-label' }),
          h(
            'div.seg',
            { role: 'group', 'aria-labelledby': 'reminder-frequency-label' },
            REMINDER_FREQUENCIES.map(function (option) {
              return h('button.seg__btn' + (option.value === frequency ? '.is-active' : ''), {
                type: 'button',
                text: option.label,
                'aria-pressed': option.value === frequency ? 'true' : 'false',
                onclick: function () {
                  GR.actions.setReminders(true, option.value);
                }
              });
            })
          ),
          notificationNote ? h('p.field__hint', { text: notificationNote }) : null
        )
      : h('p.field__hint', { text: 'Turn reminders on and GoRun will prompt you when a planned run is due.' });

    GR.mount(GR.$('#card-coach'), [
      head('Coach', 'sparkle'),
      body(
        [
          h(
            'div',
            { style: { display: 'flex', gap: '12px', 'align-items': 'flex-start' } },
            h('span.empty__icon', {}, icon(coach.icon)),
            h('div', { style: { flex: '1', 'min-width': '0' } }, h('h3.row__title', { text: coach.title }), h('p.empty__text', { text: coach.body }))
          ),
          h('div.card__actions', { style: { 'margin-left': '0' } }, toggle),
          frequencyPicker
        ],
        TONE_ACCENT[coach.tone] || 'lavender'
      )
    ]);
  }

  /* ----------------------------------------------------- history (story 11) */

  function historyRow(month, unit, activeMonthKey) {
    var chip;
    if (month.isPast) {
      chip = month.achieved
        ? h('span.chip.chip--ok', {}, icon('check'), h('span', { text: 'Achieved' }))
        : h('span.chip.chip--bad', { text: 'Missed' });
    } else if (month.achieved) {
      chip = h('span.chip.chip--ok', {}, icon('check'), h('span', { text: 'Achieved' }));
    } else {
      chip = h('span.chip.chip--muted', { text: 'In progress' });
    }

    var label = D.formatMonthLabel(month.monthKey);

    return h(
      'button.row' + (month.monthKey === activeMonthKey ? '.row--accent' : ''),
      {
        type: 'button',
        'aria-label': 'Show ' + label + ' — ' + month.percent + '% of goal',
        style: { width: '100%', font: 'inherit', color: 'inherit', 'text-align': 'left', cursor: 'pointer' },
        onclick: function () {
          GR.actions.setActiveMonth(month.monthKey);
        }
      },
      h(
        'div.row__main',
        {},
        h('p.row__title', { text: label }),
        h('p.row__meta', {
          text: D.formatKm(month.actualKm, unit, { bare: true }) + ' of ' + D.formatKm(month.targetKm, unit)
        }),
        meter(month.percent, 'meter--sm')
      ),
      h('div.row__end', {}, h('span.stat__value.stat__value--sm', { text: month.percent + '%' }), chip)
    );
  }

  function renderHistory(/* state */) {
    var derived = GR.select.derive();
    var months = derived.historyMonths || [];

    if (!months.length) {
      GR.mount(GR.$('#card-history'), [
        head('Goal history', 'medal'),
        body(empty('medal', 'No goals yet', 'Once you set monthly goals they will be listed here.'))
      ]);
      return;
    }

    GR.mount(GR.$('#card-history'), [
      head('Goal history', 'medal', [h('span.chip.chip--muted', { text: months.length + (months.length === 1 ? ' month' : ' months') })]),
      body(
        h(
          'div.list.scroll-y',
          {},
          months.map(function (month) {
            return historyRow(month, derived.unit, derived.monthKey);
          })
        )
      )
    ]);
  }

  /* -------------------------------------------------------------- register */

  GR.registerPanel('month', renderMonth);
  GR.registerPanel('streak', renderStreak);
  GR.registerPanel('today', renderToday);
  GR.registerPanel('week', renderWeek);
  GR.registerPanel('coach', renderCoach);
  GR.registerPanel('history', renderHistory);
})(window);
