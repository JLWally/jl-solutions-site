'use strict';

const { getStore } = require('@netlify/blobs');

function trimEnv(v) {
  if (v == null) return '';
  return String(v).trim();
}

function explicitBlobCredentials() {
  const siteID = trimEnv(process.env.NETLIFY_SITE_ID || process.env.SITE_ID);
  const token = trimEnv(process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_API_TOKEN);
  if (!siteID || !token) return null;
  return { siteID, token };
}

function isMissingBlobsEnvError(err) {
  if (!err) return false;
  if (err.name === 'MissingBlobsEnvironmentError') return true;
  return /MissingBlobsEnvironmentError|not been configured to use Netlify Blobs/i.test(String(err.message || ''));
}

/**
 * Named Netlify Blob store. Uses injected NETLIFY_BLOBS_CONTEXT on deploy and in
 * most `netlify dev` runs. If that is missing (wrong `netlify link` site, CLI
 * quirks), falls back to NETLIFY_SITE_ID + NETLIFY_AUTH_TOKEN (or NETLIFY_API_TOKEN)
 * from the environment.
 *
 * @param {string} name - Store name (e.g. smart-demos, referrals)
 * @returns {import('@netlify/blobs').Store}
 */
function getNamedBlobStore(name) {
  const storeName = String(name || '').trim();
  if (!storeName) {
    throw new Error('getNamedBlobStore: store name is required');
  }
  try {
    return getStore(storeName);
  } catch (err) {
    if (!isMissingBlobsEnvError(err)) throw err;
    const creds = explicitBlobCredentials();
    if (!creds) throw err;
    return getStore({ name: storeName, siteID: creds.siteID, token: creds.token });
  }
}

/**
 * Open a named store or return null if Blobs cannot be initialized (never throws).
 * @param {string} name
 * @returns {{ store: import('@netlify/blobs').Store | null, error: Error | null }}
 */
function openNamedBlobStoreOrNull(name) {
  try {
    return { store: getNamedBlobStore(name), error: null };
  } catch (err) {
    return { store: null, error: err };
  }
}

module.exports = { getNamedBlobStore, isMissingBlobsEnvError, openNamedBlobStoreOrNull };
