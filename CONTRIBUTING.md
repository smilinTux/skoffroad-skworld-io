# Contributing to skoffroad

skoffroad is a static single-page site (HTML/CSS/JS + a service worker / PWA).

## Workflow
- Branch from `main`; do work on a feature branch.
- Keep commits focused; end each with a `Co-Authored-By:` trailer where applicable.
- There is no build step. Validate before opening a PR:
  - `node --check script.js`
  - `node --check sw.js`
  - Confirm `index.html` parses and the page renders (open it locally).
- Respect `prefers-reduced-motion`; sound is opt-in and gesture-gated — never autoplay.

## Review
- One reviewer approval. The green gate is the `node --check` + manual render check above.
- See `SOP.md` for architecture and `SECURITY.md` for the (minimal, static-site) posture.
