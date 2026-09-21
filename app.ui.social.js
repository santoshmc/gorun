/* GoRun — social, rewards and achievement panels
 * Stories 13 (badges), 14 (friends), 15 (share), 16 (leaderboard),
 * 17 (challenges) and 18 (reward points).
 *
 * There is no server behind this app: friends, leaderboards and challenges
 * are a local simulation seeded from fixture data and kept in localStorage.
 * Every panel says so in plain words rather than pretending accounts exist.
 */
(function (global) {
  'use strict';

  var GR = global.GR;
  var D = GR.domain;
  var h = GR.h;
  var icon = GR.icon;

  var SIM_NOTE = 'Simulated locally — no accounts, no server, nothing leaves this device.';

  /* ============================================================= helpers */

  function derived() {
    return GR.select.derive();
  }

  function host(name) {
    return GR.$('#card-' + name);
  }

  function initials(name) {
    var parts = String(name || '?')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function avatar(name, hue) {
    var value = typeof hue === 'number' && isFinite(hue) ? hue : 8;
    return h('span.row__avatar', { 'aria-hidden': 'true', style: { background: 'hsl(' + value + ', 80%, 82%)' } }, initials(name));
  }

  function selfLabel(optedOut) {
    return optedOut ? 'Hidden' : 'You';
  }

  function segmented(options, current, onPick) {
    return h(
      'div.seg',
      { role: 'group' },
      options.map(function (option) {
        var active = option.key === current;
        return h(
          'button.seg__btn' + (active ? '.is-active' : ''),
          {
            type: 'button',
            'aria-pressed': active ? 'true' : 'false',
            onclick: function () {
              if (active) return;
              GR.play('tick');
              onPick(option.key);
            }
          },
          option.label
        );
      })
    );
  }

  function emptyState(iconName, title, text, action) {
    return h(
      'div.empty',
      {},
      h('span.empty__icon', {}, icon(iconName)),
      h('p.empty__title', { text: title }),
      h('p.empty__text', { text: text }),
      action || null
    );
  }

  function hint(text) {
    return h('p.field__hint', { text: text });
  }

  function meter(percent, accent) {
    var value = GR.clamp(Math.round(Number(percent) || 0), 0, 100);
    return h(
      'div.meter.meter--sm',
      {
        role: 'progressbar',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-valuenow': String(value),
        dataset: accent ? { accent: accent } : undefined
      },
      h('span.meter__fill' + (value >= 100 ? '.meter__fill--full' : ''), { style: { width: value + '%' } })
    );
  }

  function labelledField(id, labelText, control, hintText) {
    return h(
      'div.field',
      {},
      h('label.field__label', { 'for': id, text: labelText }),
      control,
      hintText ? hint(hintText) : null
    );
  }

  /** Clipboard with an execCommand fallback for file:// and older browsers. */
  function legacyCopy(text) {
    try {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-2000px';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(area);
      return !!ok;
    } catch (err) {
      return false;
    }
  }

  function copyText(text) {
    return new Promise(function (resolve) {
      var nav = global.navigator;
      if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
        nav.clipboard.writeText(text).then(
          function () {
            resolve(true);
          },
          function () {
            resolve(legacyCopy(text));
          }
        );
        return;
      }
      resolve(legacyCopy(text));
    });
  }

  function canWebShare() {
    return !!(global.navigator && typeof global.navigator.share === 'function');
  }

  function baseUrl() {
    return String(global.location && global.location.href ? global.location.href : '').split('#')[0];
  }

  /* ====================================================== story 13 badges */

  function badgeDateText(badge) {
    if (!badge.earnedAt) return 'Earned';
    var when = new Date(badge.earnedAt);
    return isNaN(when.getTime()) ? 'Earned' : when.toLocaleDateString();
  }

  function badgeTile(badge) {
    var props = {
      type: 'button',
      onclick: function () {
        openBadgeDialog(badge);
      }
    };

    if (badge.earned) {
      props.dataset = { accent: badge.accent };
      props['aria-label'] = badge.name + ' — earned ' + badgeDateText(badge);
    } else {
      props.title = badge.criteria;
      props['aria-label'] = badge.name + ' — locked. ' + badge.criteria;
    }

    return h(
      'button.badge-tile' + (badge.earned ? '' : '.badge-tile--locked'),
      props,
      h('span.badge-tile__icon', {}, icon(badge.earned ? badge.icon : 'lock')),
      h('span.badge-tile__name', { text: badge.name }),
      h('span.badge-tile__date', { text: badge.earned ? badgeDateText(badge) : 'Locked' })
    );
  }

  function openBadgeDialog(badge) {
    var status = badge.earned
      ? 'Earned on ' + badgeDateText(badge) + '.'
      : 'Not earned yet. Badges unlock automatically as soon as the achievement holds.';

    var instance = GR.dialog({
      title: badge.name,
      icon: badge.earned ? badge.icon : 'lock',
      size: 'sm',
      body: h(
        'div.card__body',
        {},
        h('p.dialog__message', { text: badge.criteria }),
        h('p.field__hint', { text: status })
      ),
      footer: [
        h(
          'button.btn.btn--ghost',
          {
            type: 'button',
            onclick: function () {
              instance.close('done');
            }
          },
          'Close'
        ),
        badge.earned
          ? h(
              'button.btn.btn--primary',
              {
                type: 'button',
                'data-autofocus': '',
                onclick: function () {
                  instance.close('share');
                  openShareDialog({ kind: 'badge', badge: badge });
                }
              },
              icon('share', { size: 15 }),
              'Share'
            )
          : null
      ]
    });
  }

  function renderBadges() {
    var node = host('badges');
    if (!node) return;

    var d = derived();
    var badges = (d.badges || []).slice();
    var earned = badges.filter(function (b) {
      return b.earned;
    });
    var locked = badges.filter(function (b) {
      return !b.earned;
    });

    GR.mount(node, [
      h(
        'header.card__head',
        {},
        h('h2.card__title', {}, icon('medal'), h('span', { text: 'Badges' })),
        h(
          'div.card__actions',
          {},
          h('span.chip.chip--accent', { text: earned.length + '/' + badges.length })
        )
      ),
      h(
        'div.card__body',
        {},
        badges.length
          ? h(
              'div.badge-grid',
              {},
              earned.concat(locked).map(badgeTile)
            )
          : emptyState('medal', 'No badges yet', 'Log a run or build a plan and the first badge will unlock itself.'),
        badges.length ? hint('Badges are recalculated from your data, so correcting an activity can also take one back.') : null
      )
    ]);
  }

  /* ====================================================== story 18 points */

  var pointsTab = 'history';

  function ledgerRow(entry) {
    return h(
      'div.row.row--sunk',
      {},
      h(
        'div.row__main',
        {},
        h('p.row__title', { text: entry.label }),
        h('p.row__meta', { text: D.formatDayLabel(entry.date) })
      ),
      h('div.row__end', {}, h('span.stat__value--sm', { text: '+' + entry.points }))
    );
  }

  function rewardRow(reward, balance) {
    var affordable = balance >= reward.cost;
    return h(
      'div.row',
      { dataset: { accent: reward.accent } },
      h(
        'div.row__main',
        {},
        h('p.row__title', { text: reward.name }),
        h('p.row__meta', { text: reward.partner + ' · ' + reward.cost + ' points' })
      ),
      h(
        'div.row__end',
        {},
        h('span.chip.chip--muted', { text: reward.cost + ' pts' }),
        h(
          'button.btn.btn--sm',
          {
            type: 'button',
            disabled: affordable ? null : true,
            'aria-label': 'Redeem ' + reward.name + ' for ' + reward.cost + ' points',
            onclick: function () {
              openRedeemDialog(reward);
            }
          },
          'Redeem'
        )
      )
    );
  }

  function openRedeemDialog(reward) {
    var instance = GR.dialog({
      title: 'Redeem ' + reward.name,
      icon: 'coin',
      size: 'sm',
      body: h(
        'div.card__body',
        {},
        h('p.dialog__message', {
          text:
            'Redemption is a demo in this offline build. ' +
            reward.partner +
            ' has no way to receive the request, so your balance stays exactly as it is.'
        }),
        hint('In a connected version this would spend ' + reward.cost + ' points and issue a partner code.')
      ),
      footer: h(
        'button.btn.btn--primary',
        {
          type: 'button',
          'data-autofocus': '',
          onclick: function () {
            instance.close('done');
          }
        },
        'Got it'
      )
    });
  }

  function renderPoints() {
    var node = host('points');
    if (!node) return;

    var d = derived();
    var points = d.points || { balance: 0, ledger: [] };
    var ledger = points.ledger || [];
    var rewards = D.REWARDS || [];

    var tabBody;
    if (pointsTab === 'rewards') {
      tabBody = rewards.length
        ? h(
            'div.list.scroll-y',
            {},
            rewards.map(function (reward) {
              return rewardRow(reward, points.balance);
            })
          )
        : emptyState('coin', 'No rewards listed', 'The reward catalogue is empty in this build.');
    } else {
      tabBody = ledger.length
        ? h('div.list.scroll-y', {}, ledger.map(ledgerRow))
        : emptyState('coin', 'No points yet', 'Points land as soon as you log a run or clear a planned day.');
    }

    GR.mount(node, [
      h(
        'header.card__head',
        {},
        h('h2.card__title', {}, icon('coin'), h('span', { text: 'Reward points' })),
        h('div.card__actions', {}, segmented(
          [
            { key: 'history', label: 'History' },
            { key: 'rewards', label: 'Rewards' }
          ],
          pointsTab,
          function (key) {
            pointsTab = key;
            renderPoints();
          }
        ))
      ),
      h(
        'div.card__body',
        {},
        h(
          'div.stat',
          {},
          h('span.stat__value.stat__value--xl', { text: String(points.balance || 0) }),
          h('span.stat__label', { text: 'points' })
        ),
        hint(D.POINTS_RULE.description),
        tabBody,
        pointsTab === 'rewards' ? hint('Rewards are illustrative partners. Redeeming is a demo and never spends your balance.') : null
      )
    ]);
  }

  /* ===================================================== story 14 friends */

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function friendRow(friend) {
    var accepted = friend.status === 'accepted';
    return h(
      'div.row',
      {},
      avatar(friend.name, friend.hue),
      h(
        'div.row__main',
        {},
        h('p.row__title', { text: friend.name }),
        h('p.row__meta', { text: accepted ? 'Runs together with you' : 'Waiting for a reply' })
      ),
      h(
        'div.row__end',
        {},
        accepted
          ? h('span.chip.chip--ok', { text: 'Accepted' })
          : h('span.chip.chip--warn', { text: 'Invite sent' }),
        accepted
          ? null
          : h(
              'button.btn.btn--sm',
              {
                type: 'button',
                title: 'Simulate this invite being accepted',
                'aria-label': 'Simulate ' + friend.name + ' accepting the invite',
                onclick: function () {
                  GR.actions.acceptFriend(friend.id);
                }
              },
              'Mark accepted (sim)'
            ),
        h(
          'button.icon-btn.icon-btn--plain.icon-btn--danger',
          {
            type: 'button',
            'aria-label': 'Remove ' + friend.name,
            onclick: function () {
              GR.confirm({
                title: 'Remove ' + friend.name + '?',
                message: 'This deletes their name and invite from this device. Nothing is kept afterwards.',
                confirmLabel: 'Remove',
                cancelLabel: 'Keep',
                tone: 'danger'
              }).then(function (ok) {
                if (ok) GR.actions.removeFriend(friend.id);
              });
            }
          },
          icon('trash', { size: 15 })
        )
      )
    );
  }

  function renderFriends() {
    var node = host('friends');
    if (!node) return;

    var d = derived();
    var friends = (d.state && d.state.friends) || [];

    GR.mount(node, [
      h(
        'header.card__head',
        {},
        h('h2.card__title', {}, icon('users'), h('span', { text: 'Friends' })),
        h(
          'div.card__actions',
          {},
          h(
            'button.btn.btn--primary.btn--sm',
            {
              type: 'button',
              onclick: function () {
                openInviteDialog();
              }
            },
            icon('plus', { size: 14 }),
            'Invite'
          )
        )
      ),
      h(
        'div.card__body',
        {},
        friends.length
          ? h('div.list.scroll-y', {}, friends.map(friendRow))
          : emptyState('users', 'Nobody invited yet', 'Invite someone by link, email or from a contact list to fill your leaderboard.'),
        hint(SIM_NOTE + ' Invites are recorded here so you can see how the flow behaves.')
      )
    ]);
  }

  /* ------------------------------------------------------- invite dialog */

  function inviteLinkTab(close) {
    var code = GR.uid('inv');
    var link = baseUrl() + '#invite=' + encodeURIComponent(code);
    var inputId = GR.uid('invite-link');

    var input = h('input.field__input', {
      type: 'text',
      id: inputId,
      value: link,
      readOnly: true,
      onclick: function (event) {
        event.target.select();
      }
    });

    return h(
      'div.card__body',
      {},
      labelledField(inputId, 'Invite link', input, 'The link only works on this device — there is no server to open it on another one.'),
      h(
        'div.banner__actions',
        {},
        h(
          'button.btn.btn--primary',
          {
            type: 'button',
            onclick: function () {
              copyText(link).then(function (ok) {
                if (ok) {
                  GR.toast('Invite link copied', { tone: 'success', icon: 'link' });
                  close();
                } else {
                  GR.toast('Could not copy automatically', { tone: 'danger', icon: 'warning', detail: 'Select the link and copy it by hand.' });
                }
              });
            }
          },
          icon('link', { size: 15 }),
          'Copy link'
        ),
        canWebShare()
          ? h(
              'button.btn.btn--secondary',
              {
                type: 'button',
                onclick: function () {
                  global.navigator
                    .share({ title: 'Join me on GoRun', text: 'Run with me on GoRun.', url: link })
                    .then(function () {
                      GR.toast('Invite shared', { tone: 'success', icon: 'share' });
                      close();
                    })
                    .catch(function () {
                      /* The runner dismissed the share sheet — nothing to do. */
                    });
                }
              },
              icon('share', { size: 15 }),
              'Share'
            )
          : null
      )
    );
  }

  function inviteEmailTab(close) {
    var nameId = GR.uid('invite-name');
    var emailId = GR.uid('invite-email');
    var errorNode = h('p.field__error', { text: '', hidden: true });

    var nameInput = h('input.field__input', { type: 'text', id: nameId, autocomplete: 'name', 'data-autofocus': '' });
    var emailInput = h('input.field__input', { type: 'email', id: emailId, autocomplete: 'email' });

    function fail(message) {
      errorNode.textContent = message;
      errorNode.hidden = false;
      GR.play('error');
    }

    function submit(event) {
      if (event) event.preventDefault();
      var name = String(nameInput.value || '').trim();
      var email = String(emailInput.value || '').trim();

      if (!name) return fail('Give your friend a name so you can recognise the invite.');
      if (!EMAIL_RE.test(email)) return fail('That email address does not look right.');

      errorNode.hidden = true;
      GR.actions.inviteFriend(name);
      close();
    }

    return h(
      'form.card__body',
      { onsubmit: submit },
      h(
        'div.form-grid',
        {},
        labelledField(nameId, 'Name', nameInput),
        labelledField(emailId, 'Email address', emailInput)
      ),
      errorNode,
      hint('The address is used to build the invite and is not stored — only the name is kept on this device.'),
      h('div.banner__actions', {}, h('button.btn.btn--primary', { type: 'submit' }, icon('users', { size: 15 }), 'Send invite'))
    );
  }

  function inviteContactsTab(close) {
    var consentId = GR.uid('invite-consent');
    var seeds = (D.FRIEND_SEEDS || []).map(function (seed) {
      return seed.name;
    });
    var selected = {};
    var consented = false;

    var listNode = h('div.list.scroll-y');
    var submitBtn = h(
      'button.btn.btn--primary',
      {
        type: 'button',
        disabled: true,
        onclick: function () {
          var names = seeds.filter(function (name) {
            return selected[name];
          });
          if (!consented || !names.length) return;
          GR.actions.importContacts(names);
          close();
        }
      },
      icon('users', { size: 15 }),
      'Invite selected'
    );

    function refreshSubmit() {
      var count = seeds.filter(function (name) {
        return selected[name];
      }).length;
      submitBtn.disabled = !consented || count === 0;
      submitBtn.setAttribute('aria-label', count ? 'Invite ' + count + ' selected contacts' : 'Invite selected contacts');
    }

    function paintList() {
      GR.mount(
        listNode,
        seeds.length
          ? seeds.map(function (name) {
              var boxId = GR.uid('contact');
              var box = h('input', {
                type: 'checkbox',
                id: boxId,
                disabled: consented ? null : true,
                checked: !!selected[name],
                onchange: function (event) {
                  selected[name] = !!event.target.checked;
                  refreshSubmit();
                }
              });
              return h(
                'div.row.row--sunk',
                {},
                box,
                h('label.row__main', { 'for': boxId }, h('p.row__title', { text: name }))
              );
            })
          : emptyState('users', 'No contacts available', 'This build ships with a small fixture list only.')
      );
      refreshSubmit();
    }

    var consentBox = h('input', {
      type: 'checkbox',
      id: consentId,
      onchange: function (event) {
        consented = !!event.target.checked;
        if (!consented) {
          selected = {};
        }
        paintList();
      }
    });

    paintList();

    return h(
      'div.card__body',
      {},
      h(
        'div.row.row--sunk',
        {},
        consentBox,
        h('label.row__main', { 'for': consentId }, h('p.row__title', { text: 'I agree to share these contacts with GoRun' }))
      ),
      hint('Nothing is read from your real address book. This is a fixture list, and the names you pick stay on this device.'),
      listNode,
      hint('Changed your mind? Remove a contact from the Friends list and its invite data is deleted from this device.'),
      h('div.banner__actions', {}, submitBtn)
    );
  }

  function openInviteDialog() {
    var tab = 'link';
    var container = h('div');

    var instance = GR.dialog({
      title: 'Invite a friend',
      icon: 'users',
      size: 'lg',
      body: container
    });

    function close() {
      instance.close('done');
    }

    function paint() {
      var body = tab === 'email' ? inviteEmailTab(close) : tab === 'contacts' ? inviteContactsTab(close) : inviteLinkTab(close);
      GR.mount(container, [
        segmented(
          [
            { key: 'link', label: 'Link' },
            { key: 'email', label: 'Email' },
            { key: 'contacts', label: 'Contacts' }
          ],
          tab,
          function (key) {
            tab = key;
            paint();
          }
        ),
        body
      ]);
    }

    paint();
    return instance;
  }

  /* ================================================= story 16 leaderboard */

  var leaderboardPeriod = 'week';
  var LEADERBOARD_LIMIT = 5;

  function leaderboardRow(row, unit, optedOut) {
    var name = row.isSelf ? selfLabel(optedOut) : row.name;
    return h(
      'div.row' + (row.isSelf ? '.row--accent' : ''),
      row.isSelf ? { dataset: { accent: 'yellow' } } : {},
      h('span.row__rank', { 'aria-hidden': 'true' }, String(row.rank)),
      avatar(name, row.hue),
      h(
        'div.row__main',
        {},
        h('p.row__title', {}, h('span', { text: name }), row.isSelf && optedOut ? h('span.chip.chip--muted', { text: 'You' }) : null),
        h('p.row__meta', { text: 'Rank ' + row.rank })
      ),
      h('div.row__end', {}, h('span.stat__value--sm', { text: D.formatKm(row.km, unit) }))
    );
  }

  function renderLeaderboard() {
    var node = host('leaderboard');
    if (!node) return;

    var d = derived();
    var unit = d.unit;
    var state = d.state;
    var optedOut = !!(state && state.settings && state.settings.leaderboardOptOut);
    var rows = D.buildLeaderboard(state, leaderboardPeriod) || [];

    var visible = rows.slice(0, LEADERBOARD_LIMIT);
    var selfRow = rows.filter(function (row) {
      return row.isSelf;
    })[0];
    var selfVisible = visible.some(function (row) {
      return row.isSelf;
    });
    // The runner must always see their own standing, even outside the top five.
    if (selfRow && !selfVisible) visible = visible.concat([selfRow]);

    var hasFriends = rows.length > 1;

    GR.mount(node, [
      h(
        'header.card__head',
        {},
        h('h2.card__title', {}, icon('trophy'), h('span', { text: 'Leaderboard' })),
        h('div.card__actions', {}, segmented(
          [
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' }
          ],
          leaderboardPeriod,
          function (key) {
            leaderboardPeriod = key;
            renderLeaderboard();
          }
        ))
      ),
      h(
        'div.card__body',
        {},
        optedOut
          ? h(
              'div.banner.banner--info',
              {},
              icon('info'),
              h(
                'div.banner__body',
                {},
                h('p', { text: 'You are hidden from the leaderboard. Friends would not see your name or distance.' })
              )
            )
          : null,
        h(
          'div.list',
          {},
          visible.map(function (row) {
            return leaderboardRow(row, unit, optedOut);
          })
        ),
        hasFriends
          ? null
          : emptyState(
              'users',
              'Just you so far',
              'Invite a friend and their weekly and monthly distances appear here alongside yours.',
              h(
                'button.btn.btn--primary.btn--sm',
                {
                  type: 'button',
                  onclick: function () {
                    openInviteDialog();
                  }
                },
                icon('plus', { size: 14 }),
                'Invite a friend'
              )
            ),
        hint('Only activities classified as runs count towards the ranking — walks and other activities are ignored.'),
        hint(SIM_NOTE + ' Friend distances come from seeded fixture data.'),
        h(
          'div.banner__actions',
          {},
          h(
            'button.btn.btn--secondary.btn--sm',
            {
              type: 'button',
              'aria-pressed': optedOut ? 'true' : 'false',
              onclick: function () {
                GR.actions.toggleLeaderboardOptOut();
              }
            },
            icon(optedOut ? 'users' : 'lock', { size: 14 }),
            optedOut ? 'Show me on the leaderboard' : 'Hide me from the leaderboard'
          )
        )
      )
    ]);
  }

  /* ================================================== story 17 challenges */

  function challengeTiming(challenge) {
    if (challenge.endDate < D.todayKey()) return 'Finished';
    if (challenge.daysLeft === 0) return 'Ends today';
    if (challenge.daysLeft === 1) return '1 day left';
    return challenge.daysLeft + ' days left';
  }

  function openStandingsDialog(challenge) {
    var d = derived();
    var unit = d.unit;
    var optedOut = !!(d.state && d.state.settings && d.state.settings.leaderboardOptOut);
    var standings = challenge.standings || [];

    var instance = GR.dialog({
      title: challenge.name + ' standings',
      icon: 'trophy',
      size: 'lg',
      body: h(
        'div.card__body',
        {},
        h('p.dialog__message', { text: challengeTiming(challenge) + ' · target ' + D.formatKm(challenge.goalKm, unit) }),
        h(
          'div.list.scroll-y',
          {},
          standings.map(function (row) {
            var name = row.isSelf ? selfLabel(optedOut) : row.name;
            return h(
              'div.row' + (row.isSelf ? '.row--accent' : ''),
              row.isSelf ? { dataset: { accent: challenge.accent } } : {},
              h('span.row__rank', { 'aria-hidden': 'true' }, String(row.rank)),
              avatar(name, row.hue),
              h(
                'div.row__main',
                {},
                h('p.row__title', {}, h('span', { text: name }), row.isSelf && optedOut ? h('span.chip.chip--muted', { text: 'You' }) : null),
                h('p.row__meta', { text: 'Rank ' + row.rank })
              ),
              h('div.row__end', {}, h('span.stat__value--sm', { text: D.formatKm(row.km, unit) }))
            );
          })
        ),
        hint(SIM_NOTE + ' Other participants are seeded fixture runners.')
      ),
      footer: [
        h(
          'button.btn.btn--ghost',
          {
            type: 'button',
            onclick: function () {
              instance.close('done');
            }
          },
          'Close'
        ),
        h(
          'button.btn.btn--primary',
          {
            type: 'button',
            onclick: function () {
              instance.close('share');
              openShareDialog({ kind: 'challenge', challenge: challenge });
            }
          },
          icon('share', { size: 15 }),
          'Share'
        )
      ]
    });
  }

  function challengeRow(challenge, unit) {
    var progressBlock = challenge.joined
      ? [
          meter(challenge.percent, challenge.accent),
          h('p.row__meta', {
            text: D.formatKm(challenge.contributedKm, unit) + ' of ' + D.formatKm(challenge.goalKm, unit) + ' · ' + challenge.percent + '%'
          }),
          challenge.completed
            ? h('p.row__meta', { text: 'Finished — the Challenger badge was awarded for this.' })
            : null,
          h(
            'div.banner__actions',
            {},
            h(
              'button.btn.btn--secondary.btn--sm',
              {
                type: 'button',
                'aria-label': 'View standings for ' + challenge.name,
                onclick: function () {
                  openStandingsDialog(challenge);
                }
              },
              icon('trophy', { size: 14 }),
              'View standings'
            ),
            h(
              'button.btn.btn--ghost.btn--sm',
              {
                type: 'button',
                'aria-label': 'Leave ' + challenge.name,
                onclick: function () {
                  GR.confirm({
                    title: 'Leave ' + challenge.name + '?',
                    message: 'Your distance stays in GoRun, but it stops counting towards this challenge.',
                    confirmLabel: 'Leave',
                    cancelLabel: 'Stay in',
                    tone: 'danger'
                  }).then(function (ok) {
                    if (ok) GR.actions.leaveChallenge(challenge.id);
                  });
                }
              },
              'Leave'
            )
          )
        ]
      : [
          h(
            'div.banner__actions',
            {},
            h(
              'button.btn.btn--primary.btn--sm',
              {
                type: 'button',
                'aria-label': 'Join ' + challenge.name,
                onclick: function () {
                  GR.actions.joinChallenge(challenge.id);
                }
              },
              icon('flag', { size: 14 }),
              'Join'
            )
          )
        ];

    return h(
      'div.row',
      { dataset: { accent: challenge.accent } },
      h('span.row__avatar', { 'aria-hidden': 'true' }, icon(challenge.icon)),
      h(
        'div.row__main',
        {},
        h(
          'p.row__title',
          {},
          h('span', { text: challenge.name }),
          challenge.joined && challenge.completed ? h('span.chip.chip--ok', { text: 'Completed' }) : null
        ),
        h('p.row__meta', { text: challenge.blurb }),
        h('p.row__meta', {
          text: (Number(challenge.participants) || 0).toLocaleString() + ' participants · ' + challengeTiming(challenge)
        }),
        progressBlock
      )
    );
  }

  function renderChallenges() {
    var node = host('challenges');
    if (!node) return;

    var d = derived();
    var unit = d.unit;
    var challenges = d.challenges || [];
    var joinedCount = challenges.filter(function (c) {
      return c.joined;
    }).length;

    GR.mount(node, [
      h(
        'header.card__head',
        {},
        h('h2.card__title', {}, icon('flag'), h('span', { text: 'Community challenges' })),
        h('div.card__actions', {}, h('span.chip.chip--accent', { text: joinedCount + ' joined' }))
      ),
      h(
        'div.card__body',
        {},
        challenges.length
          ? h(
              'div.list.scroll-y',
              {},
              challenges.map(function (challenge) {
                return challengeRow(challenge, unit);
              })
            )
          : emptyState('flag', 'No challenges available', 'Challenges appear once a month is under way.'),
        hint(SIM_NOTE + ' Participant counts and standings are fixture data; only your own distance is real.')
      )
    ]);
  }

  /* ======================================================== story 15 share */

  function shareContent(payload) {
    var d = derived();
    var unit = d.unit;
    var kind = payload && payload.kind ? payload.kind : 'month';

    if (kind === 'run' && payload.run) {
      var run = payload.run;
      var pace = D.formatPace(run.paceMinPerKm, unit);
      return {
        accent: 'salmon',
        eyebrow: 'Run complete',
        headline: D.formatKm(run.distanceKm, unit),
        stats: [
          { value: D.formatDuration(run.durationSec), label: 'Time' },
          { value: pace || '—', label: 'Pace' },
          { value: D.formatDayLabel(run.date), label: 'Date' }
        ],
        text:
          'Just ran ' +
          D.formatKm(run.distanceKm, unit) +
          ' in ' +
          D.formatDuration(run.durationSec) +
          (pace ? ' at ' + pace : '') +
          '. Tracked with GoRun.'
      };
    }

    if (kind === 'streak') {
      var streak = d.streak || { current: 0, longest: 0 };
      return {
        accent: 'coral',
        eyebrow: 'Streak',
        headline: streak.current + ' day streak',
        stats: [
          { value: String(streak.current), label: 'Current' },
          { value: String(streak.longest), label: 'Longest' }
        ],
        text:
          'Kept my running plan alive for ' +
          streak.current +
          ' day' +
          (streak.current === 1 ? '' : 's') +
          ' in a row. Longest run of form so far: ' +
          streak.longest +
          ' days. Tracked with GoRun.'
      };
    }

    if (kind === 'badge' && payload.badge) {
      var badge = payload.badge;
      return {
        accent: badge.accent || 'yellow',
        eyebrow: 'Badge unlocked',
        headline: badge.name,
        stats: [
          { value: badge.earnedAt ? badgeDateText(badge) : 'Today', label: 'Earned' },
          { value: 'GoRun', label: 'Where' }
        ],
        text: 'Unlocked the ' + badge.name + ' badge on GoRun — ' + badge.criteria
      };
    }

    if (kind === 'challenge' && payload.challenge) {
      var challenge = payload.challenge;
      return {
        accent: challenge.accent || 'green',
        eyebrow: 'Community challenge',
        headline: challenge.name,
        stats: [
          { value: D.formatKm(challenge.contributedKm, unit), label: 'My distance' },
          { value: D.formatKm(challenge.goalKm, unit), label: 'Target' },
          { value: challenge.percent + '%', label: 'Progress' }
        ],
        text:
          'I am ' +
          challenge.percent +
          '% through the ' +
          challenge.name +
          ' challenge on GoRun — ' +
          D.formatKm(challenge.contributedKm, unit) +
          ' of ' +
          D.formatKm(challenge.goalKm, unit) +
          '.'
      };
    }

    var month = d.month;
    if (!month) {
      return {
        accent: 'periwinkle',
        eyebrow: 'GoRun',
        headline: 'Getting started',
        stats: [{ value: String((d.activities || []).length), label: 'Activities' }],
        text: 'Tracking my monthly running goal with GoRun.'
      };
    }

    return {
      accent: 'periwinkle',
      eyebrow: D.formatMonthLabel(month.monthKey, { short: true }) + ' goal',
      headline: month.percent + '%',
      stats: [
        { value: D.formatKm(month.actualKm, unit), label: 'Run' },
        { value: D.formatKm(month.targetKm, unit), label: 'Target' },
        { value: D.formatKm(month.remainingKm, unit), label: 'To go' }
      ],
      text:
        D.formatKm(month.actualKm, unit) +
        ' of my ' +
        D.formatKm(month.targetKm, unit) +
        ' goal for ' +
        D.formatMonthLabel(month.monthKey) +
        ' — ' +
        month.percent +
        '% of the way there. Tracked with GoRun.'
    };
  }

  function openShareDialog(payload) {
    var content = shareContent(payload || {});
    var shareUrl = baseUrl();
    var textId = GR.uid('share-text');

    var textarea = h('textarea.field__input', {
      id: textId,
      rows: 4,
      value: content.text,
      oninput: function () {
        syncLinks();
      }
    });

    function currentText() {
      return String(textarea.value || '').trim() || content.text;
    }

    var twitterLink = h(
      'a.btn.btn--secondary',
      {
        href: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(content.text),
        target: '_blank',
        rel: 'noopener noreferrer'
      },
      icon('share', { size: 15 }),
      'X / Twitter'
    );

    var linkedinLink = h(
      'a.btn.btn--secondary',
      {
        href: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(shareUrl),
        target: '_blank',
        rel: 'noopener noreferrer'
      },
      icon('share', { size: 15 }),
      'LinkedIn'
    );

    function syncLinks() {
      twitterLink.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(currentText());
      linkedinLink.href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(shareUrl);
    }

    var preview = h(
      'div.share-card',
      { dataset: { accent: content.accent } },
      h('p.share-card__eyebrow', { text: content.eyebrow }),
      h('p.share-card__headline', { text: content.headline }),
      h(
        'div.share-card__stats',
        {},
        content.stats.map(function (stat) {
          return h(
            'div.stat',
            {},
            h('span.stat__value.stat__value--sm', { text: stat.value }),
            h('span.stat__label', { text: stat.label })
          );
        })
      ),
      h('span.share-card__brand', { text: 'GoRun' })
    );

    var instance = GR.dialog({
      title: 'Share your progress',
      icon: 'share',
      size: 'lg',
      body: h(
        'div.card__body',
        {},
        preview,
        labelledField(textId, 'Message', textarea, 'Edit this before you share it — nothing is posted until you pick a destination below.'),
        hint('LinkedIn only accepts a link, so paste the message into the post once its composer opens.')
      ),
      footer: [
        canWebShare()
          ? h(
              'button.btn.btn--primary',
              {
                type: 'button',
                onclick: function () {
                  global.navigator
                    .share({ title: 'GoRun', text: currentText(), url: shareUrl })
                    .then(function () {
                      instance.close('shared');
                      GR.toast('Shared', { tone: 'success', icon: 'share' });
                    })
                    .catch(function () {
                      /* Dismissed or unsupported target — leave the dialog open. */
                    });
                }
              },
              icon('share', { size: 15 }),
              'Share…'
            )
          : null,
        h(
          'button.btn.btn--secondary',
          {
            type: 'button',
            onclick: function () {
              copyText(currentText()).then(function (ok) {
                if (ok) {
                  instance.close('copied');
                  GR.toast('Message copied', { tone: 'success', icon: 'check' });
                } else {
                  GR.toast('Could not copy automatically', {
                    tone: 'danger',
                    icon: 'warning',
                    detail: 'Select the message and copy it by hand.'
                  });
                }
              });
            }
          },
          icon('link', { size: 15 }),
          'Copy text'
        ),
        twitterLink,
        linkedinLink
      ]
    });

    syncLinks();
    return instance;
  }

  /* ================================================================ wire */

  GR.ui.shareDialog = openShareDialog;
  GR.ui.inviteDialog = openInviteDialog;

  GR.registerPanel('badges', renderBadges);
  GR.registerPanel('points', renderPoints);
  GR.registerPanel('friends', renderFriends);
  GR.registerPanel('leaderboard', renderLeaderboard);
  GR.registerPanel('challenges', renderChallenges);
})(window);
