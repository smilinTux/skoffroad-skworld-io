# Security Policy — skoffroad-skworld-io

## Scope

This repository is a **static, public marketing site** (HTML/CSS/JS) served via
GitHub Pages at [skoffroad.skworld.io](https://skoffroad.skworld.io). It has:

- **No server-side code** — nothing runs on a server we control.
- **No secrets, credentials, keys, or crypto material** — nothing here is
  confidential. All source and all served content is public by design (GPL-3.0).
- **No user data / no backend** — the only client-side state is two
  `localStorage` sound preferences (`skoffroad-sound`, `skoffroad-ambient`) and a
  service-worker cache (`skoffroad-v2`) that holds only the public, same-origin
  app-shell.

Because there is no secret-bearing service, the attack surface is limited to the
client-side page itself (e.g. content integrity, injected markup, or a malicious
third-party request).

## Client-side hardening notes

- **Content Security Policy.** If/when a CSP is added, it should allow only
  `self` for scripts/styles and the single outbound endpoint the page uses
  (`https://api.github.com` for the best-effort latest-release fetch). No inline
  event handlers; the JS is a single first-party `script.js` (plus the
  first-party `sw.js`).
- **Service worker.** The site ships a same-origin service worker (`sw.js`),
  registered from `script.js` and scoped to the site origin (`scope ./`). It is
  cache-first for static assets and **network-first for HTML/navigations** so
  content stays fresh, and it caches **only** the first-party app-shell under
  `CACHE = 'skoffroad-v2'`. It explicitly **does not cache cross-origin
  requests** — Google Fonts, the GitHub releases API, and the `play.` subdomain
  always go straight to the network — so no third-party or API response is stored
  or staleness-locked. Bumping `CACHE` invalidates the old shell on the next
  visit; the `activate` handler prunes stale caches. The SW only registers on a
  secure origin (HTTPS / localhost).
- **Third-party requests.** The only outbound call is a read-only
  `GET api.github.com/.../releases/latest`; it fails silently and never sends
  credentials.

## Reporting a vulnerability

If you find a security issue (e.g. injected content, a supply-chain concern, or a
domain/DNS problem):

1. **Preferred:** open a private security advisory on the GitHub repo
   (Security → Report a vulnerability), or
2. Open a normal issue for non-sensitive reports at
   <https://github.com/smilinTux/skoffroad-skworld-io/issues>.

Please do not include exploit details in a public issue if the finding is
sensitive — use the private advisory path instead.

There is no bug bounty. Given the site holds no secrets, most findings will be
content/DNS/hosting matters rather than data-exposure vulnerabilities.
