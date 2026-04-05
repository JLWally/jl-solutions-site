/**
 * Internal /internal/demo-builder — POST demo-config, show live URL, copy link.
 * Auth: same lead_engine_session as /internal/outreach (see demo-config POST rules).
 */
(function () {
  'use strict';

  var industriesCache = null;

  function $(id) {
    return document.getElementById(id);
  }

  function showAuthWall(signedIn) {
    var wall = $('idbAuthWall');
    var app = $('idbApp');
    var wallText = $('idbAuthWallText');
    var loginLink = $('idbLoginLink');
    if (!wall || !app) return;
    if (signedIn) {
      wall.classList.add('d-none');
      app.classList.remove('d-none');
      if (loginLink) loginLink.classList.add('d-none');
    } else {
      wall.classList.remove('d-none');
      app.classList.add('d-none');
      if (wallText) {
        wallText.textContent =
          'Sign in with your lead engine operator account to create demos (same session as Outreach).';
      }
      if (loginLink) {
        var ret =
          window.location.pathname +
          (window.location.search || '') +
          (window.location.hash || '');
        loginLink.href = '/lead-engine/login.html?return=' + encodeURIComponent(ret);
        loginLink.classList.remove('d-none');
      }
    }
  }

  async function checkLeadEngineSession() {
    var res = await fetch('/.netlify/functions/lead-engine-auth', { credentials: 'include' });
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      return { ok: false, username: null };
    }
    return { ok: true, username: data.username || null };
  }

  function fetchIndustries() {
    if (industriesCache) return Promise.resolve(industriesCache);
    return fetch('/.netlify/functions/demo-config?meta=industries', {
      headers: { Accept: 'application/json' },
    })
      .then(function (r) {
        if (!r.ok) throw new Error('Could not load industries');
        return r.json();
      })
      .then(function (data) {
        industriesCache = data.industries || [];
        return industriesCache;
      });
  }

  function linesToList(textarea) {
    var el = textarea;
    if (!el || !el.value) return [];
    var out = [];
    var seen = {};
    el.value.split(/\n/).forEach(function (line) {
      var t = String(line || '').trim();
      if (!t) return;
      var k = t.toLowerCase();
      if (seen[k]) return;
      seen[k] = true;
      out.push(t);
    });
    return out.slice(0, 12);
  }

  function slugifyClient(name) {
    var s = String(name || '')
      .toLowerCase()
      .trim()
      .replace(/['']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 72);
    return s || '';
  }

  function setMsg(el, text, ok) {
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('internal-demo-msg--ok', !!ok);
    el.hidden = !text;
  }

  function formatDemoConfigError(body, status) {
    var err = (body && body.error) || 'HTTP ' + status;
    if (body && body.details) err += '\n\n' + body.details;
    return err;
  }

  document.addEventListener('DOMContentLoaded', async function () {
    var sess = await checkLeadEngineSession();
    if (!sess.ok) {
      showAuthWall(false);
      return;
    }
    showAuthWall(true);
    var badge = $('idbSessionBadge');
    if (badge && sess.username) {
      badge.textContent = 'Signed in: ' + sess.username;
      badge.classList.remove('d-none');
    }

    var industrySel = $('idbIndustry');
    var form = $('internalDemoBuilderForm');
    var msg = $('idbMsg');
    var result = $('idbResult');
    var linkEl = $('idbShareLink');
    var dbHint = $('idbDbHint');

    fetchIndustries()
      .then(function (list) {
        if (!industrySel) return;
        industrySel.innerHTML = '<option value="" disabled selected>Select industry…</option>';
        list.forEach(function (ind) {
          var opt = document.createElement('option');
          opt.value = ind.key;
          opt.textContent = ind.label;
          industrySel.appendChild(opt);
        });
        var btn = $('idbSubmit');
        if (btn) btn.disabled = false;
      })
      .catch(function (e) {
        setMsg(msg, e.message || 'Load presets failed. Use Netlify dev or deploy with Functions.', false);
      });

    $('idbSlugSuggest') &&
      $('idbSlugSuggest').addEventListener('click', function () {
        var nameEl = $('idbBusinessName');
        var slugEl = $('idbSlug');
        if (!slugEl) return;
        var n = nameEl && nameEl.value.trim();
        slugEl.value = slugifyClient(n);
      });

    $('idbCopyBtn') &&
      $('idbCopyBtn').addEventListener('click', function () {
        var a = $('idbShareLink');
        if (!a || !a.href) return;
        var url = a.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(
            function () {
              setMsg(msg, 'Demo URL copied.', true);
            },
            function () {
              window.prompt('Copy this URL:', url);
            }
          );
        } else {
          window.prompt('Copy this URL:', url);
        }
      });

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        setMsg(msg, '', false);
        if (result) result.hidden = true;
        if (dbHint) {
          dbHint.hidden = true;
          dbHint.textContent = '';
        }

        var businessName = ($('idbBusinessName') && $('idbBusinessName').value.trim()) || '';
        if (!businessName) {
          setMsg(msg, 'Business name is required.', false);
          return;
        }

        var industry = industrySel && industrySel.value ? industrySel.value.trim() : '';
        if (!industry) {
          setMsg(msg, 'Select an industry.', false);
          return;
        }

        var slugRaw = $('idbSlug') && $('idbSlug').value.trim();
        var services = linesToList($('idbServices'));
        var issueOptions = linesToList($('idbIssues'));
        var ctaSvcEl = $('idbCtaService');
        var ctaService = ctaSvcEl && ctaSvcEl.value ? ctaSvcEl.value : 'ai-intake';
        var notes = ($('idbNotes') && $('idbNotes').value.trim()) || '';

        var headers = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };

        var payload = {
          businessName: businessName,
          industry: industry,
          services: services,
          issueOptions: issueOptions,
          ctaService: ctaService,
          notes: notes,
          source: 'internal-demo-builder',
        };
        if (slugRaw) payload.slug = slugRaw;

        var btn = $('idbSubmit');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Creating…';
        }

        fetch('/.netlify/functions/demo-config', {
          method: 'POST',
          credentials: 'include',
          headers: headers,
          body: JSON.stringify(payload),
        })
          .then(function (r) {
            return r.json().then(function (body) {
              return { ok: r.ok, status: r.status, body: body };
            });
          })
          .then(function (x) {
            if (x.status === 401) {
              throw new Error(
                'Unauthorized — sign in via lead engine, or use Bearer DEMO_GENERATOR_SECRET from a script.'
              );
            }
            if (x.status === 409) {
              throw new Error((x.body && x.body.error) || 'That slug is already taken or reserved.');
            }
            if (!x.ok) {
              throw new Error(formatDemoConfigError(x.body, x.status));
            }
            var url = x.body.url;
            if (!url && x.body.path) {
              url = window.location.origin + x.body.path;
            }
            if (linkEl) {
              linkEl.href = url;
              linkEl.textContent = url;
            }
            if (result) result.hidden = false;
            setMsg(msg, 'Demo created. Share the URL below.', true);
            if (dbHint && x.body) {
              if (x.body.persistedSupabase) {
                dbHint.textContent = 'Also saved to Supabase (jl_demo_configs).';
                dbHint.hidden = false;
              } else {
                dbHint.textContent =
                  'Supabase row not written (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and run supabase/jl_demo_configs.sql).';
                dbHint.hidden = false;
              }
            }
          })
          .catch(function (err) {
            setMsg(msg, err.message || 'Could not create demo.', false);
          })
          .finally(function () {
            if (btn) {
              btn.disabled = false;
              btn.textContent = 'Create demo & show URL';
            }
          });
      });
    }
  });
})();
