// Generates the animated profile SVGs in ../assets.
// GitHub shows SVGs as <img>: CSS and SMIL animation work, scripts and web fonts do not.
// Run: node scripts/build-art.js
const fs = require('node:fs')
const path = require('node:path')

const C = {
  space: '#000000',
  deep: '#000000',
  cyan: '#C9A96E', // champagne gold
  violet: '#8C7A57', // bronze
  magenta: '#EDE6D6', // ivory
  lav: '#9A9385', // stone
  white: '#EDE6D6', // ivory
}
const GOLD = C.cyan
const HAIR = 'rgba(201,169,110,.55)'
const SANS = "'Segoe UI Variable Display','Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif"
const MONO = "'Cascadia Code',Consolas,'SFMono-Regular',Menlo,monospace"
const f = n => Math.round(n * 10) / 10
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

// seeded random so the art is stable between builds
let seed = 7
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647

let textW = (s, px, k = 0.56) => s.length * px * k

// shared space background: nebula glow and twinkling stars
const spaceBg = (W, H) => `<rect width="${W}" height="${H}" rx="4" fill="#000"/><rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="4" fill="none" stroke="${HAIR}"/><rect x="8.5" y="8.5" width="${W - 17}" height="${H - 17}" rx="2" fill="none" stroke="rgba(201,169,110,.16)"/>`
const oldSpaceBg = (W, H, stars = 90) => {
  let s = ''
  for (let i = 0; i < stars; i++) {
    const r = rnd() < 0.85 ? 0.8 + rnd() * 0.6 : 1.5 + rnd() * 0.8
    s += `<circle class="star" cx="${f(rnd() * W)}" cy="${f(rnd() * H)}" r="${f(r)}" style="animation-delay:-${f(rnd() * 6)}s;animation-duration:${f(3 + rnd() * 5)}s"/>`
  }
  return `
  <defs>
    <radialGradient id="neb1" cx="72%" cy="45%" r="55%"><stop offset="0" stop-color="${C.violet}" stop-opacity=".35"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></radialGradient>
    <radialGradient id="neb2" cx="20%" cy="85%" r="50%"><stop offset="0" stop-color="${C.cyan}" stop-opacity=".16"/><stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/></radialGradient>
    <linearGradient id="spaceGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B0724"/><stop offset="1" stop-color="${C.space}"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="18" fill="url(#spaceGrad)"/>
  <rect width="${W}" height="${H}" rx="18" fill="url(#neb1)"/>
  <rect width="${W}" height="${H}" rx="18" fill="url(#neb2)"/>
  <g fill="${C.white}">${s}</g>`
}
const starCss = ''
const reduced = sel => `@media (prefers-reduced-motion: reduce){${sel}{animation:none!important}}`

const svgOpen = (W, H, title, desc) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d"><title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc>`

// ---------------------------------------------------------------- hero: rotating 3D neural network
function hero () {
  const W = 1200
  const H = 600
  const DUR = 36 // seconds per full turn
  const FRAMES = 72
  const CX = 868
  const CY = 300
  const S = 118
  const D = 5.2
  const TILT = 0.38

  const layersX = [-1.65, -0.55, 0.55, 1.65]
  const counts = [5, 7, 7, 5]
  const radius = [0.85, 1.25, 1.25, 0.85]
  const layerColor = [GOLD, '#B89B66', C.magenta, GOLD]
  const nodes = []
  counts.forEach((n, l) => {
    for (let j = 0; j < n; j++) {
      const a = (2 * Math.PI * j) / n + l * 0.4
      nodes.push({ l, j, x: layersX[l], y: radius[l] * Math.cos(a), z: radius[l] * Math.sin(a) })
    }
  })
  const idx = (l, j) => nodes.findIndex(n => n.l === l && n.j === j)
  const edges = []
  for (let l = 0; l < 3; l++) {
    const n1 = counts[l]; const n2 = counts[l + 1]
    for (let j = 0; j < n1; j++) {
      const k0 = Math.round((j * n2) / n1)
      for (const dk of [-1, 0, 1]) edges.push({ a: idx(l, j), b: idx(l + 1, (k0 + dk + n2) % n2), l })
    }
  }

  const project = (p, th) => {
    const x1 = p.x * Math.cos(th) + p.z * Math.sin(th)
    const z1 = -p.x * Math.sin(th) + p.z * Math.cos(th)
    const y2 = p.y * Math.cos(TILT) - z1 * Math.sin(TILT)
    const z2 = p.y * Math.sin(TILT) + z1 * Math.cos(TILT)
    const k = D / (D + z2)
    return { X: CX + S * x1 * k, Y: CY + S * y2 * k, k }
  }
  const frames = []
  for (let i = 0; i <= FRAMES; i++) {
    const th = (2 * Math.PI * i) / FRAMES
    frames.push(nodes.map(p => project(p, th)))
  }
  const kMin = 0.72; const kMax = 1.45
  const depth = k => Math.max(0, Math.min(1, (k - kMin) / (kMax - kMin)))
  const anim = (attr, vals) => `<animate attributeName="${attr}" dur="${DUR}s" repeatCount="indefinite" values="${vals.join(';')}"/>`

  // edges live in defs and are drawn twice: a faint line and a travelling pulse
  let defs = ''
  let edgeUses = ''
  let pulseUses = ''
  edges.forEach((e, i) => {
    const x1 = frames.map(fr => f(fr[e.a].X)); const y1 = frames.map(fr => f(fr[e.a].Y))
    const x2 = frames.map(fr => f(fr[e.b].X)); const y2 = frames.map(fr => f(fr[e.b].Y))
    const op = frames.map(fr => (0.12 + 0.55 * depth((fr[e.a].k + fr[e.b].k) / 2)).toFixed(2))
    defs += `<line id="e${i}" pathLength="1" x1="${x1[0]}" y1="${y1[0]}" x2="${x2[0]}" y2="${y2[0]}">${anim('x1', x1)}${anim('y1', y1)}${anim('x2', x2)}${anim('y2', y2)}${anim('stroke-opacity', op)}</line>`
    edgeUses += `<use href="#e${i}" xlink:href="#e${i}" class="edge"/>`
    pulseUses += `<use href="#e${i}" xlink:href="#e${i}" class="pulse p${e.l}" style="animation-delay:${f(e.l * 0.75 + rnd() * 0.25)}s"/>`
  })
  let nodeEls = ''
  nodes.forEach((n, i) => {
    const cx = frames.map(fr => f(fr[i].X)); const cy = frames.map(fr => f(fr[i].Y))
    const r = frames.map(fr => f(3.2 + 6.4 * depth(fr[i].k)))
    const op = frames.map(fr => (0.35 + 0.65 * depth(fr[i].k)).toFixed(2))
    nodeEls += `<circle class="node l${n.l}" fill="${layerColor[n.l]}" cx="${cx[0]}" cy="${cy[0]}" r="${r[0]}">${anim('cx', cx)}${anim('cy', cy)}${anim('r', r)}${anim('opacity', op)}</circle>`
  })
  // node flash when the forward-pass wave reaches its layer
  const PASS = 4.5
  let flashCss = ''
  for (let l = 0; l < 4; l++) {
    const at = ((l * 0.75 + 0.55) / PASS) * 100
    flashCss += `.l${l}{animation:fl${l} ${PASS}s linear infinite}@keyframes fl${l}{0%,${f(Math.max(at - 2, 0))}%,${f(at + 14)}%,100%{fill:${layerColor[l]}}${f(at + 3)}%{fill:#FFF4DC}}`
  }

  const name = 'Kiran D'
  return `${svgOpen(W, H, 'Kiran D, AI/ML engineer', 'A slowly rotating 3D neural network drawn in gold and ivory, with signals passing forward through its layers, beside the name Kiran D.')}
  ${spaceBg(W, H, 110)}
  <defs>
    ${defs}
    <filter id="glow" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
      <feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="soft" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="22"/></filter>
    <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F6F0E2"/><stop offset=".6" stop-color="#EDE6D6"/><stop offset="1" stop-color="#CDBE9C"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#FFE9B8" stop-opacity=".55"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/>
      <animateTransform attributeName="gradientTransform" type="translate" values="-1 0;-1 0;1.2 0;1.2 0" keyTimes="0;.6;.85;1" dur="9s" repeatCount="indefinite"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.cyan}"/><stop offset=".5" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.magenta}" stop-opacity="0"/></linearGradient>
  </defs>
  <style>
    ${starCss}
    .edge{stroke:${C.lav};stroke-width:.9}
    .pulse{stroke:#E8CF94;stroke-width:2;stroke-linecap:round;stroke-dasharray:.07 .93;stroke-dashoffset:.07;opacity:0;animation:fire ${PASS}s linear infinite}
    @keyframes fire{0%{stroke-dashoffset:.07;opacity:1}16%{stroke-dashoffset:-.93;opacity:1}17%,100%{stroke-dashoffset:-.93;opacity:0}}
    ${flashCss}
    .rise{opacity:0;animation:rise 1.1s cubic-bezier(.2,.7,.2,1) forwards}
    @keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
    .name{font:800 124px ${SANS};letter-spacing:-3px}
    .role{font:600 30px ${SANS};fill:${C.white}}
    .line{font:400 21px ${SANS};fill:${C.lav}}
    .where{font:500 17px ${SANS};fill:#67E8F9}
    ${reduced('.star,.pulse,.node,.rise')}
    @media (prefers-reduced-motion: reduce){.rise{opacity:1}}
  </style>

  <circle cx="${CX}" cy="${CY}" r="210" fill="${GOLD}" opacity=".07" filter="url(#soft)"/>
  <g filter="url(#glow)">
    <g>${edgeUses}</g>
    <g>${pulseUses}</g>
    <g>${nodeEls}</g>
  </g>

  <g class="rise" style="animation-delay:.1s">
    <text class="name" x="64" y="250" fill="url(#chrome)">${name}</text>
    <text class="name" x="64" y="250" fill="url(#shine)" opacity=".55">${name}</text>
  </g>
  <rect class="rise" style="animation-delay:.35s" x="70" y="284" width="96" height="1" fill="${GOLD}"/>
  <text class="role rise" style="animation-delay:.45s" x="68" y="334">AI/ML engineer</text>
  <text class="line rise" style="animation-delay:.6s" x="68" y="376">I build multi-agent systems and RAG pipelines</text>
  <text class="line rise" style="animation-delay:.7s" x="68" y="404">that hold up in production.</text>
  <text class="where rise" style="animation-delay:.85s" x="68" y="460">Junior AI Developer at NXL Technologies, Kochi</text>
</svg>
`
}

// ---------------------------------------------------------------- project cards
const chipRow = (chips, x, y, maxW) => {
  let cx = x; let cy = y; let out = ''
  for (const c of chips) {
    const w = textW(c, 13, 0.6) + 22
    if (cx + w > x + maxW) { cx = x; cy += 34 }
    out += `<g><rect x="${f(cx)}" y="${cy}" width="${f(w)}" height="26" rx="2" class="chip"/><text x="${f(cx + w / 2)}" y="${cy + 17.5}" class="chipt">${esc(c)}</text></g>`
    cx += w + 8
  }
  return out
}

const visuals = {
  // eight agents orbiting an orchestrator
  vaic (cx, cy) {
    let spokes = ''; let agents = ''
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const x = cx + Math.cos(a) * 72; const y = cy + Math.sin(a) * 72
      spokes += `<line x1="${cx}" y1="${cy}" x2="${f(x)}" y2="${f(y)}" class="spoke"/>`
      agents += `<circle cx="${f(x)}" cy="${f(y)}" r="9" fill="${i % 2 ? C.magenta : C.cyan}" class="agent" style="animation-delay:${f(i * 0.35)}s"/>`
    }
    return `<circle cx="${cx}" cy="${cy}" r="72" class="orbit"/>
      <circle cx="${cx}" cy="${cy}" r="24" fill="none" stroke="${C.cyan}" stroke-width="2" opacity=".7"><animate attributeName="r" values="24;92" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values=".7;0" dur="3s" repeatCount="indefinite"/></circle>
      <g><animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="20s" repeatCount="indefinite"/>${spokes}${agents}</g>
      <circle cx="${cx}" cy="${cy}" r="24" fill="url(#core)"/>`
  },
  // website turned into callable API
  pipes (cx, cy) {
    const bx = cx - 92; const by = cy - 34
    let packets = ''
    ;[-16, 0, 16].forEach((dy, i) => {
      packets += `<line x1="${cx - 18}" y1="${cy + dy}" x2="${cx + 40}" y2="${cy + dy}" class="pipe"/>`
      packets += `<circle r="4" fill="${i === 1 ? C.magenta : C.cyan}"><animateMotion dur="1.8s" begin="${f(i * 0.5)}s" repeatCount="indefinite" path="M${cx - 18} ${cy + dy}H${cx + 40}"/></circle>`
    })
    return `<rect x="${bx}" y="${by}" width="72" height="68" rx="9" class="win"/>
      <line x1="${bx}" y1="${by + 16}" x2="${bx + 72}" y2="${by + 16}" class="win"/>
      <circle cx="${bx + 10}" cy="${by + 8}" r="2.5" fill="${C.magenta}"/><circle cx="${bx + 18}" cy="${by + 8}" r="2.5" fill="${C.violet}"/><circle cx="${bx + 26}" cy="${by + 8}" r="2.5" fill="${C.cyan}"/>
      <rect x="${bx + 10}" y="${by + 26}" width="40" height="5" rx="2.5" fill="${C.lav}" opacity=".5"/><rect x="${bx + 10}" y="${by + 38}" width="52" height="5" rx="2.5" fill="${C.lav}" opacity=".35"/><rect x="${bx + 10}" y="${by + 50}" width="30" height="5" rx="2.5" fill="${C.lav}" opacity=".35"/>
      ${packets}
      <text x="${cx + 74}" y="${cy + 16}" class="brace">{ }</text>
      <text x="${bx + 36}" y="${by + 96}" class="cap">website</text><text x="${cx + 74}" y="${by + 96}" class="cap">agent API</text>`
  },
  // vector + keyword retrieval fused, then checked by a guard
  rag (cx, cy) {
    let vec = ''
    for (let i = 0; i < 9; i++) vec += `<circle cx="${f(cx - 100 + (i % 3) * 13)}" cy="${f(cy - 62 + Math.floor(i / 3) * 13)}" r="3.6" fill="${C.cyan}" opacity="${f(0.5 + (i % 4) * 0.15)}"/>`
    let bm = ''
    for (let i = 0; i < 3; i++) bm += `<rect x="${cx - 104}" y="${cy + 40 + i * 12}" width="${36 - i * 8}" height="5" rx="2.5" fill="${C.magenta}" opacity=".75"/>`
    const p1 = `M${cx - 62} ${cy - 50}C${cx - 30} ${cy - 50} ${cx - 34} ${cy} ${cx - 8} ${cy}`
    const p2 = `M${cx - 62} ${cy + 52}C${cx - 30} ${cy + 52} ${cx - 34} ${cy} ${cx - 8} ${cy}`
    const p3 = `M${cx + 8} ${cy}H${cx + 50}`
    const shield = `M${cx + 78} ${cy - 40}L${cx + 108} ${cy - 28}V${cy + 2}C${cx + 108} ${cy + 24} ${cx + 94} ${cy + 36} ${cx + 78} ${cy + 44}C${cx + 62} ${cy + 36} ${cx + 48} ${cy + 24} ${cx + 48} ${cy + 2}V${cy - 28}Z`
    return `${vec}${bm}
      <path d="${p1}" class="flow"/><path d="${p2}" class="flow"/><path d="${p3}" class="flow"/>
      <circle r="4" fill="${C.cyan}"><animateMotion dur="2.4s" repeatCount="indefinite" path="${p1}"/></circle>
      <circle r="4" fill="${C.magenta}"><animateMotion dur="2.4s" begin=".4s" repeatCount="indefinite" path="${p2}"/></circle>
      <circle cx="${cx}" cy="${cy}" r="9" fill="url(#core)"/>
      <path d="${shield}" fill="rgba(201,169,110,.18)" stroke="${C.violet}" stroke-width="2.2"/>
      <path d="M${cx + 64} ${cy + 2}L${cx + 74} ${cy + 13}L${cx + 94} ${cy - 10}" class="check" pathLength="1"/>
      <text x="${cx - 87}" y="${cy - 80}" class="cap">vector</text><text x="${cx - 87}" y="${cy + 92}" class="cap">BM25</text><text x="${cx + 78}" y="${cy + 66}" class="cap">guard</text>`
  },
  // OCR scan pulls structured fields out of a document
  doc (cx, cy) {
    const x = cx - 104; const y = cy - 66
    let lines = ''
    for (let i = 0; i < 6; i++) lines += `<rect x="${x + 14}" y="${y + 24 + i * 15}" width="${[58, 46, 62, 38, 54, 30][i]}" height="5" rx="2.5" fill="${C.lav}" opacity=".45"/>`
    const fields = ['type: invoice', 'total found', 'confidence .97']
    let pills = ''
    fields.forEach((t, i) => {
      const w = textW(t, 12, 0.6) + 18
      pills += `<g class="field" style="animation-delay:${f(0.6 + i * 0.45)}s"><rect x="${cx + 4}" y="${cy - 46 + i * 36}" width="${f(w)}" height="26" rx="13" class="chip"/><text x="${f(cx + 4 + w / 2)}" y="${cy - 29 + i * 36}" class="chipt" style="font-size:12px">${t}</text></g>`
    })
    return `<path d="M${x} ${y}H${x + 70}L${x + 90} ${y + 20}V${y + 132}H${x}Z" class="win"/><path d="M${x + 70} ${y}V${y + 20}H${x + 90}" class="win"/>
      ${lines}
      <rect x="${x - 6}" y="${y}" width="102" height="10" rx="5" fill="url(#scan)" class="scan"/>
      <path d="M${x + 96} ${cy}H${cx - 2}" class="flow"/>
      ${pills}`
  },
  // federated learning: clients send updates to an aggregator, which sends the global model back
  fed (cx, cy) {
    let out = ''
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2
      const x = f(cx + Math.cos(a) * 82); const y = f(cy + Math.sin(a) * 74)
      out += `<line x1="${x}" y1="${y}" x2="${cx}" y2="${cy}" class="spoke"/>`
      out += `<rect x="${f(x - 11)}" y="${f(y - 11)}" width="22" height="22" rx="6" fill="${C.deep}" stroke="${C.cyan}" stroke-width="2"/>`
      out += `<circle r="3.6" fill="${C.cyan}"><animateMotion dur="3s" begin="${f(i * 0.12)}s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;.45;1" calcMode="linear" path="M${x} ${y}L${cx} ${cy}"/></circle>`
      out += `<circle r="3.6" fill="${C.magenta}"><animateMotion dur="3s" begin="${f(1.5 + i * 0.12)}s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;.45;1" calcMode="linear" path="M${cx} ${cy}L${x} ${y}"/></circle>`
    }
    return `${out}<circle cx="${cx}" cy="${cy}" r="20" fill="url(#core)"/>`
  },
  // air-quality gauge whose needle moves, with English and Hindi answers
  air (cx, cy) {
    const r = 74; const y0 = cy + 18
    const pt = a => [f(cx + Math.cos(a) * r), f(y0 - Math.sin(a) * r)]
    const [ax, ay] = pt(Math.PI); const [bx, by] = pt(0)
    let ticks = ''
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI - (i / 6) * Math.PI
      ticks += `<line x1="${f(cx + Math.cos(a) * (r - 16))}" y1="${f(y0 - Math.sin(a) * (r - 16))}" x2="${f(cx + Math.cos(a) * (r - 8))}" y2="${f(y0 - Math.sin(a) * (r - 8))}" stroke="${C.lav}" stroke-opacity=".5" stroke-width="1.5"/>`
    }
    return `<linearGradient id="aqi" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.cyan}"/><stop offset=".55" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.magenta}"/></linearGradient>
      <path d="M${ax} ${ay}A${r} ${r} 0 0 1 ${bx} ${by}" fill="none" stroke="url(#aqi)" stroke-width="10" stroke-linecap="round"/>
      ${ticks}
      <g><animateTransform attributeName="transform" type="rotate" values="-70 ${cx} ${y0};35 ${cx} ${y0};10 ${cx} ${y0};55 ${cx} ${y0};-70 ${cx} ${y0}" keyTimes="0;.3;.5;.75;1" dur="6s" repeatCount="indefinite" calcMode="spline" keySplines=".4 0 .2 1;.4 0 .2 1;.4 0 .2 1;.4 0 .2 1"/>
        <line x1="${cx}" y1="${y0}" x2="${cx}" y2="${y0 - r + 18}" stroke="${C.white}" stroke-width="3.5" stroke-linecap="round"/></g>
      <circle cx="${cx}" cy="${y0}" r="8" fill="url(#core)"/>
      <text x="${cx}" y="${y0 + 30}" class="cap">air quality today</text>
      <g class="lang lang1"><rect x="${cx - 58}" y="${y0 + 46}" width="52" height="28" rx="14" class="chip"/><text x="${cx - 32}" y="${y0 + 65}" class="chipt">English</text></g>
      <g class="lang lang2"><rect x="${cx + 6}" y="${y0 + 46}" width="52" height="28" rx="14" class="chip"/><text x="${cx + 32}" y="${y0 + 65}" class="chipt">Hindi</text></g>`
  },
  // messy files go through agents and come out as a table
  extract (cx, cy) {
    let files = ''
    ;['CSV', 'PDF', 'XLS'].forEach((t, i) => {
      const y = cy - 62 + i * 46
      files += `<rect x="${cx - 118}" y="${y}" width="40" height="34" rx="6" class="win"/><text x="${cx - 98}" y="${y + 22}" class="cap" style="font-size:10.5px">${t}</text>`
      files += `<path d="M${cx - 76} ${y + 17}C${cx - 52} ${y + 17} ${cx - 50} ${cy} ${cx - 30} ${cy}" class="flow"/>`
    })
    let rows = ''
    for (let i = 0; i < 4; i++) {
      rows += `<g class="row" style="animation-delay:${f(0.5 + i * 0.4)}s"><rect x="${cx + 20}" y="${cy - 40 + i * 22}" width="34" height="14" rx="3" fill="${C.cyan}" opacity=".55"/><rect x="${cx + 58}" y="${cy - 40 + i * 22}" width="50" height="14" rx="3" fill="${C.violet}" opacity=".6"/></g>`
    }
    return `${files}
      <circle cx="${cx - 16}" cy="${cy}" r="14" fill="url(#core)"/>
      <path d="M${cx - 2} ${cy}H${cx + 14}" class="flow"/>
      <rect x="${cx + 14}" y="${cy - 50}" width="100" height="100" rx="8" class="win"/>
      ${rows}
      <g class="sqlpop"><rect x="${cx + 34}" y="${cy + 62}" width="62" height="26" rx="13" class="chip"/><text x="${cx + 65}" y="${cy + 79}" class="chipt">SQL</text></g>`
  },
  // an image is redesigned from a prompt, with a progress bar
  image (cx, cy) {
    const frame = (x, tone) => `<rect x="${x}" y="${cy - 58}" width="84" height="74" rx="8" class="win"/>
      <path d="M${x + 8} ${cy + 8}L${x + 30} ${cy - 22}L${x + 46} ${cy - 2}L${x + 58} ${cy - 14}L${x + 76} ${cy + 8}Z" fill="${tone}" opacity=".8"/>`
    return `${frame(cx - 112, C.lav)}
      <circle cx="${cx + 88}" cy="${cy - 36}" r="8" fill="${C.magenta}"/>
      ${frame(cx + 28, C.cyan)}
      <path d="M${cx - 22} ${cy - 20}H${cx + 22}" class="flow"/>
      <text x="${cx}" y="${cy - 30}" class="cap">prompt</text>
      <rect x="${cx - 112}" y="${cy + 36}" width="224" height="10" rx="5" fill="rgba(201,169,110,.15)"/>
      <rect x="${cx - 112}" y="${cy + 36}" width="224" height="10" rx="5" fill="url(#aqi2)" class="prog"/>
      <linearGradient id="aqi2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.magenta}"/></linearGradient>
      <text x="${cx - 70}" y="${cy + 72}" class="cap">original</text><text x="${cx + 70}" y="${cy + 72}" class="cap">redesigned</text>`
  },
  // ask a PDF a question and get an answer
  pdf (cx, cy) {
    const x = cx - 118; const y = cy - 60
    let lines = ''
    for (let i = 0; i < 5; i++) lines += `<rect x="${x + 12}" y="${y + 30 + i * 14}" width="${[44, 36, 50, 30, 42][i]}" height="5" rx="2.5" fill="${C.lav}" opacity=".45"/>`
    return `<path d="M${x} ${y}H${x + 56}L${x + 72} ${y + 16}V${y + 120}H${x}Z" class="win"/>
      <text x="${x + 36}" y="${y + 20}" class="cap" style="font-size:11px">PDF</text>${lines}
      <g class="bub b1"><rect x="${cx - 26}" y="${cy - 58}" width="136" height="34" rx="14" fill="none" stroke="${C.cyan}" stroke-width="1.6"/><text x="${cx + 42}" y="${cy - 36}" class="chipt">Summarise page 4</text></g>
      <g class="bub b2"><rect x="${cx - 26}" y="${cy - 12}" width="136" height="54" rx="14" fill="rgba(201,169,110,.35)"/><rect x="${cx - 12}" y="${cy + 2}" width="104" height="6" rx="3" fill="${C.white}" opacity=".7"/><rect x="${cx - 12}" y="${cy + 16}" width="78" height="6" rx="3" fill="${C.white}" opacity=".5"/><text x="${cx + 98}" y="${cy + 54}" class="cap" style="text-anchor:end">from page 4</text></g>
      <g class="typing"><circle cx="${cx - 4}" cy="${cy + 16}" r="3.5" fill="${C.lav}"/><circle cx="${cx + 8}" cy="${cy + 16}" r="3.5" fill="${C.lav}"/><circle cx="${cx + 20}" cy="${cy + 16}" r="3.5" fill="${C.lav}"/></g>`
  },
  // a school bus drives its route; fees are paid automatically
  bus (cx, cy) {
    const road = `M${cx - 118} ${cy + 52}C${cx - 60} ${cy + 52} ${cx - 70} ${cy - 10} ${cx - 10} ${cy - 10}S${cx + 50} ${cy - 62} ${cx + 112} ${cy - 56}`
    let stops = ''
    for (const [sx, sy] of [[cx - 118, cy + 52], [cx - 10, cy - 10], [cx + 112, cy - 56]]) stops += `<circle cx="${sx}" cy="${sy}" r="7" fill="${C.deep}" stroke="${C.cyan}" stroke-width="2.5"/>`
    return `<path d="${road}" fill="none" stroke="rgba(201,169,110,.25)" stroke-width="14" stroke-linecap="round"/>
      <path d="${road}" class="flow"/>
      ${stops}
      <g><animateMotion dur="5s" repeatCount="indefinite" rotate="auto" path="${road}"/>
        <rect x="-16" y="-9" width="32" height="18" rx="5" fill="${C.magenta}"/><rect x="4" y="-6" width="8" height="6" rx="1.5" fill="${C.white}" opacity=".85"/><rect x="-10" y="-6" width="10" height="6" rx="1.5" fill="${C.white}" opacity=".85"/></g>
      <g class="fee"><circle cx="${cx + 78}" cy="${cy + 44}" r="22" fill="rgba(201,169,110,.15)" stroke="${C.cyan}" stroke-width="2"/><text x="${cx + 78}" y="${cy + 52}" style="font:700 22px ${SANS};fill:${C.white};text-anchor:middle">₹</text></g>
      <text x="${cx + 78}" y="${cy + 86}" class="cap">AutoPay</text>`
  },
  // farm records grow like crops
  farm (cx, cy) {
    let bars = ''
    ;[46, 70, 58, 88, 76].forEach((h, i) => {
      const x = cx - 104 + i * 30
      bars += `<rect x="${x}" y="${cy + 50 - h}" width="20" height="${h}" rx="5" fill="${i % 2 ? C.violet : C.cyan}" opacity=".75" class="bar" style="animation-delay:${f(i * 0.18)}s;transform-origin:${x + 10}px ${cy + 50}px"/>`
    })
    return `<line x1="${cx - 114}" y1="${cy + 50}" x2="${cx + 50}" y2="${cy + 50}" stroke="${C.lav}" stroke-opacity=".4" stroke-width="1.5"/>
      ${bars}
      <path d="M${cx + 88} ${cy + 50}V${cy - 6}" stroke="${C.cyan}" stroke-width="3" class="grow" pathLength="1" fill="none"/>
      <path d="M${cx + 88} ${cy + 6}C${cx + 62} ${cy + 2} ${cx + 58} ${cy - 22} ${cx + 66} ${cy - 34}C${cx + 84} ${cy - 30} ${cx + 92} ${cy - 12} ${cx + 88} ${cy + 6}Z" fill="${C.cyan}" opacity=".8" class="leaf"/>
      <path d="M${cx + 88} ${cy - 6}C${cx + 110} ${cy - 10} ${cx + 118} ${cy - 34} ${cx + 110} ${cy - 46}C${cx + 94} ${cy - 40} ${cx + 86} ${cy - 24} ${cx + 88} ${cy - 6}Z" fill="${C.magenta}" opacity=".8" class="leaf" style="animation-delay:.4s"/>
      <text x="${cx - 44}" y="${cy + 74}" class="cap">milk, eggs, livestock</text>`
  },
}

function card ({ id, context, title, lines, chips, visual, delay }) {
  const W = 600
  const H = 380
  // wrap the title to fit beside the visual
  const words = title.split(' '); const tl = ['']
  for (const w of words) { const t = (tl[tl.length - 1] + ' ' + w).trim(); if (textW(t, 29, 0.56) > 330 && tl[tl.length - 1]) tl.push(w); else tl[tl.length - 1] = t }
  const descY = 98 + (tl.length - 1) * 34 + 40
  const chipY = descY + (lines.length - 1) * 25 + 34
  return `${svgOpen(W, H, title, `${context}. ${lines.join(' ')}`)}
  <defs>
    
    <linearGradient id="holo" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="${H}">
      <stop offset="0" stop-color="${C.cyan}"/><stop offset=".5" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.magenta}"/>
      <animateTransform attributeName="gradientTransform" type="rotate" from="0 300 170" to="360 300 170" dur="10s" repeatCount="indefinite"/>
    </linearGradient>
    <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".09"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="core"><stop offset="0" stop-color="#FFF4DC"/><stop offset=".5" stop-color="${GOLD}"/><stop offset="1" stop-color="${C.violet}"/></radialGradient>
    <linearGradient id="scan" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.cyan}" stop-opacity="0"/><stop offset=".5" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/></linearGradient>
    <clipPath id="clip"><rect x="10" y="14" width="580" height="350" rx="22"/></clipPath>
    <filter id="g" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <style>
    .float{}
    @keyframes float{from{transform:translateY(4px)}to{transform:translateY(-6px)}}
    .ctx{font:600 14px ${SANS};fill:#67E8F9}
    .ttl{font:700 29px ${SANS};fill:${C.white}}
    .desc{font:400 16.5px ${SANS};fill:${C.lav}}
    .chip{fill:none;stroke:rgba(201,169,110,.4);stroke-width:1}
    .chipt{font:500 13px ${SANS};fill:${C.white};text-anchor:middle}
    .cap{font:500 12px ${SANS};fill:${C.lav};text-anchor:middle;opacity:.85}
    .orbit{fill:none;stroke:${C.lav};stroke-opacity:.2;stroke-dasharray:3 6}
    .spoke{stroke:${C.lav};stroke-opacity:.35;stroke-width:1.2}
    .agent{animation:blink 2.8s ease-in-out infinite}
    @keyframes blink{0%,100%{opacity:.6}50%{opacity:1}}
    .win{fill:#000;stroke:${GOLD};stroke-width:1.4}
    .pipe{stroke:${C.violet};stroke-width:2;stroke-dasharray:4 5;animation:flow 1s linear infinite}
    .flow{fill:none;stroke:${C.violet};stroke-width:2;stroke-dasharray:4 5;animation:flow 1s linear infinite}
    @keyframes flow{to{stroke-dashoffset:-9}}
    .brace{font:700 40px ${MONO};fill:${C.magenta};text-anchor:middle}
    .check{fill:none;stroke:${C.cyan};stroke-width:4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 1;animation:tick 2.4s ease-out infinite}
    @keyframes tick{0%,35%{stroke-dashoffset:1}60%,100%{stroke-dashoffset:0}}
    .scan{animation:scan 2.6s ease-in-out infinite alternate}
    @keyframes scan{from{transform:translateY(0)}to{transform:translateY(122px)}}
    .field{opacity:0;animation:field 4.5s ease-out infinite}
    @keyframes field{0%{opacity:0;transform:translateX(-8px)}12%,85%{opacity:1;transform:none}100%{opacity:0}}
    .sweep{display:none}
    @keyframes sweep{0%,55%{transform:translateX(-260px) skewX(-20deg)}100%{transform:translateX(760px) skewX(-20deg)}}
    ${reduced('.float,.agent,.pipe,.flow,.check,.scan,.field,.sweep')}
    .lang{animation:lang 4s ease-in-out infinite}.lang2{animation-delay:2s}
    @keyframes lang{0%,100%{opacity:.35}25%,45%{opacity:1}}
    .row{opacity:0;animation:field 4.5s ease-out infinite}
    .sqlpop{animation:lang 4.5s ease-in-out infinite;animation-delay:2.2s}
    .prog{transform-origin:358px 0;animation:prog 4s ease-in-out infinite}
    @keyframes prog{0%{transform:scaleX(0)}70%,100%{transform:scaleX(1)}}
    .bub{opacity:0;animation:bub 5s ease-out infinite}.b2{animation-delay:1.6s}
    @keyframes bub{0%{opacity:0;transform:translateY(8px)}10%,85%{opacity:1;transform:none}100%{opacity:0}}
    .typing{animation:typing 5s linear infinite}
    @keyframes typing{0%,12%{opacity:0}16%,30%{opacity:1}34%,100%{opacity:0}}
    .fee{animation:lang 3s ease-in-out infinite}
    .bar{animation:barg 4s ease-in-out infinite}
    @keyframes barg{0%{transform:scaleY(.15)}45%,100%{transform:scaleY(1)}}
    .grow{stroke-dasharray:1 1;animation:growl 4s ease-out infinite}
    @keyframes growl{0%{stroke-dashoffset:1}40%,100%{stroke-dashoffset:0}}
    .leaf{opacity:0;animation:leaf 4s ease-out infinite}
    @keyframes leaf{0%,35%{opacity:0}55%,92%{opacity:.85}100%{opacity:0}}
    ${reduced('.lang,.row,.sqlpop,.prog,.bub,.typing,.fee,.bar,.grow,.leaf')}
    @media (prefers-reduced-motion: reduce){.field,.row,.bub,.leaf{opacity:1}}
  </style>
  <g class="float">
    <rect x="10" y="14" width="580" height="350" rx="3" fill="#000"/>
    <rect x="10.5" y="14.5" width="579" height="349" rx="3" fill="none" stroke="${HAIR}"/>
    <rect x="17.5" y="21.5" width="565" height="335" rx="1" fill="none" stroke="rgba(201,169,110,.14)"/>
    <line x1="40" y1="70" x2="64" y2="70" stroke="${GOLD}"/>
    <text x="40" y="56" class="ctx">${esc(context)}</text>
    ${tl.map((t, i) => `<text x="40" y="${98 + i * 34}" class="ttl">${esc(t)}</text>`).join('')}
    ${lines.map((l, i) => `<text x="40" y="${descY + i * 25}" class="desc">${esc(l)}</text>`).join('')}
    ${chipRow(chips, 40, chipY, 290)}
    <g filter="url(#g)">${visuals[visual](['doc', 'extract', 'bus'].includes(visual) ? 456 : 470, 205)}</g>
  </g>
</svg>
`
}

const cards = [
  {
    id: 'vaic', visual: 'vaic', delay: 0, context: 'NXL Technologies', title: 'VAiC',
    lines: ['Multi-agent platform that evaluates startups:', '8 specialised agents across 15 areas, with', 'retries, timeouts and cited evidence.'],
    chips: ['Python', 'Pydantic', 'Multi-agent', 'Clean Architecture'],
  },
  {
    id: 'pipes', visual: 'pipes', delay: 1.2, context: 'NXL Technologies', title: 'Pipes',
    lines: ['Turns websites into structured APIs', 'that AI agents can call, with async', 'workers and signed webhooks.'],
    chips: ['Job queues', 'PostgreSQL', 'SSRF protection', 'HMAC'],
  },
  {
    id: 'air', visual: 'air', delay: 0.3, context: 'Project, 2026, live', title: 'AirSaathi',
    lines: ['Turns today’s air quality into a', 'low-emission plan for Indian families,', 'in English and Hindi.'],
    chips: ['TypeScript', 'GenAI', 'Rules engine', 'Vercel'],
  },
  {
    id: 'extract', visual: 'extract', delay: 1.5, context: 'Project, 2026', title: 'Intelligent Data Extraction Pipeline',
    lines: ['Agents discover the schema, pull data', 'out of messy files, answer questions', 'in SQL and check data quality.'],
    chips: ['Python', 'Multi-agent', 'NL to SQL', 'Docker'],
  },
  {
    id: 'rag', visual: 'rag', delay: 0.6, context: 'Project, 2026', title: 'Medical Knowledge Assistant',
    lines: ['Agentic RAG with hybrid search and a', 'hallucination guard that checks every', 'answer against its sources.'],
    chips: ['LangGraph', 'ChromaDB', 'BM25', 'FastAPI'],
  },
  {
    id: 'doc', visual: 'doc', delay: 1.8, context: 'Project, 2026', title: 'Multi-Agent Document Processor',
    lines: ['Four LangGraph agents classify, extract', 'and validate invoices, resumes and', 'contracts, with confidence scores.'],
    chips: ['LangGraph', 'Tesseract OCR', 'Groq', 'Docker'],
  },
  {
    id: 'fed', visual: 'fed', delay: 0.9, context: 'Project, 2025', title: 'FedLiteLLMGuard',
    lines: ['Federated TinyBERT that detects rare', 'attacks on 5G networks without', 'pooling anyone’s raw traffic.'],
    chips: ['PyTorch', 'TinyBERT', 'Federated learning'],
  },
  {
    id: 'image', visual: 'image', delay: 1.1, context: 'Project, 2026', title: 'AI Image Redesign Studio',
    lines: ['Full-stack app that redesigns images', 'from a prompt, with live progress', 'and ZIP downloads.'],
    chips: ['FastAPI', 'React', 'Replicate', 'Docker'],
  },
  {
    id: 'pdf', visual: 'pdf', delay: 0.4, context: 'Project, 2026', title: 'PDF Chatbot',
    lines: ['Upload a PDF and ask it questions.', 'LangChain splits and retrieves the', 'text; Groq writes the answers.'],
    chips: ['LangChain', 'Groq', 'PyPDF', 'Colab'],
  },
  {
    id: 'bus', visual: 'bus', delay: 0.7, context: 'Full-stack app, 2026', title: 'School Bus Transport System',
    lines: ['Runs a school’s bus service: routes,', 'per-student monthly fees and', 'Razorpay AutoPay.'],
    chips: ['React', 'Express', 'MongoDB', 'Razorpay'],
  },
  {
    id: 'farm', visual: 'farm', delay: 1.4, context: 'Full-stack app, 2026, live', title: 'Organic Farm Portal',
    lines: ['Website and management portal for', 'an organic dairy and goat farm in', 'Tamil Nadu.'],
    chips: ['JavaScript', 'Frontend + backend', 'Vercel'],
  },
]

// ---------------------------------------------------------------- toolkit: tech orbiting a core in 3D
function toolkit () {
  const W = 1200
  const H = 660
  const cx = 600; const cy = 370
  const rings = [
    { rx: 190, ry: 78, rot: -14, dur: 30, color: GOLD, items: ['LangGraph', 'LangChain', 'ChromaDB', 'BM25', 'RAG'] },
    { rx: 340, ry: 150, rot: 9, dur: 44, color: '#B89B66', items: ['PyTorch', 'Hugging Face', 'TinyBERT', 'Scikit-learn', 'Pandas', 'NumPy'] },
    { rx: 500, ry: 215, rot: -5, dur: 60, color: C.lav, items: ['Python', 'FastAPI', 'Pydantic', 'Java', 'SQL', 'PostgreSQL', 'React', 'Docker'] },
  ]
  let orbits = ''; let pills = ''
  rings.forEach((R, ri) => {
    const p = `M${cx + R.rx} ${cy}A${R.rx} ${R.ry} 0 1 1 ${cx - R.rx} ${cy}A${R.rx} ${R.ry} 0 1 1 ${cx + R.rx} ${cy}`
    orbits += `<g transform="rotate(${R.rot} ${cx} ${cy})"><path d="${p}" class="orb" stroke="${R.color}"/></g>`
    R.items.forEach((t, i) => {
      const off = f((i / R.items.length) * R.dur)
      const w = textW(t, 15, 0.58) + 28
      const kt = '0;.25;.5;.75;1'
      pills += `<g transform="rotate(${R.rot} ${cx} ${cy})"><g>
        <animateMotion dur="${R.dur}s" begin="-${off}s" repeatCount="indefinite" path="${p}"/>
        <g transform="rotate(${-R.rot})"><g>
          <animateTransform attributeName="transform" type="scale" dur="${R.dur}s" begin="-${off}s" repeatCount="indefinite" keyTimes="${kt}" values="1;1.18;1;.78;1" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1"/>
          <animate attributeName="opacity" dur="${R.dur}s" begin="-${off}s" repeatCount="indefinite" keyTimes="${kt}" values=".8;1;.8;.32;.8" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1"/>
          <rect x="${f(-w / 2)}" y="-17" width="${f(w)}" height="34" rx="2" fill="#000" stroke="${R.color}" stroke-opacity=".7" stroke-width="1"/>
          <text y="5.5" class="pill">${t}</text>
        </g></g>
      </g></g>`
    })
  })
  return `${svgOpen(W, H, 'Toolkit', 'Technologies orbiting a glowing core: LangGraph, LangChain, ChromaDB, BM25 and RAG closest in; PyTorch, Hugging Face, TinyBERT, Scikit-learn, Pandas and NumPy in the middle; Python, FastAPI, Pydantic, Java, SQL, PostgreSQL, React and Docker on the outside.')}
  ${spaceBg(W, H, 80)}
  <defs>
    <radialGradient id="orb"><stop offset="0" stop-color="#FFF4DC"/><stop offset=".45" stop-color="${GOLD}"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>
    <filter id="blur" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>
  <style>
    ${starCss}
    .orb{fill:none;stroke-width:1;stroke-opacity:.35}
    .pill{font:600 15px ${SANS};fill:${C.white};text-anchor:middle}
    .core{animation:breathe 4s ease-in-out infinite alternate;transform-origin:${cx}px ${cy}px}
    @keyframes breathe{from{transform:scale(.92)}to{transform:scale(1.08)}}
    .lbl{font:700 22px ${SANS};fill:${C.white};text-anchor:middle}
    .sub{font:400 15px ${SANS};fill:${C.lav};text-anchor:middle}
    ${reduced('.star,.core')}
  </style>
  <text x="${cx}" y="66" class="lbl">What I build with</text>
  <text x="${cx}" y="96" class="sub">agent frameworks inside, models in the middle, engineering on the outside</text>
  ${orbits}
  <g class="core"><circle cx="${cx}" cy="${cy}" r="90" fill="${GOLD}" opacity=".12" filter="url(#blur)"/><circle cx="${cx}" cy="${cy}" r="30" fill="url(#orb)"/></g>
  ${pills}
</svg>
`
}

// ---------------------------------------------------------------- certifications
function creds () {
  const W = 1200
  const H = 330
  const items = [
    ['Amazon Web Services', 'AWS Certified Cloud Practitioner', '2024'],
    ['Alteryx', 'Designer Core Certified', '2026'],
    ['NPTEL', 'Google Cloud Computing Foundations', '2024'],
    ['IIT Madras', 'Artificial Intelligence Workshop', '2024'],
    ['Paytm Hackathon', 'Top 10 of 40,000 applicants', 'Voice agents'],
  ]
  const bw = 368; const bh = 104; const gap = 18
  let out = ''
  items.forEach(([who, what, when], i) => {
    const row = i < 3 ? 0 : 1
    const inRow = row === 0 ? 3 : 2
    const col = row === 0 ? i : i - 3
    const x = (W - (inRow * bw + (inRow - 1) * gap)) / 2 + col * (bw + gap)
    const y = 96 + row * (bh + gap)
    out += `<g>
      <rect x="${f(x)}" y="${y}" width="${bw}" height="${bh}" rx="2" fill="#000" stroke="${HAIR}" stroke-width="1"/>
      <g clip-path="url(#c${i})"><rect class="sweep" style="animation-delay:${f(i * 0.7)}s" x="${f(x - 140)}" y="${y}" width="120" height="${bh}" fill="url(#sweep)"/></g>
      <clipPath id="c${i}"><rect x="${f(x)}" y="${y}" width="${bw}" height="${bh}" rx="18"/></clipPath>
      <text x="${f(x + 24)}" y="${y + 36}" class="who">${esc(who)}</text>
      <text x="${f(x + bw - 24)}" y="${y + 36}" class="when">${esc(when)}</text>
      <text x="${f(x + 24)}" y="${y + 72}" class="what" style="font-size:${f(Math.min(21, 318 / (what.length * 0.56)))}px">${esc(what)}</text>
    </g>`
  })
  return `${svgOpen(W, H, 'Certifications and achievements', items.map(i => i.join(', ')).join('; '))}
  ${spaceBg(W, H, 50)}
  <defs>
    <linearGradient id="holo" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="${H}">
      <stop offset="0" stop-color="${C.cyan}"/><stop offset=".5" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.magenta}"/>
      <animateTransform attributeName="gradientTransform" type="rotate" from="0 600 165" to="360 600 165" dur="14s" repeatCount="indefinite"/>
    </linearGradient>
    <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <style>
    ${starCss}
    .lbl{font:700 22px ${SANS};fill:${C.white};text-anchor:middle}
    .who{font:600 14px ${SANS};fill:#67E8F9}
    .when{font:500 14px ${SANS};fill:${C.lav};text-anchor:end}
    .what{font:700 19px ${SANS};fill:${C.white}}
    .sweep{display:none}
    @keyframes sw{0%,60%{transform:translateX(0)}100%{transform:translateX(560px)}}
    ${reduced('.star,.sweep')}
  </style>
  <text x="600" y="64" class="lbl">Certifications and wins</text>
  ${out}
</svg>
`
}

// ---------------------------------------------------------------- LinkedIn button
// ---------------------------------------------------------------- click-to-open buttons (used inside <summary>)
function button (label, hint) {
  const W = 560
  const H = 76
  return `${svgOpen(W, H, label, `${label}. ${hint}`)}
  <defs>
    <linearGradient id="shim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${GOLD}" stop-opacity="0"/><stop offset=".5" stop-color="#FFE9B8" stop-opacity=".9"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="bc"><rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="2"/></clipPath>
  </defs>
  <style>
    .shim{animation:shim 3.6s ease-in-out infinite}
    @keyframes shim{0%,40%{transform:translateX(-220px)}100%{transform:translateX(${W + 40}px)}}
    .plus{animation:nudge 3.6s ease-in-out infinite;transform-origin:${W - 50}px ${H / 2}px}
    @keyframes nudge{0%,70%,100%{transform:scale(1)}80%{transform:scale(1.18)}}
    ${reduced('.shim,.plus')}
  </style>
  <rect x="12.5" y="12.5" width="${W - 25}" height="${H - 25}" rx="2" fill="#000" stroke="${HAIR}"/>
  <g clip-path="url(#bc)"><rect class="shim" x="0" y="${H - 14}" width="200" height="1.5" fill="url(#shim)"/></g>
  <text x="36" y="${H / 2 + 6}" class="t">${esc(label)}</text>
  <text x="${W - 92}" y="${H / 2 + 5}" class="when">${esc(hint)}</text>
  <g class="plus"><rect x="${W - 64.5}" y="${H / 2 - 14.5}" width="29" height="29" rx="2" fill="none" stroke="${GOLD}"/>
    <path d="M${W - 50} ${H / 2 - 7}V${H / 2 + 7}M${W - 57} ${H / 2}H${W - 43}" stroke="${GOLD}" stroke-width="1.6"/></g>
</svg>
`
}

function linkedin () {
  const W = 420
  const H = 84
  return `${svgOpen(W, H, 'Connect on LinkedIn', 'Button linking to Kiran D on LinkedIn')}
  <defs>
    <linearGradient id="holo" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0">
      <stop offset="0" stop-color="${C.cyan}"/><stop offset=".5" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.magenta}"/>
      <animateTransform attributeName="gradientTransform" type="translate" values="-140 0;140 0;-140 0" dur="6s" repeatCount="indefinite"/>
    </linearGradient>
    <filter id="g" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="7"/></filter>
  </defs>
  <style>
    .glow{animation:pulse 2.6s ease-in-out infinite alternate}
    @keyframes pulse{from{opacity:.25}to{opacity:.7}}
    .t{font:700 22px ${SANS};fill:${C.white}}
    ${reduced('.glow')}
  </style>
  <rect x="12.5" y="12.5" width="${W - 25}" height="${H - 25}" rx="2" fill="#000" stroke="${HAIR}"/>
  <rect x="34.5" y="27.5" width="29" height="29" rx="2" fill="none" stroke="${GOLD}"/>
  <text x="49" y="48" class="in">in</text>
  <text x="84" y="49" class="t">Connect on LinkedIn</text>
</svg>
`
}

const opentype = require(path.join(__dirname, '..', '.tools', 'node_modules', 'opentype.js'))
const FD = path.join(__dirname, '..', '.tools', 'node_modules', '@fontsource')
const load = (fam, sub, w) => opentype.loadSync(path.join(FD, fam, 'files', `${fam}-${sub}-${w}-normal.woff`))
const F = {
  serif300: [load('fraunces', 'latin', 300), load('fraunces', 'latin-ext', 300)],
  serif400: [load('fraunces', 'latin', 400), load('fraunces', 'latin-ext', 400)],
  sans400: [load('inter', 'latin', 400), load('inter', 'latin-ext', 400)],
  sans500: [load('inter', 'latin', 500), load('inter', 'latin-ext', 500)],
  sans600: [load('inter', 'latin', 600), load('inter', 'latin-ext', 600)],
}
const TS = {
  name: { f: 'serif300', size: 132, fill: C.white, ls: -2.5 },
  role: { f: 'sans500', size: 24, fill: C.white },
  line: { f: 'sans400', size: 19, fill: C.lav },
  where: { f: 'sans500', size: 15, fill: GOLD, ls: 0.3 },
  ctx: { f: 'sans500', size: 13, fill: GOLD, ls: 0.3 },
  ttl: { f: 'serif400', size: 30, fill: C.white, ls: -0.3 },
  desc: { f: 'sans400', size: 15.5, fill: C.lav },
  chipt: { f: 'sans500', size: 12, fill: C.white, anchor: 'middle' },
  cap: { f: 'sans400', size: 11.5, fill: C.lav, anchor: 'middle' },
  brace: { f: 'serif300', size: 40, fill: GOLD, anchor: 'middle' },
  lbl: { f: 'serif400', size: 34, fill: C.white, anchor: 'middle', ls: -0.3 },
  sub: { f: 'sans400', size: 15, fill: C.lav, anchor: 'middle' },
  pill: { f: 'sans500', size: 14, fill: C.white, anchor: 'middle' },
  who: { f: 'sans500', size: 13, fill: GOLD, ls: 0.3 },
  when: { f: 'sans400', size: 13, fill: C.lav, anchor: 'end' },
  what: { f: 'serif400', size: 21, fill: C.white },
  t: { f: 'sans500', size: 19, fill: C.white },
  in: { f: 'sans600', size: 15, fill: C.white, anchor: 'middle' },
}
const decode = t => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const glyphFont = (fonts, ch) => fonts.find(fo => fo.charToGlyph(ch).index !== 0) || fonts[0]
const runWidth = (fonts, str, size, ls) => [...str].reduce((w, ch) => w + glyphFont(fonts, ch).getAdvanceWidth(ch, size) + ls, 0) - ls
const textPath = (fonts, str, x, y, size, ls) => {
  let d = ''; let cx = x
  for (const ch of str) {
    const fo = glyphFont(fonts, ch)
    d += fo.getPath(ch, cx, y, size).toPathData(1)
    cx += fo.getAdvanceWidth(ch, size) + ls
  }
  return d
}
textW = (str, px) => runWidth(F.sans500, str, px * 0.93, 0)
const vectorize = svg => svg
  .replace(/<style>[\s\S]*?<\/style>/, st => st.replace(/\.(name|role|line|where|ctx|ttl|desc|chipt|cap|brace|lbl|sub|pill|who|when|what|t|in)\{font:[^}]*\}/g, ''))
  .replace(/<text([^>]*)>([^<]*)<\/text>/g, (m, attrs, body) => {
    const get = k => (attrs.match(new RegExp('\\s' + k + '="([^"]*)"')) || [])[1]
    const cls = (get('class') || '').split(/\s+/)
    const base = TS[cls.find(c => TS[c])] || { f: 'sans400', size: 14, fill: C.white }
    const style = get('style') || ''
    const size = Number((style.match(/font-size:([\d.]+)px/) || [])[1]) || Number((style.match(/font:\s*\d+\s+([\d.]+)px/) || [])[1]) || base.size
    const anchor = (style.match(/text-anchor:(\w+)/) || [])[1] || base.anchor || 'start'
    const ls = base.ls || 0
    const str = decode(body)
    const fonts = F[base.f]
    const w = runWidth(fonts, str, size, ls)
    let x = Number(get('x') || 0); const y = Number(get('y') || 0)
    if (anchor === 'middle') x -= w / 2
    else if (anchor === 'end') x -= w
    const keep = attrs.replace(/\s(x|y)="[^"]*"/g, '').replace(/\sstyle="[^"]*"/, m2 => {
      const anim = m2.match(/animation-[\w-]+:[^;"]+/g)
      return anim ? ` style="${anim.join(';')}"` : ''
    })
    const fill = get('fill') ? '' : ` fill="${base.fill}"`
    return `<path${keep}${fill} d="${textPath(fonts, str, x, y, size, ls)}"/>`
  })

const out = path.join(__dirname, '..', 'assets')
fs.mkdirSync(out, { recursive: true })
for (const old of ['stack.svg']) fs.rmSync(path.join(out, old), { force: true })
const write = (name, raw) => { const s = vectorize(raw); fs.writeFileSync(path.join(out, name), s); console.log(`${name.padEnd(16)} ${(s.length / 1024).toFixed(1)} KB`) }
write('hero.svg', hero())
for (const c of cards) write(`card-${c.id}.svg`, card(c))
write('toolkit.svg', toolkit())
write('creds.svg', creds())
write('linkedin.svg', linkedin())
write('btn-more-ai.svg', button('Show 3 more AI projects', 'click to open'))
write('btn-fullstack.svg', button('Full-stack apps', 'click to open'))
write('btn-opensource.svg', button('Open-source work on npm', 'click to open'))
