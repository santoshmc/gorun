/* GoRun — bootstrap
 * App bar, month switcher, settings, PWA install, service worker, first render.
 */
(function (global) {
  'use strict';

  var GR = global.GR;
  var D = GR.domain;
  var h = GR.h;
  var icon = GR.icon;

  /* ------------------------------------------------------- month switcher */

  function renderMonthSwitcher() {
    var host = GR.$('#month-switcher');
    if (!host) return;
    var monthKey = GR.select.activeMonthKey(GR.getState());

    GR.mount(host, [
      h(
        'button.icon-btn.icon-btn--plain',
        {
          type: 'button',
          'aria-label': 'Previous month',
          onclick: function () {
            GR.actions.setActiveMonth(D.addMonths(monthKey, -1));
          }
        },
        icon('arrowRight', { size: 16, className: 'flip' })
      ),
      h('span.month-switcher__label', { text: D.formatMonthLabel(monthKey, { short: true }) }),
      h(
        'button.icon-btn.icon-btn--plain',
        {
          type: 'button',
          'aria-label': 'Next month',
          onclick: function () {
            GR.actions.setActiveMonth(D.addMonths(monthKey, 1));
          }
        },
        icon('arrowRight', { size: 16 })
      ),
      monthKey !== D.currentMonthKey()
        ? h(
            'button.btn.btn--sm.btn--ghost',
            {
              type: 'button',
              onclick: function () {
                GR.actions.setActiveMonth(D.currentMonthKey());
              }
            },
            'Today'
          )
        : null
    ]);

    // The back arrow reuses the forward icon, mirrored.
    var flipped = GR.$('.flip', host);
    if (flipped) flipped.style.transform = 'scaleX(-1)';
  }

  /* ------------------------------------------------------------ sound btn */

  function renderSoundButton() {
    var btn = GR.$('#sound-btn');
    if (!btn) return;
    var on = GR.getState().settings.soundEnabled;
    GR.mount(btn, icon(on ? 'sound' : 'mute', { size: 18 }));
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Mute sound effects' : 'Unmute sound effects');
  }

  /* -------------------------------------------------------- storage banner */

  function renderStorageBanner(issue) {
    var host = GR.$('#storage-banner');
    if (!host) return;
    if (!issue) {
      host.hidden = true;
      GR.clear(host);
      return;
    }

    var copy = {
      'write-failed': 'Changes cannot be saved right now — your browser refused to write to local storage. The app still works, but data will be lost when you close the tab.',
      'corrupt-data': 'Some saved data could not be read and was skipped. Everything else was restored.',
      unavailable: 'Local storage is unavailable, so nothing can be saved. Private browsing often causes this.'
    };

    host.hidden = false;
    GR.mount(
      host,
      h(
        'div.banner.banner--danger',
        {},
        icon('warning'),
        h('div.banner__body', { text: copy[issue] || 'There was a storage problem.' })
      )
    );
  }

  /* ------------------------------------------------------------- settings */

  function openSettings() {
    var state = GR.getState();
    var instance;

    function body() {
      var s = GR.getState().settings;

      return h(
        'div.form-grid',
        {},
        h(
          'div.field',
          {},
          h('span.field__label', { text: 'Preferred distance unit' }),
          h(
            'div.seg',
            { role: 'group', 'aria-label': 'Distance unit' },
            ['km', 'mi'].map(function (unit) {
              return h(
                'button.seg__btn',
                {
                  type: 'button',
                  class: s.unit === unit ? 'is-active' : '',
                  'aria-pressed': s.unit === unit ? 'true' : 'false',
                  onclick: function () {
                    GR.actions.setUnit(unit);
                    refresh();
                  }
                },
                unit === 'km' ? 'Kilometres' : 'Miles'
              );
            })
          ),
          h('span.field__hint', { text: 'Distances are stored in kilometres and converted for display, so switching is always safe.' })
        ),

        h(
          'div.field',
          {},
          h('span.field__label', { text: 'Sound effects' }),
          h(
            'button.btn',
            {
              type: 'button',
              class: s.soundEnabled ? 'btn--primary' : 'btn--secondary',
              onclick: function () {
                GR.actions.toggleSound();
                refresh();
              }
            },
            icon(s.soundEnabled ? 'sound' : 'mute', { size: 16 }),
            s.soundEnabled ? 'Sound on' : 'Sound off'
          )
        ),

        h(
          'div.field',
          {},
          h('span.field__label', { text: 'Sample data' }),
          h(
            'button.btn.btn--secondary',
            {
              type: 'button',
              onclick: function () {
                seedDemoData();
                instance.close('done');
              }
            },
            icon('sparkle', { size: 16 }),
            'Fill this month with sample data'
          ),
          h('span.field__hint', { text: 'Sets a goal, builds a plan, connects a demo health source and imports activities so you can see every panel working.' })
        ),

        h(
          'div.field',
          {},
          h('span.field__label', { text: 'Your data' }),
          h('span.field__hint', {
            text:
              'Everything lives in this browser only — there is no account and no server. ' +
              'Clearing site data or using a different browser starts you from scratch.'
          }),
          h(
            'button.btn.btn--danger',
            {
              type: 'button',
              onclick: function () {
                GR.confirm({
                  title: 'Erase all GoRun data?',
                  message: 'Goals, plans, activities, badges and points on this device will be deleted. This cannot be undone.',
                  confirmLabel: 'Erase everything',
                  tone: 'danger'
                }).then(function (ok) {
                  if (!ok) return;
                  startFresh();
                  instance.close('reset');
                });
              }
            },
            icon('trash', { size: 16 }),
            'Erase all data'
          )
        )
      );
    }

    function refresh() {
      var host = GR.$('.dialog__body', instance.panel);
      if (host) GR.mount(host, body());
      renderChrome();
    }

    instance = GR.dialog({
      title: 'Settings',
      icon: 'settings',
      size: 'sm',
      body: body(),
      footer: h('button.btn.btn--primary', { type: 'button', onclick: function () { instance.close('done'); } }, 'Done')
    });

    void state;
  }

  /* ------------------------------------------------------------ demo data */

  /** Gives every panel something to show without the runner typing anything. */
  function seedDemoData(options) {
    var opts = options || {};
    var monthKey = GR.select.activeMonthKey(GR.getState());
    var unit = GR.getState().settings.unit;

    GR.actions.saveGoal({ monthKey: monthKey, targetKm: 100, unit: unit });
    GR.actions.savePlan(D.generatePlan({ monthKey: monthKey, targetKm: 100, runDaysPerWeek: 4, style: 'progressive' }));
    GR.actions.connectProvider('strava');
    GR.actions.syncProvider('strava', monthKey);
    GR.actions.inviteFriend('Maya Patel');

    var maya = GR.getState().friends.filter(function (f) {
      return f.name === 'Maya Patel';
    })[0];
    if (maya) GR.actions.acceptFriend(maya.id);

    GR.actions.joinChallenge('monthly-100');

    GR.actions.commit(function (state) {
      state.settings.demoSeeded = true;
      state.settings.onboarded = true;
    });

    if (!opts.silent) {
      GR.toast('Sample data loaded', { tone: 'success', icon: 'sparkle', detail: 'Clear it any time to start fresh.' });
    }
  }

  /** Wipes everything but remembers the runner has been here, so it stays empty. */
  function startFresh() {
    GR.storage.reset();
    GR.select.invalidate();
    GR.update(function (state) {
      state.settings.onboarded = true;
      state.settings.demoSeeded = false;
    }, { silent: true });
    GR.select.invalidate();
    GR.renderAll();
    GR.play('swoosh');
    GR.toast('Cleared — the dashboard is yours now', { tone: 'info', icon: 'sparkle', sound: false });
  }

  /** A blank dashboard is a poor first impression, so populate it once. */
  function seedOnFirstVisit() {
    var state = GR.getState();
    var untouched =
      !state.settings.onboarded &&
      !Object.keys(state.goals).length &&
      !state.activities.length;

    if (untouched) seedDemoData({ silent: true });
  }

  function renderDemoBanner() {
    var host = GR.$('#demo-banner');
    if (!host) return;

    if (!GR.getState().settings.demoSeeded) {
      host.hidden = true;
      GR.clear(host);
      return;
    }

    host.hidden = false;
    GR.mount(
      host,
      h(
        'div.banner.banner--info',
        {},
        icon('sparkle'),
        h(
          'div.banner__body',
          {},
          h('strong', { text: 'You are looking at sample data.' }),
          ' A goal, a training plan and a month of imported runs, so every panel has something to show.',
          h(
            'div.banner__actions',
            {},
            h(
              'button.btn.btn--sm',
              { type: 'button', onclick: startFresh },
              icon('refresh', { size: 14 }),
              'Clear it and start fresh'
            )
          )
        )
      )
    );
  }

  /* --------------------------------------------------------- PWA install */

  var deferredPrompt = null;

  function setupInstall() {
    var btn = GR.$('#install-btn');
    if (!btn) return;

    global.addEventListener('beforeinstallprompt', function (event) {
      event.preventDefault();
      deferredPrompt = event;
      btn.hidden = false;
    });

    btn.addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (choice) {
        if (choice && choice.outcome === 'accepted') {
          GR.toast('GoRun installed', { tone: 'success', icon: 'check' });
        }
        deferredPrompt = null;
        btn.hidden = true;
      });
    });

    global.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      btn.hidden = true;
    });
  }

  /** A service worker needs http(s); from file:// the app simply runs uncached. */
  function setupServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    global.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        console.warn('[GoRun] service worker registration failed', err);
      });
    });
  }

  /* ------------------------------------------------------------- chrome */

  /**
   * Cards that cannot do anything useful until a goal exists are dimmed,
   * so the empty dashboard points at the one action that matters.
   */
  var GOAL_DEPENDENT_CARDS = ['month', 'streak', 'today', 'week', 'plan', 'badges', 'points', 'leaderboard', 'challenges', 'history'];

  function applyFocusState() {
    var hasGoal = !!GR.select.derive().goal;
    GOAL_DEPENDENT_CARDS.forEach(function (name) {
      var card = GR.$('#card-' + name);
      if (card) card.classList.toggle('card--dormant', !hasGoal);
    });
    document.body.classList.toggle('is-first-run', !hasGoal);
  }

  function renderChrome() {
    renderMonthSwitcher();
    renderSoundButton();
    renderDemoBanner();
    applyFocusState();
  }

  /* --------------------------------------------------------------- boot */

  function boot() {
    GR.storage.load();
    GR.select.invalidate();

    GR.storage.onIssue(renderStorageBanner);
    renderStorageBanner(GR.storage.getIssue());

    var settingsBtn = GR.$('#settings-btn');
    if (settingsBtn) {
      GR.mount(settingsBtn, icon('settings', { size: 18 }));
      settingsBtn.addEventListener('click', openSettings);
    }

    var soundBtn = GR.$('#sound-btn');
    if (soundBtn) soundBtn.addEventListener('click', GR.actions.toggleSound);

    // The progress panel asks for the log-run form without depending on the core UI module.
    document.addEventListener('gorun:log-run', function (event) {
      if (GR.ui && typeof GR.ui.openActivityDialog === 'function') {
        GR.ui.openActivityDialog(null, event.detail || {});
      }
    });

    GR.subscribe(function () {
      GR.select.invalidate();
      renderChrome();
    });

    // Actions commit silently and then call renderAll, so the chrome has to be
    // part of that pass or the header would only ever render once, at boot.
    GR.registerPanel('chrome', renderChrome);

    setupInstall();
    setupServiceWorker();

    seedOnFirstVisit();

    renderChrome();
    GR.renderAll();

    // First gesture unlocks the Web Audio context in browsers that require it.
    var unlock = function () {
      GR.play('tick');
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  GR.seedDemoData = seedDemoData;
})(window);
