/**
 * Smart demo builder: POST demo-config, copy share URL.
 */
(function () {
  'use strict';

  var industriesCache = null;

  function $(id) {
    return document.getElementById(id);
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

  function selectedIndustryKey() {
    var sel = $('builderIndustry');
    return sel && sel.value ? sel.value : 'generic';
  }

  function industryByKey(key) {
    var list = industriesCache || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].key === key) return list[i];
    }
    return null;
  }

  function renderServiceChecks() {
    var wrap = $('builderServices');
    if (!wrap) return;
    var key = selectedIndustryKey();
    var ind = industryByKey(key);
    var defaults = (ind && ind.defaultServices) || [];
    wrap.innerHTML = '';
    defaults.forEach(function (svc) {
      var t = String(svc || '').trim();
      if (!t) return;
      var id = 'svc-' + t.replace(/\s+/g, '-').slice(0, 40) + '-' + Math.random().toString(36).slice(2, 7);
      var lab = document.createElement('label');
      lab.innerHTML =
        '<input type="checkbox" name="builder-svc" value="' +
        t.replace(/"/g, '&quot;') +
        '" checked /> <span>' +
        t.replace(/</g, '&lt;') +
        '</span>';
      wrap.appendChild(lab);
    });
  }

  function gatherServices() {
    var out = [];
    var seen = {};
    document.querySelectorAll('input[name="builder-svc"]:checked').forEach(function (cb) {
      var t = String(cb.value || '').trim();
      if (!t) return;
      var k = t.toLowerCase();
      if (seen[k]) return;
      seen[k] = true;
      out.push(t);
    });
    var extra = $('builderCustomServices');
    if (extra && extra.value) {
      extra.value.split(/\n/).forEach(function (line) {
        var t = String(line || '').trim();
        if (!t) return;
        var k = t.toLowerCase();
        if (seen[k]) return;
        seen[k] = true;
        out.push(t);
      });
    }
    return out.slice(0, 12);
  }

  function gatherIssues() {
    var extra = $('builderIssueOptions');
    if (!extra || !extra.value) return [];
    var out = [];
    var seen = {};
    extra.value.split(/\n/).forEach(function (line) {
      var t = String(line || '').trim();
      if (!t) return;
      var k = t.toLowerCase();
      if (seen[k]) return;
      seen[k] = true;
      out.push(t);
    });
    return out.slice(0, 12);
  }

  function setMsg(el, text, ok) {
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('demo-builder-msg--ok', !!ok);
    el.hidden = !text;
  }

  function formatDemoConfigError(body, status) {
    var err = (body && body.error) || 'HTTP ' + status;
    if (body && body.details) err += '\n\n' + body.details;
    return err;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var industrySel = $('builderIndustry');
    var form = $('demoBuilderForm');
    var msg = $('builderMsg');
    var result = $('builderResult');
    var linkEl = $('builderShareLink');

    fetchIndustries()
      .then(function (list) {
        if (!industrySel) return;
        industrySel.innerHTML = '';
        list.forEach(function (ind) {
          var opt = document.createElement('option');
          opt.value = ind.key;
          opt.textContent = ind.label;
          industrySel.appendChild(opt);
        });
        renderServiceChecks();
        var btn = $('builderSubmit');
        if (btn) btn.disabled = false;
      })
      .catch(function (e) {
        setMsg(msg, e.message || 'Failed to load presets. Deploy with Netlify Functions enabled.', false);
      });

    if (industrySel) {
      industrySel.addEventListener('change', renderServiceChecks);
    }

    $('builderCopyBtn') &&
      $('builderCopyBtn').addEventListener('click', function () {
        var a = $('builderShareLink');
        if (!a || !a.href) return;
        var url = a.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(
            function () {
              setMsg(msg, 'Link copied.', true);
            },
            function () {
              prompt('Copy this URL:', url);
            }
          );
        } else {
          prompt('Copy this URL:', url);
        }
      });

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        setMsg(msg, '', false);
        if (result) result.hidden = true;

        var businessName = ($('builderBusinessName') && $('builderBusinessName').value.trim()) || '';
        if (!businessName) {
          setMsg(msg, 'Enter a business name.', false);
          return;
        }

        var industry = selectedIndustryKey();
        var services = gatherServices();
        var issueOptions = gatherIssues();
        var ctaSvcEl = $('builderCtaService');
        var ctaService = ctaSvcEl && ctaSvcEl.value ? ctaSvcEl.value : 'ai-intake';
        var secretEl = $('builderSecret');
        var secret = secretEl ? secretEl.value.trim() : '';

        var headers = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };
        if (secret) headers.Authorization = 'Bearer ' + secret;

        var btn = $('builderSubmit');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Creating…';
        }

        fetch('/.netlify/functions/demo-config', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            businessName: businessName,
            industry: industry,
            services: services,
            issueOptions: issueOptions,
            ctaService: ctaService,
          }),
        })
          .then(function (r) {
            return r.json().then(function (body) {
              return { ok: r.ok, status: r.status, body: body };
            });
          })
          .then(function (x) {
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
            setMsg(msg, 'Demo created. Share the link below.', true);
          })
          .catch(function (err) {
            setMsg(
              msg,
              err.message ||
                'Could not create demo. If POST is protected, add your DEMO_GENERATOR_SECRET.',
              false
            );
          })
          .finally(function () {
            if (btn) {
              btn.disabled = false;
              btn.textContent = 'Create shareable demo';
            }
          });
      });
    }
  });
})();
