'use strict';

/**
 * Netlify Dev sometimes merges env vars whose values point at bundled copies under
 * `.netlify/functions-serve/` or `.netlify/functions/`. Those paths are not real on-disk
 * sources and always break readFileSync. Unset the *_PATH env vars in Netlify UI + shell;
 * this guard avoids ENOENT until env is clean.
 *
 * @param {string} resolvedAbsolutePath
 * @returns {boolean}
 */
function isNetlifyBundleArtifactPath(resolvedAbsolutePath) {
  if (!resolvedAbsolutePath || typeof resolvedAbsolutePath !== 'string') return false;
  const n = resolvedAbsolutePath.replace(/\\/g, '/');
  return n.includes('/.netlify/functions-serve/') || n.includes('/.netlify/functions/');
}

module.exports = { isNetlifyBundleArtifactPath };
