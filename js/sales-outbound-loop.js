/**
 * Outbound smart-demo emails: paste demo URL, copy templates or open mailto.
 * Persists demo link in localStorage (jl-outbound-demo-link).
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'jl-outbound-demo-link';

  var SUBJECT_1 = 'Quick idea for your website';
  var SUBJECT_2 = 'Re: quick example';

  function bodyTouch1(demoLink, firstName) {
    var greet = firstName ? 'Hey ' + firstName + ' —' : 'Hey —';
    var link = (demoLink || '').trim() || '[INSERT DEMO LINK]';
    return (
      greet +
      ' I took a quick look at your site and noticed something:\n\n' +
      'Your current setup makes it easy for people to reach out, but not easy to qualify or book quickly.\n\n' +
      'So I put together a quick example of what this could look like for you:\n\n' +
      link +
      '\n\n' +
      'This shows how you could:\n' +
      '• capture better job details upfront\n' +
      '• filter out low-quality leads\n' +
      '• and book faster without back-and-forth\n\n' +
      "No pitch—just a working example.\n\n" +
      "If this is close to what you'd want, I can tailor it to your exact setup.\n\n" +
      'What do you think?'
    );
  }

  function bodyTouch2() {
    return (
      'Just wanted to bump this — curious if you had a chance to check it out.\n\n' +
      'Even small changes to intake and booking can make a big difference in how many jobs actually get scheduled.\n\n' +
      'Happy to walk through it with you if helpful.'
    );
  }

  function $(id) {
    return document.getElementById(id);
  }

  function copyText(text, statusEl, okMsg) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          if (statusEl) {
            statusEl.textContent = okMsg || 'Copied.';
            statusEl.hidden = false;
            setTimeout(function () {
              statusEl.hidden = true;
            }, 2200);
          }
        },
        function () {
          prompt('Copy:', text);
        }
      );
    } else {
      prompt('Copy:', text);
    }
  }

  function mailtoHref(to, subject, body) {
    var q =
      'subject=' +
      encodeURIComponent(subject) +
      '&body=' +
      encodeURIComponent(body);
    var addr = to && String(to).trim() ? String(to).trim() : '';
    if (addr) {
      return 'mailto:' + addr + '?' + q;
    }
    return 'mailto:?' + q;
  }

  function readInputs() {
    var demo = $('outbound-demo-link');
    var name = $('outbound-first-name');
    var email = $('outbound-prospect-email');
    return {
      demoLink: demo ? demo.value.trim() : '',
      firstName: name ? name.value.trim() : '',
      email: email ? email.value.trim() : '',
    };
  }

  function render() {
    var v = readInputs();
    var b1 = bodyTouch1(v.demoLink, v.firstName);
    var b2 = bodyTouch2();

    var s1 = $('outbound-preview-subject-1');
    var p1 = $('outbound-preview-body-1');
    var s2 = $('outbound-preview-subject-2');
    var p2 = $('outbound-preview-body-2');
    if (s1) s1.textContent = SUBJECT_1;
    if (p1) p1.textContent = b1;
    if (s2) s2.textContent = SUBJECT_2;
    if (p2) p2.textContent = b2;

    var m1 = $('outbound-mailto-1');
    var m2 = $('outbound-mailto-2');
    if (m1) m1.href = mailtoHref(v.email, SUBJECT_1, b1);
    if (m2) m2.href = mailtoHref(v.email, SUBJECT_2, b2);

    try {
      if (v.demoLink) localStorage.setItem(STORAGE_KEY, v.demoLink);
    } catch (_) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    var demoInput = $('outbound-demo-link');
    if (demoInput) {
      try {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved && !demoInput.value) demoInput.value = saved;
      } catch (_) {}
    }

    ['outbound-demo-link', 'outbound-first-name', 'outbound-prospect-email'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', render);
    });

    $('outbound-copy-1') &&
      $('outbound-copy-1').addEventListener('click', function () {
        var v = readInputs();
        var body = bodyTouch1(v.demoLink, v.firstName);
        copyText(SUBJECT_1 + '\n\n' + body, $('outbound-tool-status'), 'Touch 1 copied (subject + body).');
      });

    $('outbound-copy-body-1') &&
      $('outbound-copy-body-1').addEventListener('click', function () {
        var v = readInputs();
        copyText(bodyTouch1(v.demoLink, v.firstName), $('outbound-tool-status'), 'Touch 1 body copied.');
      });

    $('outbound-copy-2') &&
      $('outbound-copy-2').addEventListener('click', function () {
        copyText(SUBJECT_2 + '\n\n' + bodyTouch2(), $('outbound-tool-status'), 'Follow-up copied.');
      });

    $('outbound-copy-body-2') &&
      $('outbound-copy-body-2').addEventListener('click', function () {
        copyText(bodyTouch2(), $('outbound-tool-status'), 'Follow-up body copied.');
      });

    render();
  });
})();
