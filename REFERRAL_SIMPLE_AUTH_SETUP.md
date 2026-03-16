# Simple Internal Auth for Referral Dashboard

Use this **instead of Supabase** when you want a lightweight setup: predefined usernames and passwords, with referral tracking stored in Netlify Blobs. No database signup, no external services beyond Netlify.

---

## 1. Add Netlify environment variables

Go to **Netlify** → your site → **Site configuration** → **Environment variables**. Add:

| Variable | Value | Description |
|----------|-------|-------------|
| `REFERRAL_USE_SIMPLE_AUTH` | `true` | Enables simple auth (bypasses Supabase) |
| `REFERRAL_AGENTS` | `username:password:CODE` | One agent per comma. Example below. |
| `REFERRAL_SECRET` | Any random string | Used to sign session cookies (keep secret) |

### REFERRAL_AGENTS format

```
username:password:REFERRAL-CODE
```

Multiple agents, comma-separated:

```
jane:secret123:AGENT-JANE,john:mypass456:AGENT-JOHN,sarah:abc789:AGENT-SARAH
```

Optional: add commission rate (default 10%) as 4th value:

```
jane:secret123:AGENT-JANE:15,john:mypass456:AGENT-JOHN:10
```

---

## 2. Example configuration

```
REFERRAL_USE_SIMPLE_AUTH=true
REFERRAL_AGENTS=jane:SecurePass1:AGENT-JANE,john:SecurePass2:AGENT-JOHN
REFERRAL_SECRET=your-random-secret-string-min-16-chars
```

---

## 3. Deploy

Trigger a new deploy (or push to main). Netlify Blobs is included on all plans.

---

## 4. How it works

- **Login**: Sales agents use their **username** (not email) and **password** at `/referral/login.html`
- **Signup**: Disabled. New agents must be added by you to `REFERRAL_AGENTS`
- **Dashboard**: Same as before. Shows referrals from consultations (with referral code) and Stripe payments
- **Storage**: Referrals stored in Netlify Blobs. No Supabase required.

---

## 5. Adding a new agent

1. Choose a username, password, and referral code (e.g. `AGENT-MARIA`)
2. Add to `REFERRAL_AGENTS`: `...,maria:herpassword:AGENT-MARIA`
3. Redeploy or update env vars and trigger deploy
4. Give the agent: username, password, and their code to share with clients

---

## 6. Security notes

- Use strong passwords for each agent
- `REFERRAL_SECRET` should be long and random (e.g. 32+ characters)
- Session expires after 7 days
