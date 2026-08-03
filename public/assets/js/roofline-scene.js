/* ============================================================
   LODGEDWELL ROOFLINE — one-tile chevron tracker animation
   (GetLayers Scene Lab; motion follows the GetLayers house idiom:
   interpolate linearly, damp once — the lag is the weight.)

   Light build. The tile IS the dashboard, and the four stages are
   FIXED — a ladder of four chevron rungs, labels pinned beside
   them. Pending rungs are quiet ghost outlines; the active rung
   breathes; and when a stage is ACHIEVED its chevron assembles out
   of geometric shards that fly in — ends first, apex last — each
   landing on its own damped clock. Built chevrons stand solid.
   When all four are done the tile reads Settled, the shards
   release upward, and a new matter begins.

   Single opaque canvas (#roofline-canvas). All tweakables live in
   CONFIG; colours are '#rrggbb' strings and recolouring happens
   through CONFIG only (see PALETTE_ROLES) — never in draw code.
============================================================ */
(function () {
  'use strict'

  const canvas = document.getElementById('roofline-canvas')
  if (!canvas) return

  const CONFIG = {
    /* palette — tint-map roles: background/primary/secondary/accent */
    colBackground:    '#DCEEE4',   // tile ground, low                (background)
    colBackgroundTop: '#F4FAF7',   // tile ground, high — airy light
    colChevronBottom: '#5DCAA5',   // mint — first stage              (secondary)
    colChevronMid:    '#2E8A6C',   // eucalypt — later stages         (primary)
    colChevronTop:    '#0F6E56',   // deep brand green — settlement
    colGlow:          '#5DCAA5',   // accents: ignition, ripple       (accent)
    colInk:           '#16241F',   // stage labels

    /* the fixed ladder (fractions of the panel's min dimension) */
    chevronWidth:     0.30,   // full span per chevron
    chevronWidthWide: 0.44,   // span when the panel is a wide band
    chevronPitch:     0.46,   // roof slope: vertical drop / half-span
    strokeWidth:      0.05,   // bar thickness
    stackGap:         0.155,  // vertical distance between the four slots
    stackOffsetX:    -0.14,   // ladder left of centre — labels sit to its right
    stackOffsetY:     0.06,   // ladder centre offset below panel centre
    wideAspect:       1.35,   // W/H beyond which the band layout applies

    /* the four fixed stages, bottom -> top */
    stages: ['Details submitted', 'Contract review', 'Preparing for settlement', 'Settlement & keys'],
    labelDoneAlpha:    0.9,   // label opacity once its stage is built
    labelActiveAlpha:  0.75,  // label opacity while its stage is next up
    labelPendingAlpha: 0.35,  // label opacity for stages beyond that

    /* the shards each chevron is assembled from — random widths each time */
    pieceCountMin:  6,        // how many shards a chevron breaks into
    pieceCountMax:  9,
    pieceMinWidth:  0.055,    // smallest shard, as a fraction of the bar's length
    pieceDampMin:  4,         // per-second damp of a shard flying home
    pieceDampMax:  7,
    pieceStagger:  0.10,      // seconds between shard launches (ends -> apex)
    pieceFlyMinX:  -0.30,     // scatter box a shard starts from, unit fractions
    pieceFlyMaxX:   0.30,
    pieceFlyMinY:   0.18,     //   (positive y = from below — the shards rise)
    pieceFlyMaxY:   0.55,
    pieceRotMax:    1.6,      // max starting spin, radians
    facetShade:     0.09,     // shade variation between airborne shards
    facetFade:      0.08,     // px distance (x unit) over which the facets merge
    landEps:        1.2,      // px — a shard this close (and unspun) has landed
    releaseSeconds: 1.0,      // how long the shards take to fly out on reset

    /* pacing: one stage is achieved per cycle */
    stepSeconds:    6.0,

    /* the rungs */
    ghostAlpha:     0.10,     // pending rung outline
    activeAlpha:    0.16,     // active rung base opacity...
    activePulse:    0.08,     // ...plus this much breathing
    pulseSeconds:   2.8,      // one breath of the active rung
    strokeDamp:     2.5,      // per-second damp of rung alpha changes

    /* the achievement moment */
    igniteGlowAmount: 0.16,   // soft wash while the shards fly in
    igniteGlowSeconds: 1.4,
    igniteGlowRadius: 0.26,
    settleRippleSeconds: 1.2, // expanding echo once the last shard lands
    settleRippleScale:   1.35,
    settleRippleAlpha:   0.35,

    /* atmosphere */
    groundGlow:     0.10,     // soft mint light low in the tile
    vignette:       0.05,     // gentle edge shading (kept very light)

    /* pointer parallax */
    parallaxAmount: 0.012,
    parallaxEase:   0.05,

    pixelRatioMax: 2,
  }

  /* Tint-map contract: palette roles -> CONFIG keys. */
  const PALETTE_ROLES = {
    background: 'colBackground',
    primary:    'colChevronMid',
    secondary:  'colChevronBottom',
    accent:     'colGlow',
  }
  const COLOR_PARAMS = ['colBackground', 'colBackgroundTop', 'colChevronBottom', 'colChevronMid', 'colChevronTop', 'colGlow', 'colInk']

  /* ---------- helpers ---------- */
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  }
  const rgba = (c, a) => 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + Math.max(0, Math.min(1, a)) + ')'
  const mixRgb = (a, b, t) => ({
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  })
  const TAU = Math.PI * 2
  const clamp01 = v => Math.max(0, Math.min(1, v))
  const smoothstep = (e0, e1, x) => { const u = clamp01((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u) }
  /* the house damping: frame-rate independent, clamp dt so a tab-restore can't teleport */
  const dampK = (damp, dt) => 1 - Math.exp(-damp * Math.min(dt, 0.1))
  const rand = (a, b) => a + Math.random() * (b - a)

  /* ---------- derived colour state ---------- */
  const COL = {}
  function applyConfig() {
    COL.bg    = hexToRgb(CONFIG.colBackground)
    COL.bgTop = hexToRgb(CONFIG.colBackgroundTop)
    COL.glow  = hexToRgb(CONFIG.colGlow)
    COL.ink   = hexToRgb(CONFIG.colInk)
    const bottom = hexToRgb(CONFIG.colChevronBottom)
    const mid = hexToRgb(CONFIG.colChevronMid)
    const top = hexToRgb(CONFIG.colChevronTop)
    /* fixed rung colours, bottom -> top: mint deepening to brand green */
    COL.slots = [bottom, mixRgb(bottom, mid, 0.55), mid, top]
  }
  applyConfig()

  /* ---------- canvas / sizing ---------- */
  const ctx = canvas.getContext('2d')
  let W = 2, H = 2, unit = 1, dpr = 1

  function resize() {
    const w = Math.max(2, canvas.clientWidth || window.innerWidth)
    const h = Math.max(2, canvas.clientHeight || window.innerHeight)
    dpr = Math.min(window.devicePixelRatio || 1, CONFIG.pixelRatioMax)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    W = w; H = h
    unit = Math.min(w, h)
    if (!running) renderFrame(sceneTime, 0)
  }
  window.addEventListener('resize', resize)
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(canvas)

  /* Wide band widens the chevrons; the label column keeps the ladder left. */
  function layout() {
    const wide = W / H > CONFIG.wideAspect
    return {
      ox: CONFIG.stackOffsetX,
      oy: wide ? 0 : CONFIG.stackOffsetY,
      chevronWidth: wide ? CONFIG.chevronWidthWide : CONFIG.chevronWidth,
    }
  }

  /* ---------- pointer parallax ---------- */
  const pointer = { x: 0, y: 0 }
  const pointerTarget = { x: 0, y: 0 }
  window.addEventListener('pointermove', e => {
    pointerTarget.x = e.clientX / Math.max(1, window.innerWidth) - 0.5
    pointerTarget.y = e.clientY / Math.max(1, window.innerHeight) - 0.5
  }, { passive: true })
  window.addEventListener('pointerleave', () => { pointerTarget.x = 0; pointerTarget.y = 0 }, { passive: true })

  /* ---------- geometry ---------- */
  /* Fixed slot i (0 = bottom stage, 3 = the peak) -> unit-space y offset. */
  function slotOffsetY(oy, i) {
    return oy + (1.5 - i) * CONFIG.stackGap
  }
  /* Point on the chevron polyline: u 0 = left eave end, 0.5 = apex, 1 = right eave end.
     Offsets are relative to the apex. */
  function pathPoint(halfW, pitch, u) {
    if (u < 0.5) {
      const v = u / 0.5
      return { x: -halfW * (1 - v), y: halfW * pitch * (1 - v) }
    }
    const v = (u - 0.5) / 0.5
    return { x: halfW * v, y: halfW * pitch * v }
  }
  function traceChevron(cx, cy, halfW, pitch) {
    ctx.beginPath()
    ctx.moveTo(cx - halfW, cy + halfW * pitch)
    ctx.lineTo(cx, cy)
    ctx.lineTo(cx + halfW, cy + halfW * pitch)
  }

  /* The shard layout: a fresh set of random-width cuts every assembly.
     Shards abut exactly (no gaps) — round caps make them overlap into a
     continuous bar, and give the finished chevron its rounded ends. */
  function pieceRanges() {
    const n = Math.round(rand(CONFIG.pieceCountMin, CONFIG.pieceCountMax))
    const minW = CONFIG.pieceMinWidth
    /* jittered even boundaries, kept at least minW apart */
    const b = [0]
    for (let i = 1; i < n; i++) {
      const even = i / n
      b.push(even + rand(-0.4, 0.4) / n)
    }
    b.push(1)
    b.sort((x, y) => x - y)
    for (let i = 1; i < b.length; i++) {
      if (b[i] - b[i - 1] < minW) b[i] = Math.min(1, b[i - 1] + minW)
    }
    const out = []
    for (let i = 0; i < n; i++) {
      if (b[i + 1] - b[i] < 0.02) continue
      out.push({ u0: b[i], u1: b[i + 1], bent: b[i] < 0.5 && b[i + 1] > 0.5 })
    }
    return out
  }

  /* ---------- the matter: four fixed stages ---------- */
  /* stage.state: 'pending' | 'active' | 'assembling' | 'built' | 'releasing' */
  let stages = []
  let currentStage = 1
  let completedCount = 1
  let nextStepAt = CONFIG.stepSeconds
  let releasingT0 = null

  /* tile chrome driven by the matter */
  const badgeEl = document.getElementById('roofline-badge')
  const barEl = document.getElementById('roofline-progress-bar')
  function syncChrome() {
    const pct = completedCount * 25
    if (barEl) barEl.style.width = pct + '%'
    if (badgeEl) {
      const done = pct >= 100
      badgeEl.textContent = done ? 'Settled' : 'On track'
      badgeEl.classList.toggle('is-settled', done)
    }
  }

  /* a shard: its stretch of the bar plus an offset pose that damps to zero */
  function makePiece(range, order, landed) {
    const p = {
      u0: range.u0, u1: range.u1, bent: range.bent,
      damp: rand(CONFIG.pieceDampMin, CONFIG.pieceDampMax),
      delay: order * CONFIG.pieceStagger + rand(0, 0.05),
      shade: rand(-1, 1) * CONFIG.facetShade,   // airborne facet tint, fades on landing
      dx: 0, dy: 0, rot: 0, alpha: 1,
    }
    if (!landed) scatterPiece(p)
    return p
  }
  function scatterPiece(p) {
    p.dx = rand(CONFIG.pieceFlyMinX, CONFIG.pieceFlyMaxX) * unit
    p.dy = rand(CONFIG.pieceFlyMinY, CONFIG.pieceFlyMaxY) * unit
    p.rot = rand(-1, 1) * CONFIG.pieceRotMax
    p.alpha = 0
  }

  function buildPieces(stage, landed) {
    stage.pieces = []
    const ranges = pieceRanges()
    /* launch order: ends first, apex last */
    const order = ranges.map((r, i) => ({ i, d: Math.abs((r.u0 + r.u1) / 2 - 0.5) }))
      .sort((a, b) => b.d - a.d)
    const rank = []
    order.forEach((o, idx) => { rank[o.i] = idx })
    for (let i = 0; i < ranges.length; i++) {
      stage.pieces.push(makePiece(ranges[i], rank[i], landed))
    }
  }

  function seed() {
    stages = CONFIG.stages.map(name => ({
      name, state: 'pending', pieces: [], strokeA: CONFIG.ghostAlpha,
      assembleT0: null, rippleT0: null, igniteT0: null,
    }))
    /* the tile loads mid-matter: stage one built, stage two up next */
    stages[0].state = 'built'
    buildPieces(stages[0], true)
    stages[1].state = 'active'
    currentStage = 1
    completedCount = 1
    nextStepAt = CONFIG.stepSeconds
    releasingT0 = null
    syncChrome()
  }

  /* one tick of the matter */
  function stepMatter(t) {
    if (releasingT0 !== null) return              // mid-reset; let it finish
    if (currentStage >= 4) {
      /* settled — the shards release and a new matter begins */
      releasingT0 = t
      for (const st of stages) {
        if (st.state === 'built') {
          st.state = 'releasing'
          for (const p of st.pieces) {
            p.relDx = rand(CONFIG.pieceFlyMinX, CONFIG.pieceFlyMaxX) * unit
            p.relDy = -rand(CONFIG.pieceFlyMinY, CONFIG.pieceFlyMaxY) * unit  // up and away
            p.relRot = rand(-1, 1) * CONFIG.pieceRotMax * 0.6
          }
        }
      }
      return
    }
    /* the active stage is achieved: its chevron assembles */
    const st = stages[currentStage]
    st.state = 'assembling'
    st.assembleT0 = t
    st.igniteT0 = t
    buildPieces(st, false)
    currentStage += 1
    if (currentStage < 4) stages[currentStage].state = 'active'
  }

  function finishRelease() {
    for (const st of stages) {
      st.state = 'pending'
      st.pieces = []
      st.rippleT0 = null
      st.igniteT0 = null
    }
    stages[0].state = 'active'
    currentStage = 0
    completedCount = 0
    releasingT0 = null
    syncChrome()
  }

  /* ---------- drawing ---------- */
  /* draw one shard: its stretch of the bar, offset by its pose */
  function drawPiece(p, col, alpha, cx, apexY, halfW, barW) {
    if (alpha <= 0.01) return
    const pts = []
    pts.push(pathPoint(halfW, CONFIG.chevronPitch, p.u0))
    if (p.bent) pts.push(pathPoint(halfW, CONFIG.chevronPitch, 0.5))
    pts.push(pathPoint(halfW, CONFIG.chevronPitch, p.u1))
    /* pivot: the shard's midpoint */
    const mid = pathPoint(halfW, CONFIG.chevronPitch, (p.u0 + p.u1) / 2)
    ctx.save()
    ctx.translate(cx + mid.x + p.dx, apexY + mid.y + p.dy)
    ctx.rotate(p.rot)
    ctx.strokeStyle = rgba(col, alpha)
    ctx.lineWidth = barW
    ctx.lineCap = 'round'      // rounded shards overlap into a seamless bar
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(pts[0].x - mid.x, pts[0].y - mid.y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x - mid.x, pts[i].y - mid.y)
    ctx.stroke()
    ctx.restore()
  }

  /* ---------- the frame ---------- */
  function renderFrame(t, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalCompositeOperation = 'source-over'

    const L = layout()
    const cy = H / 2
    const px = pointer.x * CONFIG.parallaxAmount * unit
    const py = pointer.y * CONFIG.parallaxAmount * unit
    const cx = W / 2 + L.ox * unit - px

    /* ----- ground: an airy vertical wash ----- */
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
    bgGrad.addColorStop(0, rgba(COL.bgTop, 1))
    bgGrad.addColorStop(1, rgba(COL.bg, 1))
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)
    const gg = ctx.createRadialGradient(cx, H * 0.85, 0, cx, H * 0.85, Math.max(1, unit * 0.9))
    gg.addColorStop(0, rgba(COL.glow, CONFIG.groundGlow))
    gg.addColorStop(0.6, rgba(COL.glow, CONFIG.groundGlow * 0.35))
    gg.addColorStop(1, rgba(COL.glow, 0))
    ctx.fillStyle = gg
    ctx.fillRect(0, 0, W, H)

    if (stages.length !== 4) return   // not seeded yet (first resize paints ground only)

    /* ----- the matter's clock ----- */
    if (dt > 0 && t >= nextStepAt) {
      nextStepAt += CONFIG.stepSeconds
      stepMatter(t)
    }
    if (releasingT0 !== null && t - releasingT0 > CONFIG.releaseSeconds) finishRelease()

    const halfW = (L.chevronWidth / 2) * unit
    const barW = CONFIG.strokeWidth * unit
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'

    /* ----- the fixed rungs: ghost outlines (damped presence) ----- */
    for (let i = 0; i < 4; i++) {
      const st = stages[i]
      let target = CONFIG.ghostAlpha
      if (st.state === 'active') {
        target = CONFIG.activeAlpha + CONFIG.activePulse * (0.5 + 0.5 * Math.sin(TAU * t / CONFIG.pulseSeconds))
      } else if (st.state === 'built' || st.state === 'assembling') {
        target = 0                                 // the shards carry the shape now
      }
      if (dt > 0) st.strokeA += (target - st.strokeA) * dampK(CONFIG.strokeDamp, dt)
      else st.strokeA = target
      if (st.strokeA <= 0.005) continue
      const apexY = cy + slotOffsetY(L.oy, i) * unit - py
      ctx.strokeStyle = rgba(COL.slots[i], st.strokeA)
      ctx.lineWidth = barW
      traceChevron(cx, apexY, halfW, CONFIG.chevronPitch)
      ctx.stroke()
    }

    /* ----- ignition wash while shards fly in ----- */
    for (let i = 0; i < 4; i++) {
      const st = stages[i]
      if (st.igniteT0 === null) continue
      const gT = (t - st.igniteT0) / CONFIG.igniteGlowSeconds
      if (gT >= 1) { st.igniteT0 = null; continue }
      const ga = CONFIG.igniteGlowAmount * Math.sin(Math.PI * gT)
      const gy = cy + slotOffsetY(L.oy, i) * unit - py
      const gr = CONFIG.igniteGlowRadius * unit
      const grd = ctx.createRadialGradient(cx, gy, 0, cx, gy, Math.max(1, gr))
      grd.addColorStop(0, rgba(COL.glow, ga))
      grd.addColorStop(0.6, rgba(COL.glow, ga * 0.3))
      grd.addColorStop(1, rgba(COL.glow, 0))
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, W, H)
    }

    /* ----- the shards ----- */
    for (let i = 0; i < 4; i++) {
      const st = stages[i]
      if (!st.pieces.length) continue
      const col = COL.slots[i]
      const apexY = cy + slotOffsetY(L.oy, i) * unit - py

      if (st.state === 'assembling') {
        const since = t - st.assembleT0
        let allLanded = true
        for (const p of st.pieces) {
          if (since < p.delay) { allLanded = false; continue }   // not launched yet
          if (dt > 0) {
            const k = dampK(p.damp, dt)
            p.dx += (0 - p.dx) * k
            p.dy += (0 - p.dy) * k
            p.rot += (0 - p.rot) * k
            p.alpha = Math.min(1, p.alpha + dt / 0.18)           // quick fade-in at launch
          } else { p.dx = 0; p.dy = 0; p.rot = 0; p.alpha = 1 }
          if (Math.abs(p.dx) > CONFIG.landEps || Math.abs(p.dy) > CONFIG.landEps || Math.abs(p.rot) > 0.02) allLanded = false
          /* facet tint while airborne, merging into the slot colour on approach */
          const dist = Math.hypot(p.dx, p.dy) + Math.abs(p.rot) * halfW
          const facet = clamp01(dist / Math.max(1, CONFIG.facetFade * unit)) * Math.abs(p.shade)
          const shard = p.shade >= 0
            ? mixRgb(col, { r: 255, g: 255, b: 255 }, facet)
            : mixRgb(col, COL.ink, facet)
          drawPiece(p, shard, p.alpha, cx, apexY, halfW, barW)
        }
        if (allLanded && dt > 0) {
          st.state = 'built'
          for (const p of st.pieces) { p.dx = 0; p.dy = 0; p.rot = 0; p.alpha = 1 }
          st.rippleT0 = t
          completedCount += 1
          syncChrome()
        }
      } else if (st.state === 'built') {
        /* one continuous rounded stroke — complete, seamless */
        ctx.strokeStyle = rgba(col, 1)
        ctx.lineWidth = barW
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        traceChevron(cx, apexY, halfW, CONFIG.chevronPitch)
        ctx.stroke()
      } else if (st.state === 'releasing') {
        const relT = clamp01((t - releasingT0) / CONFIG.releaseSeconds)
        for (const p of st.pieces) {
          if (dt > 0) {
            const k = dampK(3.2, dt)
            p.dx += (p.relDx - p.dx) * k
            p.dy += (p.relDy - p.dy) * k
            p.rot += (p.relRot - p.rot) * k
          }
          drawPiece(p, col, (1 - relT) * (1 - relT), cx, apexY, halfW, barW)
        }
      }
    }

    /* ----- the achievement echo ----- */
    for (let i = 0; i < 4; i++) {
      const st = stages[i]
      if (st.rippleT0 === null) continue
      const ripT = (t - st.rippleT0) / CONFIG.settleRippleSeconds
      if (ripT >= 1) { st.rippleT0 = null; continue }
      const apexY = cy + slotOffsetY(L.oy, i) * unit - py
      const grow = 1 + (CONFIG.settleRippleScale - 1) * smoothstep(0, 1, ripT)
      const ra = CONFIG.settleRippleAlpha * (1 - ripT) * (1 - ripT)
      ctx.strokeStyle = rgba(COL.slots[i], ra)
      ctx.lineWidth = barW * 0.3 * (1 - 0.5 * ripT)
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'
      traceChevron(cx, apexY, halfW * grow, CONFIG.chevronPitch)
      ctx.stroke()
    }

    /* ----- the fixed stage labels ----- */
    const fontPx = Math.round(Math.max(11, Math.min(15, unit * 0.032)))
    ctx.font = '600 ' + fontPx + 'px "Public Sans", system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const labelX = cx + halfW + CONFIG.strokeWidth * unit * 1.2
    for (let i = 0; i < 4; i++) {
      const st = stages[i]
      const apexY = cy + slotOffsetY(L.oy, i) * unit - py
      const ly = apexY + halfW * CONFIG.chevronPitch * 0.55
      const done = st.state === 'built' || st.state === 'assembling' || st.state === 'releasing'
      let a = done ? CONFIG.labelDoneAlpha
        : st.state === 'active' ? CONFIG.labelActiveAlpha
        : CONFIG.labelPendingAlpha
      if (st.rippleT0 !== null) {
        const ripT = clamp01((t - st.rippleT0) / CONFIG.settleRippleSeconds)
        a = Math.min(1, a + 0.2 * (1 - ripT))
      }
      const text = (st.state === 'built' || st.state === 'releasing' ? '✓  ' : '') + st.name
      const maxW = W - labelX - Math.max(14, W * 0.03)
      ctx.fillStyle = rgba(COL.ink, a)
      if (ctx.measureText(text).width <= maxW) {
        ctx.fillText(text, labelX, ly)
      } else {                                     // wrap once, near the middle space
        const words = text.split(' ')
        let line1 = words[0]
        let j = 1
        while (j < words.length && ctx.measureText(line1 + ' ' + words[j]).width <= maxW && line1.length < text.length / 2) {
          line1 += ' ' + words[j]; j++
        }
        const line2 = words.slice(j).join(' ')
        ctx.fillText(line1, labelX, ly - fontPx * 0.62)
        ctx.fillText(line2, labelX, ly + fontPx * 0.62)
      }
    }

    /* ----- gentle edge shading ----- */
    if (CONFIG.vignette > 0.001) {
      const vr = Math.hypot(W, H) * 0.62
      const vg = ctx.createRadialGradient(W / 2, cy, vr * 0.45, W / 2, cy, vr)
      vg.addColorStop(0, 'rgba(22,36,31,0)')
      vg.addColorStop(1, 'rgba(22,36,31,' + CONFIG.vignette + ')')
      ctx.fillStyle = vg
      ctx.fillRect(0, 0, W, H)
    }
  }

  /* ---------- loop ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let sceneTime = 0
  let lastNow = 0
  let rafId = 0
  let running = false
  let pageVisible = !document.hidden
  let onScreen = true

  function tick(now) {
    if (!running) return
    rafId = requestAnimationFrame(tick)
    const dt = Math.min(0.1, Math.max(0, (now - lastNow) / 1000))
    lastNow = now
    sceneTime += dt

    const k = 1 - Math.pow(1 - CONFIG.parallaxEase, dt * 60)
    pointer.x += (pointerTarget.x - pointer.x) * k
    pointer.y += (pointerTarget.y - pointer.y) * k

    renderFrame(sceneTime, dt)
  }

  function updateRunning() {
    const shouldRun = pageVisible && onScreen && !reduceMotion.matches
    if (shouldRun && !running) {
      running = true
      lastNow = performance.now()
      rafId = requestAnimationFrame(tick)
    } else if (!shouldRun && running) {
      running = false
      cancelAnimationFrame(rafId)
      if (reduceMotion.matches) renderStill()
    }
  }

  /* Reduced motion: one considered frame — mid-matter, ladder at rest. */
  function renderStill() {
    pointer.x = 0; pointer.y = 0
    seed()
    sceneTime = CONFIG.stepSeconds * 0.45
    renderFrame(sceneTime, 0)
  }

  document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden; updateRunning() })
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver(entries => {
      for (const e of entries) onScreen = e.isIntersecting
      updateRunning()
    }, { threshold: 0 }).observe(canvas)
  }
  const onMotionPrefChange = () => { updateRunning(); if (reduceMotion.matches) renderStill() }
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionPrefChange)
  else if (reduceMotion.addListener) reduceMotion.addListener(onMotionPrefChange)

  /* ---------- go ---------- */
  resize()
  seed()
  if (reduceMotion.matches) renderStill()
  else updateRunning()
  /* re-render the static frame once webfonts arrive (labels use Public Sans) */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { if (!running) renderFrame(sceneTime, 0) })
  }
})()
