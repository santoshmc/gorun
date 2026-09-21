/* GoRun — core UI panels
 * Stories 1-8: monthly goal, training plan, activities, connected sources.
 * Reads only through GR.select.derive(); writes only through GR.actions.*
 */
(function (global) {
  'use strict';

  var GR = global.GR;
  var D = GR.domain;
  var h = GR.h;
  var icon = GR.icon;

  /* ================================================================ view state */

  // Purely presentational — never persisted, so it lives here and not in the store.
  var activityFilter = 'all';

  /* =================================================================== helpers */

  function lastDayOfMonth(monthKey) {
    return monthKey + '-' + GR.pad2(D.daysInMonth(monthKey));
  }

  function dayNumber(dateKey) {
    return String(Number(String(dateKey).slice(8, 10)));
  }

  function metricText(value, suffix, digits) {
    if (value === null || value === undefined || !isFinite(value)) return 'unavailable';
    var rounded = digits === 0 ? Math.round(value) : Math.round(value * 10) / 10;
    return rounded + (suffix ? ' ' + suffix : '');
  }

  function chip(options) {
    var node = h('span.chip', { class: options.variant || '', title: options.title || null });
    if (options.icon) node.appendChild(icon(options.icon, { size: 14 }));
    node.appendChild(h('span', { text: options.text }));
    return node;
  }

  function iconButton(options) {
    return h(
      'button.icon-btn',
      {
        type: 'button',
        class: options.variant || '',
        'aria-label': options.label,
        title: options.label,
        disabled: options.disabled === true,
        onclick: options.onClick
      },
      icon(options.icon, { size: 16 })
    );
  }

  function emptyState(options) {
    return h(
      'div.empty',
      {},
      h('span.empty__icon', {}, icon(options.icon, { size: 22 })),
      h('p.empty__title', { text: options.title }),
      h('p.empty__text', { text: options.text }),
      options.action || null
    );
  }

  /** Label + control + inline error, wired for D.validate* error maps. */
  function buildField(config) {
    var control = config.control;
    var error = h('p.field__error');
    error.hidden = true;

    var hint = config.hint ? h('span.field__hint', { text: config.hint }) : null;
    var wrap = h(
      config.tag || 'label.field',
      {},
      h('span.field__label', { text: config.label }),
      control,
      hint,
      error
    );

    return {
      el: wrap,
      control: control,
      hint: hint,
      setError: function (message) {
        if (message) {
          wrap.classList.add('field--invalid');
          GR.mount(error, [icon('warning', { size: 14 }), h('span', { text: message })]);
          error.hidden = false;
        } else {
          wrap.classList.remove('field--invalid');
          GR.clear(error);
          error.hidden = true;
        }
      },
      focus: function () {
        if (control.focus) control.focus();
      }
    };
  }

  /** Applies a validation error map and focuses the first offending field. */
  function applyErrors(fields, errors) {
    var focused = false;
    Object.keys(fields).forEach(function (key) {
      var message = errors ? errors[key] : null;
      fields[key].setError(message || null);
      if (message && !focused) {
        fields[key].focus();
        focused = true;
      }
    });
    GR.play('error');
  }

  function segmented(config) {
    var current = config.value;
    var buttons = [];
    var group = h('div.seg', { role: 'group', 'aria-label': config.ariaLabel || config.label || 'Options' });

    config.options.forEach(function (option) {
      var btn = h(
        'button.seg__btn',
        {
          type: 'button',
          title: option.title || null,
          'aria-pressed': option.value === current ? 'true' : 'false',
          onclick: function () {
            if (option.value === current) return;
            set(option.value);
            if (config.onChange) config.onChange(option.value);
          }
        },
        option.label
      );
      if (option.value === current) btn.classList.add('is-active');
      buttons.push({ value: option.value, el: btn });
      group.appendChild(btn);
    });

    function set(value) {
      current = value;
      buttons.forEach(function (entry) {
        var on = entry.value === value;
        entry.el.classList.toggle('is-active', on);
        entry.el.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    return {
      el: group,
      set: set,
      getValue: function () {
        return current;
      }
    };
  }

  function selectControl(config) {
    var select = h('select', { 'aria-label': config.ariaLabel || null, disabled: config.disabled === true });
    config.options.forEach(function (option) {
      select.appendChild(h('option', { value: option.value }, option.label));
    });
    // Options only exist after append, so the value has to be applied here.
    select.value = config.value;
    if (config.onChange) {
      select.addEventListener('change', function () {
        config.onChange(select.value);
      });
    }
    return select;
  }

  function dialogFooter(config) {
    return [
      h('button.btn.btn--ghost', { type: 'button', onclick: config.onCancel }, config.cancelLabel || 'Cancel'),
      h(
        'button.btn.btn--primary',
        { type: 'button', onclick: config.onConfirm },
        config.confirmLabel || 'Save'
      )
    ];
  }

  /* ============================================================ goal (story 1) */

  function convertDisplayValue(raw, fromUnit, toUnit) {
    var text = String(raw == null ? '' : raw).trim();
    if (text === '') return '';
    var num = Number(text);
    if (!isFinite(num)) return text;
    var converted = Math.round(D.fromKm(D.toKm(num, fromUnit), toUnit) * 10) / 10;
    return String(converted);
  }

  function openGoalDialog(existingGoal) {
    var derived = GR.select.derive();
    var unit = derived.unit;
    var monthKey = existingGoal ? existingGoal.monthKey : derived.monthKey;

    var months = D.selectableMonths(12);
    if (months.indexOf(monthKey) === -1) months.unshift(monthKey);

    var monthField = buildField({
      label: 'Which month?',
      control: selectControl({
        ariaLabel: 'Goal month',
        value: monthKey,
        disabled: !!existingGoal,
        options: months.map(function (key) {
          return { value: key, label: D.formatMonthLabel(key) };
        }),
        onChange: function (value) {
          monthKey = value;
          monthField.setError(null);
        }
      }),
      hint: existingGoal ? 'The month cannot be changed — delete the goal to move it.' : 'Goals run from the 1st to the last day of the month.'
    });

    var distanceInput = h('input', {
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
      'data-autofocus': '',
      placeholder: 'e.g. 100'
    });
    distanceInput.value = existingGoal ? String(D.numberInUnit(existingGoal.targetKm, unit)) : '';

    var distanceField = buildField({
      label: 'How far do you want to run?',
      control: distanceInput,
      hint: 'Measured in ' + D.unitName(unit) + '.'
    });

    var quickPicks = h('div.quick-picks');

    function renderQuickPicks() {
      GR.mount(
        quickPicks,
        D.QUICK_PICKS[unit].map(function (value) {
          return h(
            'button.btn.btn--secondary.btn--sm',
            {
              type: 'button',
              onclick: function () {
                distanceInput.value = String(value);
                distanceField.setError(null);
                GR.play('tick');
                distanceInput.focus();
              }
            },
            value + ' ' + D.unitLabel(unit)
          );
        })
      );
    }
    renderQuickPicks();

    var unitSeg = segmented({
      ariaLabel: 'Distance unit',
      value: unit,
      options: [
        { value: 'km', label: 'Kilometres' },
        { value: 'mi', label: 'Miles' }
      ],
      onChange: function (next) {
        distanceInput.value = convertDisplayValue(distanceInput.value, unit, next);
        unit = next;
        if (distanceField.hint) distanceField.hint.textContent = 'Measured in ' + D.unitName(unit) + '.';
        renderQuickPicks();
        distanceField.setError(null);
        GR.play('tick');
      }
    });

    var unitField = buildField({
      tag: 'div.field',
      label: 'Unit',
      control: unitSeg.el
    });

    var instance = GR.dialog({
      title: existingGoal ? 'Edit monthly goal' : 'Set your monthly goal',
      icon: 'target',
      size: 'sm',
      body: h('div.form-grid', {}, monthField.el, unitField.el, distanceField.el, quickPicks),
      footer: dialogFooter({
        confirmLabel: existingGoal ? 'Save changes' : 'Save goal',
        onCancel: function () {
          instance.close('cancel');
        },
        onConfirm: submit
      })
    });

    function submit() {
      var result = D.validateGoalInput({
        monthKey: monthKey,
        targetDistance: distanceInput.value,
        unit: unit
      });

      if (!result.ok) {
        applyErrors({ monthKey: monthField, targetDistance: distanceField }, result.errors);
        return;
      }

      var clash = GR.getState().goals[result.value.monthKey];
      var isReplacement = clash && (!existingGoal || existingGoal.monthKey !== result.value.monthKey);

      if (!isReplacement) {
        GR.actions.saveGoal(result.value);
        instance.close('save');
        return;
      }

      GR.confirm({
        title: 'Replace the goal for ' + D.formatMonthLabel(result.value.monthKey) + '?',
        message:
          'That month already has a target of ' +
          D.formatKm(clash.targetKm, unit) +
          '. Saving will overwrite it. Any training plan for the month keeps its schedule but is measured against the new target.',
        confirmLabel: 'Replace goal'
      }).then(function (confirmed) {
        if (!confirmed) return;
        GR.actions.saveGoal(result.value);
        instance.close('save');
      });
    }

    return instance;
  }

  function confirmDeleteGoal(goal, unit) {
    GR.confirm({
      title: 'Delete this goal?',
      message:
        'The ' +
        D.formatKm(goal.targetKm, unit) +
        ' target for ' +
        D.formatMonthLabel(goal.monthKey) +
        ' will be removed, and the training plan built from it goes with it. Your logged activities are kept.',
      tone: 'danger',
      confirmLabel: 'Delete'
    }).then(function (confirmed) {
      if (confirmed) GR.actions.deleteGoal(goal.monthKey);
    });
  }

  function renderGoal() {
    var host = GR.$('#card-goal');
    if (!host) return;

    var derived = GR.select.derive();
    var unit = derived.unit;
    var goal = derived.goal;
    var readOnly = derived.isReadOnlyMonth;

    var actions = h('div.card__actions');

    if (goal && readOnly) {
      actions.appendChild(chip({ text: 'Past month · read only', variant: 'chip--muted', icon: 'lock' }));
    } else if (goal) {
      actions.appendChild(
        iconButton({
          icon: 'pencil',
          label: 'Edit monthly goal',
          onClick: function () {
            openGoalDialog(goal);
          }
        })
      );
      actions.appendChild(
        iconButton({
          icon: 'trash',
          label: 'Delete monthly goal',
          variant: 'icon-btn--danger',
          onClick: function () {
            confirmDeleteGoal(goal, unit);
          }
        })
      );
    }

    var head = h(
      'div.card__head',
      {},
      h('h2.card__title', {}, icon('target'), h('span', { text: 'Monthly goal' })),
      actions
    );

    var body = h('div.card__body');

    if (!goal) {
      body.appendChild(
        emptyState({
          icon: 'target',
          title: 'Set your monthly goal',
          text:
            'Pick a distance for ' +
            D.formatMonthLabel(derived.monthKey) +
            '. Everything else — the weekly plan, your progress, your streak — is built from that one number.',
          action: readOnly
            ? null
            : h(
                'button.btn.btn--primary',
                {
                  type: 'button',
                  onclick: function () {
                    openGoalDialog(null);
                  }
                },
                icon('plus', { size: 16 }),
                'Set goal'
              )
        })
      );

      if (readOnly) {
        body.appendChild(chip({ text: 'Past month · read only', variant: 'chip--muted', icon: 'lock' }));
      }
    } else {
      body.appendChild(
        h(
          'div.stat',
          {},
          h('span.stat__value.stat__value--xl', { text: D.formatKm(goal.targetKm, unit) }),
          h('span.stat__label', { text: D.formatMonthLabel(goal.monthKey) })
        )
      );

      if (derived.month) {
        body.appendChild(
          h(
            'div.row.row--sunk',
            {},
            h(
              'div.row__main',
              {},
              h('p.row__title', { text: D.formatKm(derived.month.actualKm, unit) + ' run so far' }),
              h(
                'div.row__meta',
                {},
                chip({ text: derived.month.percent + '% of target', variant: 'chip--muted' }),
                chip({
                  text: derived.month.achieved
                    ? 'Goal reached'
                    : D.formatKm(derived.month.remainingKm, unit) + ' to go',
                  variant: derived.month.achieved ? 'chip--ok' : 'chip--muted'
                })
              )
            )
          )
        );
      }

      if (!readOnly) {
        body.appendChild(
          h(
            'button.btn.btn--secondary.btn--block',
            {
              type: 'button',
              onclick: function () {
                if (derived.plan) {
                  var planCard = GR.$('#card-plan');
                  if (planCard && planCard.scrollIntoView) planCard.scrollIntoView({ behavior: GR.prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
                  GR.play('swoosh');
                } else {
                  openPlanDialog();
                }
              }
            },
            icon('calendar', { size: 16 }),
            derived.plan ? 'Edit plan' : 'Generate plan'
          )
        );
      }
    }

    GR.mount(host, [head, body]);
  }

  /* ================================================= training plan (stories 2 & 3) */

  function openPlanDialog() {
    var derived = GR.select.derive();
    var goal = derived.goal;
    if (!goal) {
      GR.toast('Set a monthly goal first', { tone: 'info', icon: 'target' });
      return null;
    }

    var unit = derived.unit;
    var monthKey = derived.monthKey;
    var existingPlan = derived.plan;
    var runDays = existingPlan ? existingPlan.runDaysPerWeek : 3;
    var style = existingPlan ? existingPlan.style : 'even';
    var preview = null;

    var previewBox = h('div.plan-weeks');

    function rebuildPreview() {
      preview = D.generatePlan({
        monthKey: monthKey,
        targetKm: goal.targetKm,
        runDaysPerWeek: runDays,
        style: style
      });

      var totals = D.planTotals(preview);
      var firstWeek = preview.weeks[0];

      GR.mount(previewBox, [
        h(
          'div.row.row--sunk',
          {},
          h(
            'div.row__main',
            {},
            h('p.row__title', { text: 'Month total ' + D.formatKm(totals.monthlyTotal, unit) }),
            h(
              'div.row__meta',
              {},
              totals.weeklyTotals.map(function (total, index) {
                return chip({ text: 'W' + (index + 1) + ' · ' + D.formatKm(total, unit), variant: 'chip--muted' });
              })
            )
          )
        ),
        h(
          'div.plan-week',
          {},
          h(
            'div.plan-week__head',
            {},
            h('span.plan-week__title', { text: 'Week 1 preview' }),
            h('span.plan-week__total', { text: D.formatKm(firstWeek.totalKm, unit) })
          ),
          h(
            'div.plan-days',
            {},
            firstWeek.days.map(function (day) {
              return h(
                'div.plan-day',
                { class: day.type === 'run' ? 'plan-day--run' : 'plan-day--rest' },
                h('span.plan-day__date', { text: D.weekdayShort(day.date) + ' ' + dayNumber(day.date) }),
                h('span.plan-day__dist', {
                  text: day.type === 'run' ? D.formatKm(day.distanceKm, unit) : 'Rest'
                })
              );
            })
          )
        )
      ]);
    }

    var daysSeg = segmented({
      ariaLabel: 'Running days per week',
      value: runDays,
      options: [
        { value: 3, label: '3 days' },
        { value: 4, label: '4 days' },
        { value: 5, label: '5 days' }
      ],
      onChange: function (value) {
        runDays = value;
        rebuildPreview();
        GR.play('tick');
      }
    });

    var styleSeg = segmented({
      ariaLabel: 'Distribution style',
      value: style,
      options: D.DISTRIBUTION_STYLES.map(function (entry) {
        return { value: entry.key, label: entry.name, title: entry.blurb };
      }),
      onChange: function (value) {
        style = value;
        styleBlurb.textContent = styleBlurbFor(value);
        rebuildPreview();
        GR.play('tick');
      }
    });

    function styleBlurbFor(key) {
      var match = D.DISTRIBUTION_STYLES.filter(function (entry) {
        return entry.key === key;
      })[0];
      return match ? match.blurb : '';
    }

    var styleBlurb = h('span.field__hint', { text: styleBlurbFor(style) });

    var daysField = buildField({ tag: 'div.field', label: 'Running days per week', control: daysSeg.el });
    var styleField = h('div.field', {}, h('span.field__label', { text: 'How should the distance be spread?' }), styleSeg.el, styleBlurb);

    var warning = existingPlan
      ? h(
          'div.banner.banner--info',
          {},
          icon('warning'),
          h(
            'div.banner__body',
            {},
            h('p', { text: 'You already have a plan for ' + D.formatMonthLabel(monthKey) + '. Generating a new one replaces it and discards any day-by-day changes you made.' })
          )
        )
      : null;

    rebuildPreview();

    var instance = GR.dialog({
      title: existingPlan ? 'Regenerate training plan' : 'Generate training plan',
      icon: 'calendar',
      body: h(
        'div.form-grid',
        {},
        warning,
        h('p.dialog__message', {
          text:
            'GoRun splits ' +
            D.formatKm(goal.targetKm, unit) +
            ' across four weeks of ' +
            D.formatMonthLabel(monthKey) +
            '.'
        }),
        daysField.el,
        styleField,
        previewBox
      ),
      footer: dialogFooter({
        confirmLabel: existingPlan ? 'Replace plan' : 'Save plan',
        onCancel: function () {
          instance.close('cancel');
        },
        onConfirm: function () {
          if (!preview) return;
          GR.actions.savePlan(preview);
          instance.close('save');
        }
      })
    });

    return instance;
  }

  function openPlanDayDialog(date) {
    var derived = GR.select.derive();
    var plan = derived.plan;
    if (!plan) return null;

    var hit = D.findDay(plan, date);
    if (!hit) return null;

    var unit = derived.unit;
    var monthKey = plan.monthKey;
    var day = hit.day;
    var isRun = day.type === 'run';

    var distanceInput = h('input', {
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
      'data-autofocus': '',
      placeholder: 'e.g. 8'
    });
    distanceInput.value = isRun ? String(D.numberInUnit(day.distanceKm, unit)) : '';

    var distanceField = buildField({
      label: 'Distance for this day',
      control: distanceInput,
      hint: 'In ' + D.unitName(unit) + '. Saving a distance turns a rest day into a run day.'
    });

    var otherDates = hit.week.days
      .filter(function (other) {
        return other.date !== date;
      })
      .map(function (other) {
        return {
          value: other.date,
          label: D.formatDayLabel(other.date) + (other.type === 'run' ? ' · has a run' : ' · rest')
        };
      });

    var moveField = null;
    if (isRun && otherDates.length) {
      moveField = buildField({
        label: 'Move this run to…',
        control: selectControl({
          ariaLabel: 'Move this run to another day in the same week',
          value: '',
          options: [{ value: '', label: 'Keep it on ' + D.formatDayLabel(date) }].concat(otherDates),
          onChange: function (value) {
            if (!value) return;
            GR.actions.updatePlan(monthKey, function (current) {
              return D.moveDay(current, date, value);
            });
            instance.close('move');
          }
        }),
        hint: 'Swaps the planned distance onto the day you pick.'
      });
    }

    var toggleButton = h(
      'button.btn.btn--secondary.btn--block',
      {
        type: 'button',
        onclick: function () {
          GR.actions.updatePlan(monthKey, function (current) {
            return D.toggleDayType(current, date);
          });
          instance.close('toggle');
        }
      },
      icon(isRun ? 'rest' : 'run', { size: 16 }),
      isRun ? 'Make this a rest day' : 'Make this a run day'
    );

    var instance = GR.dialog({
      title: D.formatDayLabel(date),
      icon: isRun ? 'run' : 'rest',
      size: 'sm',
      body: h(
        'div.form-grid',
        {},
        h('p.dialog__message', {
          text: isRun
            ? 'Currently a run day of ' + D.formatKm(day.distanceKm || 0, unit) + '.'
            : 'Currently a rest day.'
        }),
        distanceField.el,
        toggleButton,
        moveField ? moveField.el : null
      ),
      footer: dialogFooter({
        confirmLabel: 'Save distance',
        onCancel: function () {
          instance.close('cancel');
        },
        onConfirm: function () {
          var raw = String(distanceInput.value).trim();
          var value = Number(raw);
          if (raw === '' || !isFinite(value) || value <= 0) {
            distanceField.setError('Enter a distance greater than zero, or use the rest day button.');
            distanceField.focus();
            GR.play('error');
            return;
          }
          if (value > D.maxTargetDistance(unit)) {
            distanceField.setError('That distance looks like a typo.');
            distanceField.focus();
            GR.play('error');
            return;
          }
          var km = D.toKm(value, unit);
          GR.actions.updatePlan(monthKey, function (current) {
            return D.setDayDistance(current, date, km);
          });
          instance.close('save');
        }
      })
    });

    return instance;
  }

  function planMismatchBanner(derived) {
    var mismatch = derived.mismatch;
    var plan = derived.plan;
    if (!mismatch || !mismatch.isMismatch || !plan || plan.mismatchAccepted) return null;

    var unit = derived.unit;
    var monthKey = plan.monthKey;
    var short = mismatch.difference < 0;

    return h(
      'div.banner',
      { class: short ? 'banner--danger' : '', role: 'status' },
      icon('warning'),
      h(
        'div.banner__body',
        {},
        h('p', {
          text:
            'Your plan no longer adds up to your goal. It totals ' +
            D.formatKm(mismatch.planned, unit) +
            ' against a target of ' +
            D.formatKm(mismatch.target, unit) +
            ' — ' +
            (short ? D.formatKm(Math.abs(mismatch.difference), unit) + ' short.' : D.formatKm(mismatch.difference, unit) + ' over.')
        }),
        h(
          'div.banner__actions',
          {},
          h(
            'button.btn.btn--secondary.btn--sm',
            {
              type: 'button',
              onclick: function () {
                GR.actions.acceptMismatch(monthKey);
              }
            },
            icon('check', { size: 14 }),
            'Keep my version'
          ),
          h(
            'button.btn.btn--ghost.btn--sm',
            {
              type: 'button',
              onclick: function () {
                GR.confirm({
                  title: 'Reset to the suggested plan?',
                  message: 'Every change you made to this month\u2019s schedule will be replaced by a freshly generated plan that matches your goal exactly.',
                  tone: 'danger',
                  confirmLabel: 'Reset plan'
                }).then(function (confirmed) {
                  if (confirmed) GR.actions.resetPlan(monthKey);
                });
              }
            },
            icon('refresh', { size: 14 }),
            'Reset to suggested'
          )
        )
      )
    );
  }

  function planDayButton(day, rowsByDate, unit, readOnly) {
    var row = rowsByDate[day.date];
    var isRun = day.type === 'run';
    var classes = [isRun ? 'plan-day--run' : 'plan-day--rest'];
    var note;

    if (day.date === D.todayKey()) classes.push('plan-day--today');

    if (row && !row.isFuture && !row.isRest && !row.isToday) {
      if (row.complete) {
        classes.push('plan-day--done');
        note = 'Done';
      } else {
        classes.push('plan-day--missed');
        note = 'Short ' + D.formatKm(row.shortfallKm, unit);
      }
    } else if (row && row.isRest) {
      note = row.actualKm > 0 ? 'Bonus ' + D.formatKm(row.actualKm, unit) : 'Recovery';
    } else if (row && row.isToday && !row.isRest) {
      note = row.complete ? 'Done today' : 'Today';
    } else {
      note = isRun ? 'Planned' : 'Recovery';
    }

    var label =
      D.formatDayLabel(day.date) +
      ' — ' +
      (isRun ? D.formatKm(day.distanceKm || 0, unit) : 'rest day') +
      (readOnly ? '' : '. Edit this day.');

    return h(
      'button.plan-day',
      {
        type: 'button',
        class: classes.join(' '),
        'aria-label': label,
        disabled: readOnly,
        onclick: function () {
          openPlanDayDialog(day.date);
        }
      },
      h('span.plan-day__date', { text: D.weekdayShort(day.date) + ' ' + dayNumber(day.date) }),
      h('span.plan-day__dist', { text: isRun ? D.formatKm(day.distanceKm || 0, unit) : 'Rest' }),
      h('span.plan-day__note', { text: note })
    );
  }

  function renderPlan() {
    var host = GR.$('#card-plan');
    if (!host) return;

    var derived = GR.select.derive();
    var unit = derived.unit;
    var goal = derived.goal;
    var plan = derived.plan;
    var readOnly = derived.isReadOnlyMonth;

    var actions = h('div.card__actions');
    if (plan && readOnly) {
      actions.appendChild(chip({ text: 'Past month · read only', variant: 'chip--muted', icon: 'lock' }));
    } else if (plan) {
      actions.appendChild(
        iconButton({
          icon: 'refresh',
          label: 'Regenerate training plan',
          onClick: function () {
            openPlanDialog();
          }
        })
      );
    }

    var head = h(
      'div.card__head',
      {},
      h('h2.card__title', {}, icon('calendar'), h('span', { text: 'Training plan' })),
      actions
    );

    var body = h('div.card__body');

    if (!goal) {
      body.appendChild(
        emptyState({
          icon: 'target',
          title: 'A plan needs a goal',
          text: 'Set a monthly distance goal first and GoRun will turn it into a week-by-week schedule.'
        })
      );
      GR.mount(host, [head, body]);
      return;
    }

    if (!plan) {
      body.appendChild(
        emptyState({
          icon: 'calendar',
          title: 'No plan yet',
          text:
            'Split ' +
            D.formatKm(goal.targetKm, unit) +
            ' across four weeks. Choose how many days a week you run and how the distance is spread.',
          action: readOnly
            ? null
            : h(
                'button.btn.btn--primary',
                {
                  type: 'button',
                  onclick: function () {
                    openPlanDialog();
                  }
                },
                icon('sparkle', { size: 16 }),
                'Generate plan'
              )
        })
      );
      GR.mount(host, [head, body]);
      return;
    }

    var totals = D.planTotals(plan);
    var styleEntry = D.DISTRIBUTION_STYLES.filter(function (entry) {
      return entry.key === plan.style;
    })[0];

    body.appendChild(
      h(
        'div.row__meta',
        {},
        chip({ text: plan.runDaysPerWeek + ' runs a week', variant: 'chip--accent', icon: 'run' }),
        chip({ text: styleEntry ? styleEntry.name : plan.style, variant: 'chip--muted', icon: 'chart' }),
        chip({ text: 'Total ' + D.formatKm(totals.monthlyTotal, unit), variant: 'chip--muted', icon: 'ruler' }),
        plan.customised ? chip({ text: 'Customised', variant: 'chip--warn', icon: 'pencil' }) : null
      )
    );

    var banner = planMismatchBanner(derived);
    if (banner) body.appendChild(banner);

    var rowsByDate = {};
    derived.weeks.forEach(function (week) {
      week.rows.forEach(function (row) {
        rowsByDate[row.date] = row;
      });
    });

    var weeksBox = h('div.plan-weeks.scroll-y');

    plan.weeks.forEach(function (week, index) {
      weeksBox.appendChild(
        h(
          'section.plan-week',
          { 'aria-label': 'Week ' + week.index },
          h(
            'div.plan-week__head',
            {},
            h('span.plan-week__title', {
              text: 'Week ' + week.index + ' · ' + D.formatDayLabel(week.startDate) + ' – ' + D.formatDayLabel(week.endDate)
            }),
            h('span.plan-week__total', { text: D.formatKm(totals.weeklyTotals[index], unit) })
          ),
          h(
            'div.plan-days',
            {},
            week.days.map(function (day) {
              return planDayButton(day, rowsByDate, unit, readOnly);
            })
          )
        )
      );
    });

    body.appendChild(weeksBox);

    if (!readOnly) {
      body.appendChild(h('p.field__hint', { text: 'Tap any day to change its distance, swap it for a rest day, or move the run elsewhere in the same week.' }));
    }

    GR.mount(host, [head, body]);
  }

  /* ========================================= activities (stories 5, 6, 7, 8) */

  function openActivityDialog(existing) {
    var derived = GR.select.derive();
    var unit = derived.unit;
    var today = D.todayKey();

    var dateInput = h('input', { type: 'date', max: today });
    dateInput.value = existing ? existing.date : today;
    var dateField = buildField({ label: 'When did you run?', control: dateInput });

    var distanceInput = h('input', {
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
      'data-autofocus': '',
      placeholder: 'e.g. 7.5'
    });
    distanceInput.value = existing ? String(D.numberInUnit(existing.distanceKm, unit)) : '';
    var distanceField = buildField({
      label: 'How far?',
      control: distanceInput,
      hint: 'In ' + D.unitName(unit) + ' (' + D.unitLabel(unit) + ').'
    });

    var durationInput = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', placeholder: 'e.g. 42:30' });
    durationInput.value = existing ? formatDurationInput(existing.durationSec) : '';
    var durationField = buildField({
      label: 'How long did it take?',
      control: durationInput,
      hint: 'Use mm:ss, hh:mm:ss, or plain minutes.'
    });

    var paceHint = h('p.field__hint', { text: 'Pace appears here as you type.' });

    function updatePace() {
      var distance = Number(String(distanceInput.value).trim());
      var seconds = D.parseDurationInput(durationInput.value);
      if (!isFinite(distance) || distance <= 0 || !seconds) {
        paceHint.textContent = 'Pace appears here as you type.';
        return;
      }
      var pace = D.calculatePace(D.toKm(distance, unit), seconds);
      var speed = D.calculateSpeed(D.toKm(distance, unit), seconds);
      paceHint.textContent =
        'Pace ' + (D.formatPace(pace, unit) || 'unavailable') + ' · ' + metricText(speed, 'km/h') ;
    }

    distanceInput.addEventListener('input', updatePace);
    durationInput.addEventListener('input', updatePace);
    updatePace();

    var type = existing ? existing.type : 'run';
    var typeSeg = segmented({
      ariaLabel: 'Activity type',
      value: type,
      options: D.ACTIVITY_TYPES.map(function (entry) {
        return { value: entry.key, label: entry.name };
      }),
      onChange: function (value) {
        type = value;
        GR.play('tick');
      }
    });
    var typeField = buildField({ tag: 'div.field', label: 'What was it?', control: typeSeg.el });

    var instance = GR.dialog({
      title: existing ? 'Edit activity' : 'Log a run',
      icon: 'run',
      size: 'sm',
      body: h(
        'div.form-grid',
        {},
        dateField.el,
        h('div.form-row', {}, distanceField.el, durationField.el),
        paceHint,
        typeField.el,
        h('p.field__hint', { text: 'Only runs count toward your monthly goal and streak.' })
      ),
      footer: dialogFooter({
        confirmLabel: existing ? 'Save changes' : 'Log it',
        onCancel: function () {
          instance.close('cancel');
        },
        onConfirm: function () {
          var result = D.validateActivityInput(
            {
              date: dateInput.value,
              distance: distanceInput.value,
              duration: durationInput.value,
              type: type
            },
            unit
          );

          if (!result.ok) {
            applyErrors({ date: dateField, distance: distanceField, duration: durationField }, result.errors);
            return;
          }

          if (existing) {
            GR.actions.updateActivity(existing.id, {
              date: result.value.date,
              distanceKm: result.value.distanceKm,
              durationSec: result.value.durationSec,
              type: result.value.type,
              corrected: result.value.type !== existing.autoType
            });
          } else {
            GR.actions.addActivity(result.value);
          }
          instance.close('save');
        }
      })
    });

    return instance;
  }

  function formatDurationInput(totalSeconds) {
    var s = Math.max(0, Math.round(Number(totalSeconds) || 0));
    var hours = Math.floor(s / 3600);
    var minutes = Math.floor((s % 3600) / 60);
    var seconds = s % 60;
    if (hours > 0) return hours + ':' + GR.pad2(minutes) + ':' + GR.pad2(seconds);
    return minutes + ':' + GR.pad2(seconds);
  }

  function activityRow(activity, unit) {
    var typeEntry =
      D.ACTIVITY_TYPES.filter(function (entry) {
        return entry.key === activity.type;
      })[0] || D.ACTIVITY_TYPES[2];

    var provider = activity.provider ? D.providerByKey(activity.provider) : null;
    var sourceLabel = provider ? provider.name : 'Manual';
    var isManual = !activity.provider;

    var meta = h(
      'div.row__meta',
      {},
      chip({ text: D.formatDuration(activity.durationSec), variant: 'chip--muted', icon: 'clock' }),
      chip({ text: D.formatPace(activity.paceMinPerKm, unit) || 'unavailable', variant: 'chip--muted', icon: 'chart' }),
      chip({ text: metricText(activity.speedKmh, 'km/h'), variant: 'chip--muted', icon: 'arrowRight' }),
      chip({ text: metricText(activity.strideM, 'm'), variant: 'chip--muted', icon: 'stride' }),
      chip({ text: metricText(activity.elevationM, 'm', 0), variant: 'chip--muted', icon: 'mountain' }),
      chip({ text: sourceLabel, variant: 'chip--muted', icon: isManual ? 'pencil' : 'cloud' }),
      activity.corrected
        ? chip({
            text: 'Corrected',
            variant: 'chip--warn',
            icon: 'check',
            title: 'Auto-detected as ' + (activity.autoType || 'unknown') + ', corrected by you'
          })
        : null
    );

    var typeSelect = selectControl({
      ariaLabel: 'Activity type for ' + D.formatDayLabel(activity.date) + ' ' + D.formatKm(activity.distanceKm, unit),
      value: activity.type,
      options: D.ACTIVITY_TYPES.map(function (entry) {
        return { value: entry.key, label: entry.name };
      }),
      onChange: function (value) {
        if (value !== activity.type) GR.actions.setActivityType(activity.id, value);
      }
    });

    var end = h('div.row__end', {}, typeSelect);

    if (isManual) {
      end.appendChild(
        iconButton({
          icon: 'pencil',
          label: 'Edit activity on ' + D.formatDayLabel(activity.date),
          variant: 'icon-btn--plain',
          onClick: function () {
            openActivityDialog(activity);
          }
        })
      );
    }

    end.appendChild(
      iconButton({
        icon: 'trash',
        label: 'Delete activity on ' + D.formatDayLabel(activity.date),
        variant: 'icon-btn--plain icon-btn--danger',
        onClick: function () {
          GR.confirm({
            title: 'Delete this activity?',
            message:
              D.formatKm(activity.distanceKm, unit) +
              ' on ' +
              D.formatDayLabel(activity.date) +
              ' will be removed. Progress, streaks and points are recalculated without it.',
            tone: 'danger',
            confirmLabel: 'Delete'
          }).then(function (confirmed) {
            if (confirmed) GR.actions.deleteActivity(activity.id);
          });
        }
      })
    );

    return h(
      'div.row',
      { dataset: { accent: typeEntry.accent } },
      h('span.row__avatar', {}, icon(typeEntry.icon, { size: 18 })),
      h(
        'div.row__main',
        {},
        h('p.row__title', { text: D.formatDayLabel(activity.date) + ' · ' + D.formatKm(activity.distanceKm, unit) }),
        meta
      ),
      end
    );
  }

  function renderActivities() {
    var host = GR.$('#card-activities');
    if (!host) return;

    var derived = GR.select.derive();
    var unit = derived.unit;
    var monthKey = derived.monthKey;

    var head = h(
      'div.card__head',
      {},
      h('h2.card__title', {}, icon('run'), h('span', { text: 'Activities' })),
      h(
        'div.card__actions',
        {},
        h(
          'button.btn.btn--primary.btn--sm',
          {
            type: 'button',
            onclick: function () {
              openActivityDialog(null);
            }
          },
          icon('plus', { size: 14 }),
          'Log run'
        ),
        h(
          'button.btn.btn--secondary.btn--sm',
          {
            type: 'button',
            onclick: function () {
              GR.actions.syncAll(monthKey);
            }
          },
          icon('refresh', { size: 14 }),
          'Sync'
        )
      )
    );

    var filterSeg = segmented({
      ariaLabel: 'Filter activities by type',
      value: activityFilter,
      options: [
        { value: 'all', label: 'All' },
        { value: 'run', label: 'Runs' },
        { value: 'walk', label: 'Walks' },
        { value: 'other', label: 'Other' }
      ],
      onChange: function (value) {
        activityFilter = value;
        GR.play('tick');
        renderActivities();
      }
    });

    var runKm = D.runKmBetween(derived.activities, monthKey + '-01', lastDayOfMonth(monthKey));

    var body = h(
      'div.card__body',
      {},
      filterSeg.el,
      h(
        'div.row__meta',
        {},
        chip({ text: D.formatKm(runKm, unit) + ' of running in ' + D.formatMonthLabel(monthKey, { short: true }), variant: 'chip--accent', icon: 'run' }),
        chip({ text: 'Only runs count toward your goal', variant: 'chip--muted', icon: 'info' })
      )
    );

    var visible = derived.monthActivities.filter(function (activity) {
      return activityFilter === 'all' || activity.type === activityFilter;
    });

    if (!visible.length) {
      body.appendChild(
        emptyState({
          icon: 'run',
          title: derived.monthActivities.length ? 'Nothing matches that filter' : 'No activities yet',
          text: derived.monthActivities.length
            ? 'Try a different filter to see the rest of this month.'
            : 'Log a run by hand, or connect a health source and sync to pull in what you have already done.'
        })
      );
    } else {
      var list = h('div.list.scroll-y');
      visible.forEach(function (activity) {
        list.appendChild(activityRow(activity, unit));
      });
      body.appendChild(list);
    }

    GR.mount(host, [head, body]);
  }

  /* ================================================== connected sources (story 4) */

  function openConsentDialog(provider) {
    var instance = GR.dialog({
      title: 'Connect ' + provider.name,
      icon: 'plug',
      size: 'sm',
      body: h(
        'div.form-grid',
        {},
        h('p.dialog__message', { text: provider.name + ' would share the following with GoRun:' }),
        h(
          'div.list',
          {},
          provider.scopes.map(function (scope) {
            return h(
              'div.row.row--sunk',
              {},
              h('span.row__avatar', {}, icon('check', { size: 16 })),
              h('div.row__main', {}, h('p.row__title', { text: scope }))
            );
          })
        ),
        h('p.dialog__message', { text: 'Only your activity and health data is requested. Nothing else is read, and nothing is sent anywhere.' }),
        h('p.field__hint', {
          text:
            'Heads up: GoRun has no backend, so this build simulates the ' +
            provider.name +
            ' connection and generates plausible activities on your device. It is not a real account link.'
        })
      ),
      footer: [
        h('button.btn.btn--ghost', { type: 'button', onclick: function () { instance.close('cancel'); } }, 'Cancel'),
        h(
          'button.btn.btn--primary',
          {
            type: 'button',
            'data-autofocus': '',
            onclick: function () {
              var monthKey = GR.select.derive().monthKey;
              GR.actions.connectProvider(provider.key);
              GR.actions.syncProvider(provider.key, monthKey);
              instance.close('allow');
            }
          },
          'Allow'
        )
      ]
    });
    return instance;
  }

  function openDisconnectDialog(provider) {
    var imported = GR.getState().activities.filter(function (activity) {
      return activity.provider === provider.key;
    }).length;

    var checkbox = h('input', { type: 'checkbox' });

    var instance = GR.dialog({
      title: 'Disconnect ' + provider.name + '?',
      icon: 'plug',
      size: 'sm',
      body: h(
        'div.form-grid',
        {},
        h('p.dialog__message', {
          text:
            'GoRun will stop importing from ' +
            provider.name +
            '. ' +
            (imported
              ? imported + ' activity' + (imported === 1 ? '' : ' entries') + ' came from this source.'
              : 'Nothing has been imported from this source yet.')
        }),
        h(
          'label.row.row--sunk',
          {},
          checkbox,
          h('div.row__main', {}, h('p.row__title', { text: 'Also delete activities imported from this source' }))
        )
      ),
      footer: [
        h('button.btn.btn--ghost', { type: 'button', onclick: function () { instance.close('cancel'); } }, 'Cancel'),
        h(
          'button.btn.btn--danger',
          {
            type: 'button',
            onclick: function () {
              GR.actions.disconnectProvider(provider.key, checkbox.checked);
              instance.close('disconnect');
            }
          },
          'Disconnect'
        )
      ]
    });

    return instance;
  }

  function providerRow(provider, record, monthKey) {
    var connected = !!(record && record.connected);
    var lastSync = 'Never synced';
    if (connected && record.lastSyncAt) {
      var parsed = new Date(record.lastSyncAt);
      lastSync = isNaN(parsed.getTime()) ? 'Never synced' : 'Last sync ' + parsed.toLocaleString();
    }

    var end = h('div.row__end');

    if (connected) {
      end.appendChild(
        h(
          'button.btn.btn--secondary.btn--sm',
          {
            type: 'button',
            onclick: function () {
              GR.actions.syncProvider(provider.key, monthKey);
            }
          },
          icon('refresh', { size: 14 }),
          'Sync now'
        )
      );
      end.appendChild(
        h(
          'button.btn.btn--ghost.btn--sm',
          {
            type: 'button',
            onclick: function () {
              openDisconnectDialog(provider);
            }
          },
          'Disconnect'
        )
      );
    } else {
      end.appendChild(
        h(
          'button.btn.btn--primary.btn--sm',
          {
            type: 'button',
            onclick: function () {
              openConsentDialog(provider);
            }
          },
          icon('link', { size: 14 }),
          'Connect'
        )
      );
    }

    return h(
      'div.row',
      { dataset: { accent: provider.accent } },
      h('span.row__avatar', {}, icon(connected ? 'plug' : 'cloud', { size: 18 })),
      h(
        'div.row__main',
        {},
        h('p.row__title', { text: provider.name }),
        h(
          'div.row__meta',
          {},
          chip({
            text: connected ? 'Connected' : 'Not connected',
            variant: connected ? 'chip--ok' : 'chip--muted',
            icon: connected ? 'check' : 'close'
          }),
          connected ? chip({ text: lastSync, variant: 'chip--muted', icon: 'clock' }) : null
        )
      ),
      end
    );
  }

  function renderSources() {
    var host = GR.$('#card-sources');
    if (!host) return;

    var derived = GR.select.derive();
    var providers = derived.state.providers || {};
    var monthKey = derived.monthKey;

    var connectedCount = D.PROVIDERS.filter(function (provider) {
      return providers[provider.key] && providers[provider.key].connected;
    }).length;

    var actions = h('div.card__actions');
    if (connectedCount) {
      actions.appendChild(
        h(
          'button.btn.btn--secondary.btn--sm',
          {
            type: 'button',
            onclick: function () {
              GR.actions.syncAll(monthKey);
            }
          },
          icon('refresh', { size: 14 }),
          'Sync all'
        )
      );
    }

    var head = h(
      'div.card__head',
      {},
      h('h2.card__title', {}, icon('plug'), h('span', { text: 'Connected sources' })),
      actions
    );

    var list = h('div.list');
    D.PROVIDERS.forEach(function (provider) {
      list.appendChild(providerRow(provider, providers[provider.key], monthKey));
    });

    var body = h(
      'div.card__body',
      {},
      list,
      h('p.field__hint', {
        text: 'GoRun runs entirely on your device with no backend, so these connections are simulated locally — activities are generated for the selected month rather than fetched from a real account.'
      })
    );

    GR.mount(host, [head, body]);
  }

  /* ================================================================== register */

  GR.ui.openGoalDialog = openGoalDialog;
  GR.ui.openPlanDialog = openPlanDialog;
  GR.ui.openPlanDayDialog = openPlanDayDialog;
  GR.ui.openActivityDialog = openActivityDialog;

  GR.registerPanel('goal', renderGoal);
  GR.registerPanel('plan', renderPlan);
  GR.registerPanel('activities', renderActivities);
  GR.registerPanel('sources', renderSources);
})(window);
