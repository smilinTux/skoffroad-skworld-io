# skoffroad-skworld-io

Source for the official site at **[skoffroad.skworld.io](https://skoffroad.skworld.io)**.

Static single-page site (HTML/CSS/JS, no build step) served via GitHub Pages.

## Features

- **Sound toggle** — synthesized WebAudio UI cues + ambient bed, off by default (respects reduced-motion).
- **PWA / offline** — installable via `manifest.webmanifest`; service worker (`sw.js`) caches the shell for offline use.
- **Sections** — Gallery, FAQ, and Roadmap, with hamburger nav and back-to-top.
- **A11y / perf / SEO** — semantic landmarks + ARIA, inlined critical CSS, resource hints, tuned metadata/sitemap.

See `CHANGELOG.md` for details.

## Local preview

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure + content |
| `styles.css` | All styling (no preprocessor) |
| `script.js`  | Counter animation, parallax, nav, sound, back-to-top |
| `CNAME`      | GitHub Pages custom domain |
| `assets/`    | Favicon + future SVGs |
| `manifest.webmanifest` | PWA manifest |
| `sw.js`      | Service worker (offline cache) |

## DNS (Cloudflare)

A `CNAME` on the `skworld.io` zone:

```
skoffroad   CNAME   smilintux.github.io   (DNS-only / gray cloud)
```

GitHub Pages provisions HTTPS automatically once DNS resolves.

## License

GPL-3.0-or-later. See `LICENSE`.
