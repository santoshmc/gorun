/* GoRun — derived state + actions
 * UI modules read from GR.select.* and write only through GR.actions.*
 */
(function (global) {
  'use strict';

  var GR = global.GR;
  var D = GR.domain;

  /* ============================================================== select */

  var cache = null;

  function invalidate() {
    cache = null;
  }

  function activeMonthKey(state) {
    if (state.activeMonth && D.isValidMonthKey(state.activeMonth)) return state.activeMonth;
    return D.currentMonthKey();
  }

  function derive() {
    if (cache) return cache;
    var state = GR.getState();
    var unit = state.settings.unit;
    var monthKey = activeMonthKey(state);
    var goal = state.goals[monthKey] || null;
    var plan = state.plans[monthKey] || null;
    var activities = state.activities;
    var today = D.todayKey();

    var weeks = plan
      ? plan.weeks.map(function (week) {
          return D.weekProgress(week, activities);
        })
      : [];

    var month = goal ? D.monthProgress(goal, activities) : null;

    var todayRow = null;
    var yesterdayRow = null;
    if (plan) {
      var hit = D.findDay(plan, today);
      if (hit) todayRow = D.dailyCompletion(hit.day, activities);
      var yHit = D.findDay(plan, D.addDays(today, -1));
      if (yHit) {
        var yRow = D.dailyCompletion(yHit.day, activities);
        if (!yRow.isRest && !yRow.complete) yesterdayRow = yRow;
      }
    }

    var streak = D.calculateStreak(state.plans, activities);
    var challenges = D.evaluateChallenges(state);
    var points = D.calculatePoints(state);

    var earnedMap = D.evaluateBadges(state, { streak: streak, challenges: challenges });
    var badges = D.BADGES.map(function (badge) {
      return Object.assign({}, badge, {
        earned: !!earnedMap[badge.id],
        earnedAt: state.badgeHistory[badge.id] || null
      });
    });

    var currentWeek =
      weeks.filter(function (w) {
        return w.isCurrent;
      })[0] || weeks[weeks.length - 1] || null;

    var coach = D.coachingMessage({
      unit: unit,
      hasGoal: !!goal,
      hasPlan: !!plan,
      month: month || { percent: 0, targetKm: 0, remainingKm: 0, daysLeft: 0, dailyAverageNeededKm: 0, actualKm: 0, achieved: false },
      today: todayRow,
      missedYesterday: yesterdayRow,
      streak: streak
    });

    var historyMonths = Object.keys(state.goals)
      .sort()
      .reverse()
      .map(function (key) {
        return D.monthProgress(state.goals[key], activities);
      });

    cache = {
      state: state,
      unit: unit,
      monthKey: monthKey,
      goal: goal,
      plan: plan,
      activities: activities,
      monthActivities: D.activitiesInMonth(activities, monthKey).sort(function (a, b) {
        return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
      }),
      month: month,
      weeks: weeks,
      currentWeek: currentWeek,
      today: todayRow,
      missedYesterday: yesterdayRow,
      streak: streak,
      badges: badges,
      earnedBadgeIds: Object.keys(earnedMap),
      points: points,
      challenges: challenges,
      historyMonths: historyMonths,
      coach: coach,
      mismatch: plan && goal ? D.planMismatch(plan, goal.targetKm) : null,
      isPastMonth: D.isPastMonth(monthKey),
      isReadOnlyMonth: D.isPastMonth(monthKey)
    };

    return cache;
  }

  GR.select = {
    derive: derive,
    invalidate: invalidate,
    activeMonthKey: activeMonthKey
  };

  /* ============================================================= actions */

  /** Wraps a state mutation: persist, recompute, re-render, announce new badges. */
  function commit(mutator, options) {
    var opts = options || {};
    var before = derive().earnedBadgeIds;
    GR.update(function (state) {
      mutator(state);
    }, { silent: true });
    invalidate();

    var after = derive();
    var fresh = after.earnedBadgeIds.filter(function (id) {
      return before.indexOf(id) === -1;
    });
    var revoked = before.filter(function (id) {
      return after.earnedBadgeIds.indexOf(id) === -1;
    });

    if (fresh.length || revoked.length) {
      GR.update(function (state) {
        fresh.forEach(function (id) {
          if (!state.badgeHistory[id]) state.badgeHistory[id] = new Date().toISOString();
        });
        revoked.forEach(function (id) {
          delete state.badgeHistory[id];
          delete state.seenBadges[id];
        });
      }, { silent: true });
      invalidate();
      derive();
    }

    GR.renderAll();

    fresh.forEach(function (id) {
      var badge = D.badgeById(id);
      if (!badge) return;
      GR.toast('Badge unlocked — ' + badge.name, { tone: 'success', icon: badge.icon, detail: badge.criteria, sound: false });
      GR.play('levelUp');
      GR.confetti();
    });

    revoked.forEach(function (id) {
      var badge = D.badgeById(id);
      if (badge) GR.toast('Badge revoked — ' + badge.name, { tone: 'danger', icon: 'warning', detail: 'The achievement behind it no longer holds.' });
    });

    if (opts.sound) GR.play(opts.sound);
    if (opts.toast) GR.toast(opts.toast.message, opts.toast.options);
    if (opts.confetti && !fresh.length) GR.confetti();
  }

  function recomputeChallengeCompletion() {
    // Challenge completion is derived; nothing to persist.
  }

  var actions = {
    commit: commit,

    /* ---- settings ---- */
    setUnit: function (unit) {
      commit(function (state) {
        state.settings.unit = unit === 'mi' ? 'mi' : 'km';
      }, { sound: 'tick' });
    },

    toggleSound: function () {
      var next = !GR.getState().settings.soundEnabled;
      commit(function (state) {
        state.settings.soundEnabled = next;
      });
      if (next) GR.play('pop');
    },

    setActiveMonth: function (monthKey) {
      commit(function (state) {
        state.activeMonth = monthKey;
      }, { sound: 'swoosh' });
    },

    toggleLeaderboardOptOut: function () {
      commit(function (state) {
        state.settings.leaderboardOptOut = !state.settings.leaderboardOptOut;
      }, { sound: 'tick' });
    },

    setReminders: function (enabled, frequency) {
      commit(function (state) {
        state.settings.remindersEnabled = !!enabled;
        if (frequency) state.settings.reminderFrequency = frequency;
      }, { sound: 'tick' });
    },

    /* ---- goals (story 1) ---- */
    saveGoal: function (input) {
      var existing = GR.getState().goals[input.monthKey];
      commit(
        function (state) {
          var now = new Date().toISOString();
          state.goals[input.monthKey] = {
            id: existing ? existing.id : GR.uid('goal'),
            monthKey: input.monthKey,
            targetKm: input.targetKm,
            createdAt: existing ? existing.createdAt : now,
            updatedAt: now
          };
          state.settings.unit = input.unit;
          state.activeMonth = input.monthKey;

          // Keep an existing plan honest about the new target.
          var plan = state.plans[input.monthKey];
          if (plan) plan.targetKm = input.targetKm;
        },
        {
          confetti: !existing,
          sound: 'success',
          toast: {
            message: existing ? 'Goal updated' : 'Goal set — nice',
            options: { tone: 'success', icon: 'target', sound: false }
          }
        }
      );
    },

    deleteGoal: function (monthKey) {
      commit(
        function (state) {
          delete state.goals[monthKey];
          delete state.plans[monthKey];
        },
        { sound: 'swoosh', toast: { message: 'Goal removed', options: { tone: 'info', icon: 'trash', sound: false } } }
      );
    },

    /* ---- training plan (stories 2 & 3) ---- */
    savePlan: function (plan) {
      commit(
        function (state) {
          state.plans[plan.monthKey] = plan;
        },
        {
          sound: 'success',
          toast: { message: 'Training plan saved', options: { tone: 'success', icon: 'calendar', sound: false } }
        }
      );
    },

    deletePlan: function (monthKey) {
      commit(
        function (state) {
          delete state.plans[monthKey];
        },
        { sound: 'swoosh', toast: { message: 'Plan removed', options: { tone: 'info', icon: 'trash', sound: false } } }
      );
    },

    updatePlan: function (monthKey, transform, options) {
      commit(function (state) {
        var plan = state.plans[monthKey];
        if (!plan) return;
        state.plans[monthKey] = transform(plan);
      }, options || { sound: 'tick' });
    },

    resetPlan: function (monthKey) {
      commit(
        function (state) {
          var plan = state.plans[monthKey];
          if (!plan) return;
          state.plans[monthKey] = D.regeneratePlan(plan);
        },
        {
          sound: 'whoosh',
          toast: { message: 'Plan reset to the generated schedule', options: { tone: 'info', icon: 'refresh', sound: false } }
        }
      );
    },

    acceptMismatch: function (monthKey) {
      commit(
        function (state) {
          if (state.plans[monthKey]) state.plans[monthKey].mismatchAccepted = true;
        },
        { sound: 'tick', toast: { message: 'Keeping your version of the plan', options: { tone: 'info', icon: 'check', sound: false } } }
      );
    },

    /* ---- providers (story 4) ---- */
    connectProvider: function (key) {
      var provider = D.providerByKey(key);
      if (!provider) return;
      commit(
        function (state) {
          state.providers[key] = {
            key: key,
            connected: true,
            connectedAt: new Date().toISOString(),
            lastSyncAt: null,
            scopes: provider.scopes.slice()
          };
        },
        {
          sound: 'success',
          toast: { message: provider.name + ' connected', options: { tone: 'success', icon: 'plug', sound: false } }
        }
      );
    },

    disconnectProvider: function (key, removeData) {
      var provider = D.providerByKey(key);
      commit(
        function (state) {
          delete state.providers[key];
          if (removeData) {
            state.activities = state.activities.filter(function (a) {
              return a.provider !== key;
            });
          }
        },
        {
          sound: 'swoosh',
          toast: {
            message: (provider ? provider.name : 'Source') + ' disconnected',
            options: { tone: 'info', icon: 'plug', sound: false, detail: removeData ? 'Imported activities were deleted.' : 'Imported activities were kept.' }
          }
        }
      );
    },

    /* ---- import (story 5) ---- */
    syncProvider: function (key, monthKey) {
      var state = GR.getState();
      if (!state.providers[key] || !state.providers[key].connected) return { imported: 0, skipped: 0 };
      var incoming = D.fetchProviderActivities(key, monthKey);
      var imported = 0;
      var skipped = 0;

      commit(
        function (draft) {
          incoming.forEach(function (raw) {
            var activity = D.buildActivity(raw);
            if (D.isDuplicate(activity, draft.activities)) {
              skipped += 1;
              return;
            }
            draft.activities.push(activity);
            imported += 1;
          });
          draft.providers[key].lastSyncAt = new Date().toISOString();
        },
        {
          sound: imported ? 'success' : 'tick',
          toast: {
            message: imported ? 'Imported ' + imported + ' activities' : 'Already up to date',
            options: {
              tone: imported ? 'success' : 'info',
              icon: 'refresh',
              sound: false,
              detail: skipped ? skipped + ' duplicate' + (skipped === 1 ? '' : 's') + ' skipped.' : null
            }
          }
        }
      );

      return { imported: imported, skipped: skipped };
    },

    syncAll: function (monthKey) {
      var state = GR.getState();
      var connected = Object.keys(state.providers).filter(function (k) {
        return state.providers[k].connected;
      });
      if (!connected.length) {
        GR.toast('Connect a health source first', { tone: 'info', icon: 'plug' });
        return;
      }
      var imported = 0;
      var skipped = 0;
      commit(
        function (draft) {
          connected.forEach(function (key) {
            D.fetchProviderActivities(key, monthKey).forEach(function (raw) {
              var activity = D.buildActivity(raw);
              if (D.isDuplicate(activity, draft.activities)) {
                skipped += 1;
                return;
              }
              draft.activities.push(activity);
              imported += 1;
            });
            draft.providers[key].lastSyncAt = new Date().toISOString();
          });
        },
        {
          sound: imported ? 'success' : 'tick',
          toast: {
            message: imported ? 'Imported ' + imported + ' activities' : 'Everything is already in sync',
            options: {
              tone: imported ? 'success' : 'info',
              icon: 'refresh',
              sound: false,
              detail: skipped ? skipped + ' duplicate' + (skipped === 1 ? '' : 's') + ' skipped.' : null
            }
          }
        }
      );
    },

    /* ---- activities (stories 6, 7, 8) ---- */
    addActivity: function (input) {
      var activity = D.buildActivity({
        date: input.date,
        distanceKm: input.distanceKm,
        durationSec: input.durationSec,
        type: input.type,
        source: 'manual'
      });
      commit(
        function (state) {
          state.activities.push(activity);
        },
        {
          sound: 'success',
          confetti: activity.type === 'run',
          toast: {
            message: 'Logged ' + D.formatKm(activity.distanceKm, GR.getState().settings.unit),
            options: { tone: 'success', icon: 'run', sound: false, detail: D.formatPace(activity.paceMinPerKm, GR.getState().settings.unit) }
          }
        }
      );
      return activity;
    },

    updateActivity: function (id, patch) {
      commit(
        function (state) {
          state.activities = state.activities.map(function (a) {
            if (a.id !== id) return a;
            var next = Object.assign({}, a, patch, { updatedAt: new Date().toISOString() });
            next.paceMinPerKm = D.calculatePace(next.distanceKm, next.durationSec);
            next.speedKmh = D.calculateSpeed(next.distanceKm, next.durationSec);
            return next;
          });
        },
        { sound: 'tick', toast: { message: 'Activity updated', options: { tone: 'success', icon: 'pencil', sound: false } } }
      );
    },

    setActivityType: function (id, type) {
      commit(
        function (state) {
          state.activities = state.activities.map(function (a) {
            if (a.id !== id) return a;
            return Object.assign({}, a, {
              type: type,
              corrected: type !== a.autoType,
              updatedAt: new Date().toISOString()
            });
          });
        },
        {
          sound: 'tick',
          toast: { message: 'Reclassified as ' + type, options: { tone: 'info', icon: type === 'run' ? 'run' : type === 'walk' ? 'walk' : 'bike', sound: false, detail: 'Progress, streaks and points were recalculated.' } }
        }
      );
    },

    deleteActivity: function (id) {
      commit(
        function (state) {
          state.activities = state.activities.filter(function (a) {
            return a.id !== id;
          });
        },
        { sound: 'swoosh', toast: { message: 'Activity deleted', options: { tone: 'info', icon: 'trash', sound: false } } }
      );
    },

    /* ---- friends (story 14) ---- */
    inviteFriend: function (name) {
      var friend = D.makeFriend(name, 'sent');
      commit(
        function (state) {
          state.friends.push(friend);
        },
        {
          sound: 'success',
          toast: { message: 'Invite sent to ' + name, options: { tone: 'success', icon: 'users', sound: false } }
        }
      );
      return friend;
    },

    acceptFriend: function (id) {
      commit(
        function (state) {
          state.friends = state.friends.map(function (f) {
            return f.id === id ? Object.assign({}, f, { status: 'accepted', acceptedAt: new Date().toISOString() }) : f;
          });
        },
        { sound: 'success', toast: { message: 'Invite accepted', options: { tone: 'success', icon: 'users', sound: false } } }
      );
    },

    removeFriend: function (id) {
      commit(
        function (state) {
          state.friends = state.friends.filter(function (f) {
            return f.id !== id;
          });
        },
        { sound: 'swoosh', toast: { message: 'Contact removed', options: { tone: 'info', icon: 'trash', sound: false } } }
      );
    },

    importContacts: function (names) {
      commit(
        function (state) {
          names.forEach(function (name) {
            var exists = state.friends.some(function (f) {
              return f.name === name;
            });
            if (!exists) state.friends.push(D.makeFriend(name, 'sent'));
          });
        },
        {
          sound: 'success',
          toast: { message: 'Invited ' + names.length + ' contact' + (names.length === 1 ? '' : 's'), options: { tone: 'success', icon: 'users', sound: false } }
        }
      );
    },

    /* ---- challenges (story 17) ---- */
    joinChallenge: function (id) {
      commit(
        function (state) {
          state.challenges[id] = { joinedAt: new Date().toISOString() };
        },
        { sound: 'success', confetti: true, toast: { message: 'Challenge joined', options: { tone: 'success', icon: 'flag', sound: false } } }
      );
      recomputeChallengeCompletion();
    },

    leaveChallenge: function (id) {
      commit(
        function (state) {
          delete state.challenges[id];
        },
        { sound: 'swoosh', toast: { message: 'You left the challenge', options: { tone: 'info', icon: 'flag', sound: false } } }
      );
    },

    /* ---- misc ---- */
    markBadgesSeen: function () {
      commit(function (state) {
        derive().badges.forEach(function (badge) {
          if (badge.earned) state.seenBadges[badge.id] = true;
        });
      });
    },

    resetEverything: function () {
      GR.storage.reset();
      invalidate();
      GR.renderAll();
      GR.toast('All local data cleared', { tone: 'info', icon: 'trash' });
    }
  };

  GR.actions = actions;
})(window);
