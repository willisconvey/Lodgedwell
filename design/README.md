# design/ — Lodgedwell design-system source

Single source: `sections/*.html` snippets (each starts with an `@section` header
naming group, name, subtitle and viewport) + the live site stylesheet and logos.

```bash
node design/build.mjs
```

writes `design/build/` (Claude Design canvas artboards + `canvas.json`, gitignored)
and `design-system/` (the sync bundle for claude.ai/design, committed).

## Updating the published Claude Design canvas

1. Edit `sections/*.html` (or `public/assets/css/styles.css`), then run the build.
2. In Claude Code, invoke the `design` skill; it explains the seed command. In short:
   `node <skill dir>/seed-canvas.mjs --template <skill dir>/payload.template.html
   --out design/dist/lodgedwell-design-system.html --title "Lodgedwell Design System"
   --artboard design/build/Main.dc.html … (all six) --image public/assets/img/lodgedwell-horizontal.svg
   --image public/assets/img/lodgedwell-reversed.svg --image public/assets/img/lodgedwell-icon.svg
   --canvas design/build/canvas.json`, then `--check` it.
3. Republish with the Artifact tool to the URL recorded in `docs/STATUS.md`.

## Pushing to claude.ai/design

Run `/design-login` once in an interactive `claude` terminal, then use the
DesignSync tool with `design-system/` as the local directory (list the remote
project files first, then finalize a plan covering `**/*`).
