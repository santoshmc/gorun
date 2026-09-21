/* GoRun — core runtime
 * Namespace, safe storage, state store, DOM helpers, icons, sound, dialogs, toasts.
 * Plain script (no modules) so the app runs straight from file://
 */
(function (global) {
  'use strict';

  var GR = (global.GR = global.GR || {});
  GR.ui = GR.ui || {};

  /* ---------------------------------------------------------------- utils */

  function uid(prefix) {
    return (prefix || 'id') + '-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round1(value) {
    return Math.round((Number(value) || 0) * 10) / 10;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function deepClone(value) {
    return value === undefined ? value : JSON.parse(JSON.stringify(value));
  }

  /* -------------------------------------------------------------- storage */

  var STORAGE_KEY = 'gorun.state.v2';
  var storageIssue = null;
  var issueListeners = [];

  function reportStorageIssue(issue) {
    storageIssue = issue;
    issueListeners.forEach(function (fn) {
      fn(issue);
    });
  }

  function onStorageIssue(fn) {
    issueListeners.push(fn);
    return function () {
      issueListeners = issueListeners.filter(function (x) {
        return x !== fn;
      });
    };
  }

  function readRaw() {
    try {
      return global.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      reportStorageIssue('unavailable');
      return null;
    }
  }

  function writeRaw(value) {
    try {
      global.localStorage.setItem(STORAGE_KEY, value);
      if (storageIssue === 'write-failed') reportStorageIssue(null);
      return true;
    } catch (err) {
      reportStorageIssue('write-failed');
      return false;
    }
  }

  /* ---------------------------------------------------------------- state */

  function defaultState() {
    return {
      version: 2,
      settings: {
        unit: 'km',
        soundEnabled: true,
        leaderboardOptOut: false,
        remindersEnabled: false,
        reminderFrequency: 'planned-days',
        onboarded: false
      },
      goals: {},
      plans: {},
      activities: [],
      providers: {},
      friends: [],
      challenges: {},
      badgeHistory: {},
      seenBadges: {},
      activeMonth: null
    };
  }

  /** Drops anything structurally wrong rather than throwing the whole save away. */
  function sanitize(raw) {
    var base = defaultState();
    if (!raw || typeof raw !== 'object') return base;
    var dirty = false;

    var s = raw.settings;
    if (s && typeof s === 'object') {
      if (s.unit === 'km' || s.unit === 'mi') base.settings.unit = s.unit;
      if (typeof s.soundEnabled === 'boolean') base.settings.soundEnabled = s.soundEnabled;
      if (typeof s.leaderboardOptOut === 'boolean') base.settings.leaderboardOptOut = s.leaderboardOptOut;
      if (typeof s.remindersEnabled === 'boolean') base.settings.remindersEnabled = s.remindersEnabled;
      if (typeof s.reminderFrequency === 'string') base.settings.reminderFrequency = s.reminderFrequency;
      if (typeof s.onboarded === 'boolean') base.settings.onboarded = s.onboarded;
    }

    if (raw.goals && typeof raw.goals === 'object') {
      Object.keys(raw.goals).forEach(function (key) {
        var g = raw.goals[key];
        if (g && typeof g === 'object' && typeof g.targetKm === 'number' && g.targetKm > 0 && /^\d{4}-\d{2}$/.test(key)) {
          base.goals[key] = g;
        } else {
          dirty = true;
        }
      });
    }

    if (raw.plans && typeof raw.plans === 'object') {
      Object.keys(raw.plans).forEach(function (key) {
        var p = raw.plans[key];
        if (p && typeof p === 'object' && Array.isArray(p.weeks)) base.plans[key] = p;
        else dirty = true;
      });
    }

    if (Array.isArray(raw.activities)) {
      base.activities = raw.activities.filter(function (a) {
        var ok = a && typeof a === 'object' && typeof a.distanceKm === 'number' && typeof a.date === 'string';
        if (!ok) dirty = true;
        return ok;
      });
    }

    if (raw.providers && typeof raw.providers === 'object') base.providers = raw.providers;
    if (Array.isArray(raw.friends)) base.friends = raw.friends;
    if (raw.challenges && typeof raw.challenges === 'object') base.challenges = raw.challenges;
    if (raw.badgeHistory && typeof raw.badgeHistory === 'object') base.badgeHistory = raw.badgeHistory;
    if (raw.seenBadges && typeof raw.seenBadges === 'object') base.seenBadges = raw.seenBadges;
    if (typeof raw.activeMonth === 'string') base.activeMonth = raw.activeMonth;

    if (dirty) reportStorageIssue('corrupt-data');
    return base;
  }

  var state = defaultState();
  var listeners = [];

  function load() {
    var raw = readRaw();
    if (!raw) {
      state = defaultState();
      return state;
    }
    try {
      state = sanitize(JSON.parse(raw));
    } catch (err) {
      reportStorageIssue('corrupt-data');
      state = defaultState();
    }
    return state;
  }

  function persist() {
    writeRaw(JSON.stringify(state));
  }

  function getState() {
    return state;
  }

  /**
   * Applies a mutation, persists, then notifies subscribers.
   * The mutator receives a draft it may mutate directly.
   */
  function update(mutator, options) {
    var opts = options || {};
    mutator(state);
    if (!opts.transient) persist();
    if (!opts.silent) notify();
  }

  function notify() {
    listeners.forEach(function (fn) {
      try {
        fn(state);
      } catch (err) {
        console.error('[GoRun] subscriber failed', err);
      }
    });
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (x) {
        return x !== fn;
      });
    };
  }

  function resetAll() {
    state = defaultState();
    persist();
    notify();
  }

  /* ------------------------------------------------------------ dom utils */

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /** Hyperscript. h('div.card', {onclick}, 'text', childEl) */
  function h(spec, props) {
    var parts = String(spec).split(/(?=[.#])/);
    var tag = parts[0] || 'div';
    var node = document.createElement(tag);

    parts.slice(1).forEach(function (part) {
      if (part[0] === '.') node.classList.add(part.slice(1));
      else if (part[0] === '#') node.id = part.slice(1);
    });

    var p = props || {};
    Object.keys(p).forEach(function (key) {
      var value = p[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'class' || key === 'className') {
        String(value).split(/\s+/).filter(Boolean).forEach(function (c) {
          node.classList.add(c);
        });
      } else if (key === 'dataset') {
        Object.keys(value).forEach(function (d) {
          node.dataset[d] = value[d];
        });
      } else if (key === 'style' && typeof value === 'object') {
        Object.keys(value).forEach(function (s) {
          node.style.setProperty(s, value[s]);
        });
      } else if (key === 'html') {
        node.innerHTML = value;
      } else if (key === 'text') {
        node.textContent = value;
      } else if (key.slice(0, 2) === 'on' && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key in node && key !== 'list' && key !== 'type' && key !== 'form') {
        try {
          node[key] = value;
        } catch (err) {
          node.setAttribute(key, value);
        }
      } else {
        node.setAttribute(key, value === true ? '' : value);
      }
    });

    var children = Array.prototype.slice.call(arguments, 2);
    append(node, children);
    return node;
  }

  function append(node, children) {
    children.forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      if (Array.isArray(child)) return append(node, child);
      node.appendChild(typeof child === 'object' && child.nodeType ? child : document.createTextNode(String(child)));
    });
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function mount(node, children) {
    clear(node);
    append(node, Array.isArray(children) ? children : [children]);
    return node;
  }

  /* ---------------------------------------------------------------- icons */

  var ICON_PATHS = {
    target:
      '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    run:
      '<circle cx="14.5" cy="4.2" r="2"/><path d="M13 8.2 9.4 10l-1.2 4"/><path d="m13 8.2 3.4 2.4.9 3.4"/><path d="m11.4 12.6-.9 4.2 3 3.4"/><path d="m11.4 12.6-3.6 2-2.4-1.4"/>',
    walk:
      '<circle cx="13" cy="4.2" r="2"/><path d="M12 8.4 9.6 11l.6 3.6"/><path d="m12 8.4 2.8 2.2.6 3.4"/><path d="m10.2 14.6-1.4 5.4"/><path d="m15.4 14 .8 6"/>',
    bike: '<circle cx="5.5" cy="17" r="3.2"/><circle cx="18.5" cy="17" r="3.2"/><path d="m8 17 4-8h4"/><path d="m11 9 3.5 8"/><circle cx="15" cy="4.5" r="1.6"/>',
    flame:
      '<path d="M12 2.5c2.6 3.2 1 5.3 1 5.3s2.4-.6 3-3c2 2.3 3 4.6 3 6.9a7 7 0 1 1-14 0c0-3.6 3.2-6.4 7-9.2Z"/><path d="M12 20a3 3 0 0 1-1.4-5.7c0-1.4 1.4-2.5 1.4-2.5s1.5 1.6 1.5 2.7A3 3 0 0 1 12 20Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    medal:
      '<circle cx="12" cy="15" r="6"/><path d="m8.5 9.5-3-7M15.5 9.5l3-7"/><path d="m12 12.4 1 2 2.2.3-1.6 1.6.4 2.2-2-1-2 1 .4-2.2L8.8 14.7l2.2-.3Z"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M14.8 9.2a3 3 0 0 0-2.8-1.4c-1.8 0-2.8.9-2.8 2.1 0 3 5.6 1.6 5.6 4.6 0 1.3-1.2 2.2-2.9 2.2a3.2 3.2 0 0 1-3-1.6"/>',
    users:
      '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16.5 5.2a3.4 3.4 0 0 1 0 6.6M17.5 14.2A6.5 6.5 0 0 1 21.5 20"/>',
    trophy:
      '<path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 5.5H4.5A2.5 2.5 0 0 0 7 10M17 5.5h2.5A2.5 2.5 0 0 1 17 10"/><path d="M12 14v3M8.5 20h7M9.5 20l.6-3h3.8l.6 3"/>',
    flag: '<path d="M5 21V3M5 4h11l-2 3.5L16 11H5"/>',
    share: '<circle cx="18" cy="5" r="2.8"/><circle cx="6" cy="12" r="2.8"/><circle cx="18" cy="19" r="2.8"/><path d="m8.5 10.7 7-4.2M8.5 13.3l7 4.2"/>',
    link: '<path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.5 6.3"/><path d="M14 10.5a4 4 0 0 0-5.7 0L5.5 13.3a4 4 0 0 0 5.7 5.7l1.3-1.3"/>',
    plug: '<path d="M9 2.5v6M15 2.5v6"/><path d="M6 8.5h12v2.2a6 6 0 0 1-12 0Z"/><path d="M12 16.8V21.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pencil: '<path d="m15.5 4.5 4 4L8 20H4v-4Z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    sparkle:
      '<path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.3 10.2 12.6 4.5 10.8 10.2 9Z"/><path d="M18.5 3v3M20 4.5h-3"/>',
    bell: '<path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z"/><path d="M10 18a2 2 0 0 0 4 0"/>',
    sound: '<path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4Z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4Z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
    lock: '<rect x="4.5" y="10" width="15" height="10.5" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    cloud: '<path d="M7 18.5A4.5 4.5 0 0 1 7.6 9.6a5.5 5.5 0 0 1 10.5 1.6 3.7 3.7 0 0 1-1.1 7.3Z"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-1.3 5.5"/><path d="M20 4.5V11h-6.5"/>',
    settings:
      '<circle cx="12" cy="12" r="3.4"/><path d="M19.4 14.6a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.47v.16a2 2 0 1 1-4 0v-.08a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-1H2.2a2 2 0 1 1 0-4h.08a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H8a1.6 1.6 0 0 0 1-1.47V2.2a2 2 0 1 1 4 0v.08a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V8a1.6 1.6 0 0 0 1.47 1h.16a2 2 0 1 1 0 4h-.08a1.6 1.6 0 0 0-1.43 1Z"/>',
    arrowRight: '<path d="M4 12h15M13 6l6 6-6 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/>',
    ruler: '<rect x="2.5" y="8" width="19" height="8" rx="2"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>',
    mountain: '<path d="m2.5 19 6-11 4 6.5 2.5-4 6.5 8.5Z"/><circle cx="17" cy="5.5" r="2"/>',
    stride: '<path d="M3 18h18"/><path d="m7 18 3-9 4 5 3-6"/><circle cx="7" cy="18" r="1.4"/><circle cx="17" cy="18" r="1.4"/>',
    warning: '<path d="M12 3.5 21.5 20H2.5Z"/><path d="M12 10v4.5M12 17.2v.6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.6"/>',
    rest: '<path d="M4 15a8 8 0 0 0 14.5-4.5A6.5 6.5 0 1 1 4 15Z"/><path d="M14 4h4l-4 4h4"/>'
  };

  function icon(name, options) {
    var opts = options || {};
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', opts.weight || 2);
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('icon');
    if (opts.className) {
      String(opts.className).split(/\s+/).filter(Boolean).forEach(function (c) {
        svg.classList.add(c);
      });
    }
    if (opts.size) {
      svg.style.width = opts.size + 'px';
      svg.style.height = opts.size + 'px';
    }
    svg.innerHTML = ICON_PATHS[name] || ICON_PATHS.info;
    return svg;
  }

  /* ---------------------------------------------------------------- sound */

  var audioCtx = null;
  var audioBlocked = false;

  function ensureAudio() {
    if (audioBlocked) return null;
    if (!audioCtx) {
      var Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) {
        audioBlocked = true;
        return null;
      }
      try {
        audioCtx = new Ctx();
      } catch (err) {
        audioBlocked = true;
        return null;
      }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  var RECIPES = {
    pop: [{ f: 440, t: 0, d: 0.09, type: 'triangle', g: 0.18 }],
    tick: [{ f: 880, t: 0, d: 0.05, type: 'square', g: 0.06 }],
    success: [
      { f: 523.25, t: 0, d: 0.12, type: 'triangle', g: 0.16 },
      { f: 659.25, t: 0.09, d: 0.12, type: 'triangle', g: 0.16 },
      { f: 783.99, t: 0.18, d: 0.22, type: 'triangle', g: 0.16 }
    ],
    error: [
      { f: 220, t: 0, d: 0.14, type: 'sawtooth', g: 0.12 },
      { f: 165, t: 0.1, d: 0.2, type: 'sawtooth', g: 0.12 }
    ],
    whoosh: [{ f: 180, t: 0, d: 0.22, type: 'sine', g: 0.1, slideTo: 620 }],
    swoosh: [{ f: 620, t: 0, d: 0.2, type: 'sine', g: 0.08, slideTo: 200 }],
    coin: [
      { f: 987.77, t: 0, d: 0.07, type: 'square', g: 0.1 },
      { f: 1318.51, t: 0.06, d: 0.16, type: 'square', g: 0.1 }
    ],
    levelUp: [
      { f: 392, t: 0, d: 0.1, type: 'triangle', g: 0.15 },
      { f: 523.25, t: 0.08, d: 0.1, type: 'triangle', g: 0.15 },
      { f: 659.25, t: 0.16, d: 0.1, type: 'triangle', g: 0.15 },
      { f: 1046.5, t: 0.24, d: 0.3, type: 'triangle', g: 0.18 }
    ]
  };

  function play(name) {
    if (!state.settings.soundEnabled) return;
    var ctx = ensureAudio();
    if (!ctx) return;
    var recipe = RECIPES[name] || RECIPES.pop;
    var now = ctx.currentTime;

    recipe.forEach(function (note) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = note.type || 'sine';
      osc.frequency.setValueAtTime(note.f, now + note.t);
      if (note.slideTo) osc.frequency.exponentialRampToValueAtTime(note.slideTo, now + note.t + note.d);
      gain.gain.setValueAtTime(0.0001, now + note.t);
      gain.gain.exponentialRampToValueAtTime(note.g, now + note.t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.t + note.d);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + note.t);
      osc.stop(now + note.t + note.d + 0.02);
    });
  }

  /* --------------------------------------------------------------- motion */

  function prefersReducedMotion() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* --------------------------------------------------------------- toasts */

  function toast(message, options) {
    var opts = options || {};
    var root = $('#toast-root');
    if (!root) return;

    var node = h(
      'div.toast',
      { class: 'toast--' + (opts.tone || 'info'), role: 'status', 'aria-live': 'polite' },
      icon(opts.icon || (opts.tone === 'danger' ? 'warning' : opts.tone === 'success' ? 'check' : 'info'), {
        className: 'toast__icon'
      }),
      h('div.toast__body', {}, h('p.toast__title', { text: message }), opts.detail ? h('p.toast__detail', { text: opts.detail }) : null),
      h(
        'button.toast__close',
        {
          type: 'button',
          'aria-label': 'Dismiss notification',
          onclick: function () {
            dismiss();
          }
        },
        icon('close', { size: 14 })
      )
    );

    function dismiss() {
      node.classList.add('toast--leaving');
      global.setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 220);
    }

    root.appendChild(node);
    if (opts.sound !== false) play(opts.tone === 'danger' ? 'error' : opts.tone === 'success' ? 'success' : 'pop');
    global.setTimeout(dismiss, opts.duration || 4200);
    return dismiss;
  }

  /* -------------------------------------------------------------- dialogs */

  var openDialogs = [];

  function dialog(config) {
    var root = $('#dialog-root');
    if (!root) return { close: function () {} };

    var titleId = uid('dlg-title');
    var previouslyFocused = document.activeElement;

    var body = config.body || h('div');
    var footer = config.footer || null;

    var panel = h(
      'div.dialog__panel',
      { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, class: config.size ? 'dialog__panel--' + config.size : '' },
      h(
        'header.dialog__head',
        {},
        h('h2.dialog__title', { id: titleId }, config.icon ? icon(config.icon, { className: 'dialog__icon' }) : null, h('span', { text: config.title || '' })),
        h(
          'button.icon-btn.dialog__close',
          { type: 'button', 'aria-label': 'Close dialog', onclick: function () { close('dismiss'); } },
          icon('close', { size: 16 })
        )
      ),
      h('div.dialog__body', {}, body),
      footer ? h('footer.dialog__foot', {}, footer) : null
    );

    var overlay = h('div.dialog', { onclick: function (event) { if (event.target === overlay) close('dismiss'); } }, panel);

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close('dismiss');
        return;
      }
      if (event.key !== 'Tab') return;
      var focusables = $$(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        panel
      ).filter(function (node) {
        return node.offsetParent !== null || node === document.activeElement;
      });
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    var closed = false;
    function close(reason) {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKeydown, true);
      overlay.classList.add('dialog--leaving');
      openDialogs = openDialogs.filter(function (d) { return d !== api; });
      if (!openDialogs.length) document.body.classList.remove('is-dialog-open');
      global.setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 180);
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      if (config.onClose) config.onClose(reason);
    }

    var api = { close: close, panel: panel, overlay: overlay };
    openDialogs.push(api);

    document.addEventListener('keydown', onKeydown, true);
    document.body.classList.add('is-dialog-open');
    root.appendChild(overlay);
    play('whoosh');

    global.requestAnimationFrame(function () {
      var target = $('[data-autofocus]', panel) || $('input, select, textarea, button', panel);
      if (target) target.focus();
    });

    return api;
  }

  function confirmDialog(config) {
    return new Promise(function (resolve) {
      var settled = false;
      function settle(value) {
        if (settled) return;
        settled = true;
        resolve(value);
      }

      var instance = dialog({
        title: config.title,
        icon: config.icon || 'warning',
        size: 'sm',
        body: h('p.dialog__message', { text: config.message }),
        footer: [
          h(
            'button.btn.btn--ghost',
            { type: 'button', onclick: function () { settle(false); instance.close('cancel'); } },
            config.cancelLabel || 'Cancel'
          ),
          h(
            'button.btn',
            {
              type: 'button',
              class: config.tone === 'danger' ? 'btn--danger' : 'btn--primary',
              'data-autofocus': '',
              onclick: function () { settle(true); instance.close('confirm'); }
            },
            config.confirmLabel || 'Confirm'
          )
        ],
        onClose: function () { settle(false); }
      });
    });
  }

  /* ------------------------------------------------------------- confetti */

  var CONFETTI_COLORS = ['#ff9a8b', '#a5b4fc', '#fde68a', '#86efac', '#a5f3fc', '#f9a8d4'];

  function confetti(options) {
    if (prefersReducedMotion()) return;
    var opts = options || {};
    var root = $('#fx-root');
    if (!root) return;
    var count = opts.count || 28;

    for (var i = 0; i < count; i += 1) {
      var piece = h('span.confetti__piece');
      piece.style.setProperty('--x', (Math.random() * 100).toFixed(2) + 'vw');
      piece.style.setProperty('--drift', (Math.random() * 180 - 90).toFixed(0) + 'px');
      piece.style.setProperty('--delay', (Math.random() * 0.35).toFixed(2) + 's');
      piece.style.setProperty('--spin', (Math.random() * 720 - 360).toFixed(0) + 'deg');
      piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      piece.style.borderRadius = i % 3 === 0 ? '50%' : '2px';
      root.appendChild(piece);
      (function (node) {
        global.setTimeout(function () {
          if (node.parentNode) node.parentNode.removeChild(node);
        }, 2600);
      })(piece);
    }
  }

  /* ---------------------------------------------------------- panel registry */

  var panels = [];

  function registerPanel(name, renderFn) {
    panels.push({ name: name, render: renderFn });
  }

  function renderAll() {
    panels.forEach(function (panel) {
      try {
        panel.render(state);
      } catch (err) {
        console.error('[GoRun] panel "' + panel.name + '" failed to render', err);
        var host = $('#card-' + panel.name);
        if (host) {
          mount(
            host,
            h('div.card__error', {}, icon('warning'), h('p', { text: 'This panel could not be displayed.' }))
          );
        }
      }
    });
  }

  /* --------------------------------------------------------------- export */

  GR.uid = uid;
  GR.clamp = clamp;
  GR.round1 = round1;
  GR.pad2 = pad2;
  GR.deepClone = deepClone;

  GR.storage = {
    load: load,
    persist: persist,
    reset: resetAll,
    onIssue: onStorageIssue,
    getIssue: function () { return storageIssue; },
    STORAGE_KEY: STORAGE_KEY
  };

  GR.getState = getState;
  GR.update = update;
  GR.subscribe = subscribe;
  GR.notify = notify;
  GR.defaultState = defaultState;

  GR.$ = $;
  GR.$$ = $$;
  GR.h = h;
  GR.clear = clear;
  GR.mount = mount;
  GR.icon = icon;

  GR.play = play;
  GR.prefersReducedMotion = prefersReducedMotion;
  GR.toast = toast;
  GR.dialog = dialog;
  GR.confirm = confirmDialog;
  GR.confetti = confetti;

  GR.registerPanel = registerPanel;
  GR.renderAll = renderAll;
})(window);
