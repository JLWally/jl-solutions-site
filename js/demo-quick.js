/**
 * Quick demo wizard (demo-quick.html). Pretty URL /demo/quick is disabled in netlify.toml until launch.
 */
(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function showStep(n) {
    var s1 = $('dq-step-1');
    var s2 = $('dq-step-2');
    var load = $('dq-loading');
    if (s1) s1.hidden = n !== 1;
    if (s2) s2.hidden = n !== 2;
    if (load) load.hidden = n !== 3;
    var prog = $('dq-progress');
    if (prog) {
      prog.textContent = n === 3 ? 'Creating your demo…' : 'Step ' + n + ' of 2';
    }
  }

  function setErr(msg) {
    var el = $('dq-error');
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var businessName = '';
    var secret = '';

    fetch('/.netlify/functions/demo-config?meta=industries', { headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('Could not load industries.');
        return r.json();
      })
      .then(function (data) {
        var sel = $('dq-industry');
        if (!sel) return;
        sel.innerHTML = '';
        (data.industries || []).forEach(function (ind) {
          var opt = document.createElement('option');
          opt.value = ind.key;
          opt.textContent = ind.label;
          sel.appendChild(opt);
        });
      })
      .catch(function (e) {
        setErr(e.message || 'Check that Netlify Functions are enabled.');
      });

    $('dq-next-1') &&
      $('dq-next-1').addEventListener('click', function () {
        setErr('');
        var input = $('dq-business-name');
        var v = input ? input.value.trim() : '';
        if (!v) {
          setErr('Enter your business name.');
          if (input) input.focus();
          return;
        }
        businessName = v;
        showStep(2);
        var sel = $('dq-industry');
        if (sel) sel.focus();
      });

    $('dq-back-2') &&
      $('dq-back-2').addEventListener('click', function () {
        setErr('');
        showStep(1);
      });

    $('dq-submit') &&
      $('dq-submit').addEventListener('click', function () {
        setErr('');
        var sel = $('dq-industry');
        var industry = sel && sel.value ? sel.value : 'generic';
        var secEl = $('dq-secret');
        secret = secEl && secEl.value.trim() ? secEl.value.trim() : '';

        showStep(3);

        var headers = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };
        if (secret) headers.Authorization = 'Bearer ' + secret;

        fetch('/.netlify/functions/demo-config', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            businessName: businessName,
            industry: industry,
            services: [],
          }),
        })
          .then(function (r) {
            return r.json().then(function (body) {
              return { ok: r.ok, status: r.status, body: body };
            });
          })
          .then(function (x) {
            if (x.status === 401) {
              showStep(2);
              setErr('This site requires a generator secret. Enter it under “Team access” or use the full demo builder.');
              return;
            }
            if (!x.ok) {
              showStep(2);
              var qe = (x.body && x.body.error) || 'Could not create demo. Try again.';
              if (x.body && x.body.details) qe += '\n\n' + x.body.details;
              setErr(qe);
              return;
            }
            var url = x.body.url;
            if (!url && x.body.path) {
              url = window.location.origin + x.body.path;
            }
            if (url) {
              window.location.href = url;
              return;
            }
            showStep(2);
            setErr('No demo URL returned.');
          })
          .catch(function () {
            showStep(2);
            setErr('Network error. Check your connection and try again.');
          });
      });

    var nameInput = $('dq-business-name');
    if (nameInput) {
      nameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          $('dq-next-1') && $('dq-next-1').click();
        }
      });
    }
  });
})();
