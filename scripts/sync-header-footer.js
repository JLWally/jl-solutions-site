#!/usr/bin/env node
/**
 * Sync sitewide marketing headers/footers to partials/header.html + footer.html.
 * Skips app/internal/funnel chrome.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const header = fs.readFileSync(path.join(ROOT, 'partials/header.html'), 'utf8').trim() + '\n';
const footer = fs.readFileSync(path.join(ROOT, 'partials/footer.html'), 'utf8').trim() + '\n';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'lead-engine',
  'referral',
  'referral-dashboard',
  'internal-pay',
  'sales',
  'netlify',
  'supabase',
  'scripts',
  'docs',
  'css',
  'js',
  'assets',
  'partials',
  'demo-data',
  '.snapshots',
  '.venv',
  '.netlify',
]);

const SKIP_FILES = new Set([
  'get-started.html',
  'demo-builder.html',
  'demo-quick.html',
  'internal-outreach.html',
  'thank-you.html',
]);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.') && name !== '.') continue;
    const full = path.join(dir, name);
    const rel = path.relative(ROOT, full);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(full, out);
    } else if (name.endsWith('.html')) {
      if (SKIP_FILES.has(name)) continue;
      // skip onboarding funnel chrome
      if (rel.startsWith('onboarding' + path.sep)) continue;
      out.push(full);
    }
  }
  return out;
}

function replaceBalanced(html, startRe, endTag) {
  const m = html.match(startRe);
  if (!m) return { html, replaced: false };
  const start = m.index;
  const openTagEnd = html.indexOf('>', start) + 1;
  if (openTagEnd <= 0) return { html, replaced: false };
  const tagName = endTag.replace(/[<>/]/g, '');
  let i = openTagEnd;
  let depth = 1;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf('<' + tagName, i);
    const nextClose = html.indexOf('</' + tagName, i);
    if (nextClose === -1) return { html, replaced: false };
    if (nextOpen !== -1 && nextOpen < nextClose) {
      // could be <tag or <tagNameSomething — check word boundary
      const after = html[nextOpen + 1 + tagName.length];
      if (after === '>' || after === ' ' || after === '\n' || after === '\r' || after === '\t') {
        depth += 1;
        i = nextOpen + 1;
        continue;
      }
      i = nextOpen + 1;
      continue;
    }
    depth -= 1;
    if (depth === 0) {
      const end = html.indexOf('>', nextClose) + 1;
      const before = html.slice(0, start);
      const after = html.slice(end);
      return { html: before + 'REPLACE_MARKER' + after, replaced: true, start, end };
    }
    i = nextClose + 1;
  }
  return { html, replaced: false };
}

function looksLikeMainNav(block) {
  return (
    /navbar-dark/.test(block) &&
    /jl-theme/.test(block) &&
    /navbar-nav/.test(block) &&
    /(Services|Case Studies|Contact)/.test(block) &&
    !/jl-start-header/.test(block) &&
    !/lead-engine/.test(block)
  );
}

function looksLikeSiteFooter(block) {
  return (
    /footer-home/.test(block) ||
    (/footer__cta/.test(block) && /Get in Touch|footer__contact/.test(block))
  );
}

const files = walk(ROOT);
let navCount = 0;
let footerCount = 0;
let slotPages = 0;
const changed = [];

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  const original = html;
  const rel = path.relative(ROOT, file);

  // Pages that inject partials — leave slots alone
  if (/id=["']header["']/.test(html) || /id=["']footer["']/.test(html)) {
    slotPages += 1;
    // ensure main.js is present
    if (!/\/js\/main\.js|js\/main\.js/.test(html)) {
      html = html.replace(
        /<\/body>/i,
        '  <script src="/js/main.js"></script>\n</body>'
      );
    }
    if (html !== original) {
      fs.writeFileSync(file, html);
      changed.push(rel + ' (ensure main.js)');
    }
    continue;
  }

  // Skip special headers
  if (/jl-start-header|lead-engine-shell|referral-nav/.test(html)) continue;

  // Replace main site nav
  const navStart = /<nav\b[^>]*class="[^"]*navbar[^"]*jl-theme[^"]*"[^>]*>/i;
  if (navStart.test(html)) {
    const m = html.match(navStart);
    const probe = html.slice(m.index, m.index + 2500);
    if (looksLikeMainNav(probe)) {
      const res = replaceBalanced(html, navStart, 'nav');
      if (res.replaced) {
        html = res.html.replace('REPLACE_MARKER', header.trim());
        navCount += 1;
      }
    }
  }

  // Replace site footer
  const footerStart = /<footer\b[^>]*(?:footer-home|jl-theme)[^>]*>/i;
  if (footerStart.test(html)) {
    const m = html.match(footerStart);
    const probe = html.slice(m.index, Math.min(html.length, m.index + 3500));
    if (looksLikeSiteFooter(probe) || /footer-home/.test(probe)) {
      const res = replaceBalanced(html, footerStart, 'footer');
      if (res.replaced) {
        // preserve no-print / mt-5 extras on opening tag if present
        let nextFooter = footer.trim();
        const open = m[0];
        if (/\bno-print\b/.test(open)) {
          nextFooter = nextFooter.replace(
            'class="jl-theme footer-home"',
            'class="jl-theme footer-home no-print"'
          );
        }
        if (/\bmt-5\b/.test(open)) {
          nextFooter = nextFooter.replace(
            'class="jl-theme footer-home',
            'class="jl-theme footer-home mt-5'
          );
        }
        html = res.html.replace('REPLACE_MARKER', nextFooter);
        footerCount += 1;
      }
    }
  }

  if (html !== original) {
    fs.writeFileSync(file, html);
    changed.push(rel);
  }
}

console.log(JSON.stringify({ filesScanned: files.length, navCount, footerCount, slotPages, changedCount: changed.length, changed }, null, 2));
