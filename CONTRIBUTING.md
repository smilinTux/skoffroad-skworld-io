# Contributing to skoffroad

skoffroad is a static single-page site (HTML/CSS/JS + service worker / PWA).

## Workflow
- Branch from `main`; open work on a feature branch.
- Keep commits focused; end each with a `Co-Authored-By:` trailer where applicable.
- No build step. Validate before opening a PR:
  - `node --check script.js`
  - `node --check sw.js`
  - Confirm `index.html` parses and the page renders (open it locally).
- Respect `prefers-reduced-motion`; sound is opt-in and gesture-gated — do not autoplay.

## Review
- One reviewer approval. CI/green gate = the `node --check` + manual render check above.
- See `SOP.md` for architecture and `SECURITY.md` for the (minimal, static-site) posture.
