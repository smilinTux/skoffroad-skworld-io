# Changelog

All notable changes to the skoffroad site are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] - 2026-07-03

### Added
- **Sound design**: synthesized WebAudio UI cues (hover/click) and an
  ambient bed, with a user-facing on/off toggle (respects reduced-motion
  and starts muted until enabled).
- **PWA / offline**: `manifest.webmanifest` + service worker (`sw.js`)
  for installability and offline caching of the static shell.
- **New sections**: Gallery, FAQ, and Roadmap.
- **Navigation**: hamburger menu for small screens and a back-to-top
  control.
- **Accessibility**: semantic landmarks and ARIA labelling across the page.

### Changed
- **Performance / SEO**: critical CSS inlined, resource hints
  (preconnect/preload), and metadata/sitemap tuning.

## [0.1.0] - initial
### Added
- Static single-page site (HTML/CSS/JS) with counter animation and parallax,
  served via GitHub Pages at skoffroad.skworld.io.
