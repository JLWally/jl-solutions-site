/**
 * Stripe secrets from process.env. Dynamic property names avoid esbuild inlining.
 *
 * Loads one project `.env`: prefer the directory that has both `netlify.toml` and
 * `.env`, so another `.env` higher in the tree cannot overwrite your key.
 */
const fs = require("fs");
const path = require("path");

const STRIPE_SECRET_ENV_NAMES = [
  "STRIPE_SECRET_KEY",
  "STRIPE_TEST_SECRET_KEY",
  "STRIPE_SECRET_KEY_TEST",
  "STRIPE_LIVE_SECRET_KEY",
  "STRIPE_SECRET_KEY_LIVE",
  "STRIPE_API_KEY",
  "STRIPE_PRIVATE_KEY"
];

const STRIPE_WEBHOOK_ENV_NAMES = [
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_WEBHOOK_SIGNING_SECRET",
  "STRIPE_WEBHOOK_SECRET_TEST",
  "STRIPE_TEST_WEBHOOK_SECRET",
  "STRIPE_LIVE_WEBHOOK_SECRET"
];

let dotenvLoaded = false;

/** Netlify Functions run on AWS Lambda — use platform env only; never load .env from disk or override injected secrets. */
function isLambdaRuntime() {
  return Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function orderedCandidateRoots() {
  const list = [];
  const seen = new Set();
  function add(p) {
    const r = path.resolve(p);
    if (seen.has(r)) return;
    seen.add(r);
    list.push(r);
  }
  try {
    add(path.join(__dirname, "../../../"));
  } catch (_) {
    /* ignore */
  }
  let dir = typeof process.cwd === "function" ? process.cwd() : ".";
  for (let depth = 0; depth < 14; depth++) {
    add(dir);
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return list;
}

function findProjectRootForEnv() {
  const roots = orderedCandidateRoots();
  for (let i = 0; i < roots.length; i++) {
    const root = roots[i];
    if (
      fs.existsSync(path.join(root, "netlify.toml")) &&
      fs.existsSync(path.join(root, ".env"))
    ) {
      return root;
    }
  }
  for (let i = 0; i < roots.length; i++) {
    const root = roots[i];
    if (fs.existsSync(path.join(root, ".env"))) return root;
  }
  return null;
}

function tryLoadDotenvFromProjectRoot() {
  if (dotenvLoaded) return;
  dotenvLoaded = true;
  if (isLambdaRuntime()) return;
  try {
    // eslint-disable-next-line global-require
    const dotenv = require("dotenv");
    const root = findProjectRootForEnv();
    if (!root) return;
    const envPath = path.join(root, ".env");
    const localPath = path.join(root, ".env.local");
    // Do not use override: true — it can wipe Netlify-injected secrets if a .env exists in the bundle.
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
    if (fs.existsSync(localPath)) {
      dotenv.config({ path: localPath, override: false });
    }
  } catch {
    /* dotenv missing or unreadable */
  }
}

tryLoadDotenvFromProjectRoot();

function trim(v) {
  if (v == null) return "";
  const s = String(v).trim();
  return s.replace(/^['"]|['"]$/g, "");
}

/** Stripe secret keys must be one token — strip accidental spaces / newlines */
function normalizeStripeSecret(v) {
  return trim(v).replace(/\s+/g, "");
}

function pickEnv(names, normalize) {
  const norm = normalize || (x => x);
  for (let i = 0; i < names.length; i++) {
    const n = names[i];
    // Bracket access so esbuild does not inline build-time (often empty) values into the bundle.
    const v = norm(process.env[n]);
    if (v) return v;
  }
  return "";
}

/**
 * Fallback when dotenv or shell env is wrong: read STRIPE_SECRET_KEY= from .env on disk.
 */
function readStripeSecretFromEnvFile() {
  const root = findProjectRootForEnv();
  if (!root) return "";
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return "";
  let text = fs.readFileSync(envPath, "utf8");
  text = text.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(
      /^\s*(?:export\s+)?STRIPE_SECRET_KEY\s*=\s*(.*)$/i
    );
    if (!m) continue;
    let v = m[1].trim();
    const hash = v.indexOf(" #");
    if (hash !== -1) v = v.slice(0, hash).trim();
    return normalizeStripeSecret(v);
  }
  return "";
}

function getStripeSecretKey() {
  tryLoadDotenvFromProjectRoot();
  let k = pickEnv(STRIPE_SECRET_ENV_NAMES, normalizeStripeSecret);
  if (!k && !isLambdaRuntime()) k = readStripeSecretFromEnvFile();
  return k;
}

/**
 * Fallback: STRIPE_WEBHOOK_SECRET= from project .env (local / stripe listen).
 */
function readStripeWebhookSecretFromEnvFile() {
  const root = findProjectRootForEnv();
  if (!root) return "";
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return "";
  let text = fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(
      /^\s*(?:export\s+)?STRIPE_WEBHOOK_SECRET\s*=\s*(.*)$/i
    );
    if (!m) continue;
    let v = m[1].trim();
    const hash = v.indexOf(" #");
    if (hash !== -1) v = v.slice(0, hash).trim();
    return normalizeStripeSecret(v);
  }
  return "";
}

function getStripeWebhookSecret() {
  tryLoadDotenvFromProjectRoot();
  let w = pickEnv(STRIPE_WEBHOOK_ENV_NAMES, normalizeStripeSecret);
  if (!w && !isLambdaRuntime()) w = readStripeWebhookSecretFromEnvFile();
  return w;
}

module.exports = {
  getStripeSecretKey,
  getStripeWebhookSecret,
  trim,
  STRIPE_SECRET_ENV_NAMES
};
