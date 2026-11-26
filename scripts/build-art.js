// Generates the animated profile SVGs in ../assets.
// GitHub shows SVGs as <img>: CSS and SMIL animation work, scripts and web fonts do not.
// Run: node scripts/build-art.js
const fs = require('node:fs')
const path = require('node:path')

const C = {
  space: '#07051A',
  deep: '#120B33',
  cyan: '#22D3EE',
  violet: '#8B5CF6',
  magenta: '#E879F9',
  lav: '#C4B5FD',
  white: '#F5F3FF',
}
const SANS = "'Segoe UI Variable Display','Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif"
const MONO = "'Cascadia Code',Consolas,'SFMono-Regular',Menlo,monospace"
const f = n => Math.round(n * 10) / 10
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

// seeded random so the art is stable between builds
let seed = 7
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647

const textW = (s, px, k = 0.56) => s.length * px * k

// shared space background: nebula glow and twinkling stars
const spaceBg = (W, H, stars = 90) => {
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
const starCss = `.star{opacity:.25;animation:tw 5s ease-in-out infinite alternate}@keyframes tw{from{opacity:.12}to{opacity:.9}}`
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
  const layerColor = [C.cyan, '#60A5FA', C.violet, C.magenta]
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
    flashCss += `.l${l}{animation:fl${l} ${PASS}s linear infinite}@keyframes fl${l}{0%,${f(Math.max(at - 2, 0))}%,${f(at + 14)}%,100%{fill:${layerColor[l]}}${f(at + 3)}%{fill:#fff}}`
  }

  const name = 'Kiran D'
  return `${svgOpen(W, H, 'Kiran D, AI/ML engineer', 'A rotating 3D neural network made of glowing nodes, with signals passing forward through its layers, beside the name Kiran D in chrome type.')}
  ${spaceBg(W, H, 110)}
  <defs>
    ${defs}
    <filter id="glow" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
      <feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="soft" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="22"/></filter>
    <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset=".42" stop-color="#E0E7FF"/><stop offset=".5" stop-color="${C.lav}"/>
      <stop offset=".58" stop-color="#A78BFA"/><stop offset=".8" stop-color="#67E8F9"/><stop offset="1" stop-color="#F0FDFF"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/>
      <animateTransform attributeName="gradientTransform" type="translate" values="-1 0;-1 0;1.2 0;1.2 0" keyTimes="0;.45;.75;1" dur="5s" repeatCount="indefinite"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.cyan}"/><stop offset=".5" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.magenta}" stop-opacity="0"/></linearGradient>
  </defs>
  <style>
    ${starCss}
    .edge{stroke:${C.lav};stroke-width:1.1}
    .pulse{stroke:#fff;stroke-width:2.6;stroke-linecap:round;stroke-dasharray:.07 .93;stroke-dashoffset:.07;opacity:0;animation:fire ${PASS}s linear infinite}
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

  <circle cx="${CX}" cy="${CY}" r="190" fill="${C.violet}" opacity=".22" filter="url(#soft)"/>
  <g filter="url(#glow)">
    <g>${edgeUses}</g>
    <g>${pulseUses}</g>
    <g>${nodeEls}</g>
  </g>

  <g class="rise" style="animation-delay:.1s">
    <text class="name" x="64" y="250" fill="url(#chrome)">${name}</text>
    <text class="name" x="64" y="250" fill="url(#shine)" opacity=".55">${name}</text>
  </g>
  <rect class="rise" style="animation-delay:.35s" x="68" y="282" width="360" height="3" rx="1.5" fill="url(#rule)"/>
  <text class="role rise" style="animation-delay:.45s" x="66" y="336">AI/ML engineer</text>
  <text class="line rise" style="animation-delay:.6s" x="66" y="378">I build multi-agent systems and RAG pipelines</text>
  <text class="line rise" style="animation-delay:.7s" x="66" y="408">that hold up in production.</text>
  <text class="where rise" style="animation-delay:.85s" x="66" y="462">Junior AI Developer at NXL Technologies, Chennai</text>
</svg>
`
}

// ---------------------------------------------------------------- project cards
const chipRow = (chips, x, y, maxW) => {
  let cx = x; let cy = y; let out = ''
  for (const c of chips) {
    const w = textW(c, 13, 0.6) + 22
    if (cx + w > x + maxW) { cx = x; cy += 34 }
    out += `<g><rect x="${f(cx)}" y="${cy}" width="${f(w)}" height="26" rx="13" class="chip"/><text x="${f(cx + w / 2)}" y="${cy + 17.5}" class="chipt">${esc(c)}</text></g>`
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
      <path d="${shield}" fill="rgba(139,92,246,.18)" stroke="${C.violet}" stroke-width="2.2"/>
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
    <linearGradient id="cardBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#170E40"/><stop offset="1" stop-color="#090620"/></linearGradient>
    <linearGradient id="holo" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="${H}">
      <stop offset="0" stop-color="${C.cyan}"/><stop offset=".5" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.magenta}"/>
      <animateTransform attributeName="gradientTransform" type="rotate" from="0 300 170" to="360 300 170" dur="10s" repeatCount="indefinite"/>
    </linearGradient>
    <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".09"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="core"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.violet}"/></radialGradient>
    <linearGradient id="scan" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.cyan}" stop-opacity="0"/><stop offset=".5" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/></linearGradient>
    <clipPath id="clip"><rect x="10" y="14" width="580" height="350" rx="22"/></clipPath>
    <filter id="g" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <style>
    .float{animation:float 6s ease-in-out infinite alternate;animation-delay:${delay}s}
    @keyframes float{from{transform:translateY(4px)}to{transform:translateY(-6px)}}
    .ctx{font:600 14px ${SANS};fill:#67E8F9}
    .ttl{font:700 29px ${SANS};fill:${C.white}}
    .desc{font:400 16.5px ${SANS};fill:${C.lav}}
    .chip{fill:rgba(139,92,246,.16);stroke:rgba(196,181,253,.45);stroke-width:1}
    .chipt{font:500 13px ${SANS};fill:${C.white};text-anchor:middle}
    .cap{font:500 12px ${SANS};fill:${C.lav};text-anchor:middle;opacity:.85}
    .orbit{fill:none;stroke:${C.lav};stroke-opacity:.2;stroke-dasharray:3 6}
    .spoke{stroke:${C.lav};stroke-opacity:.35;stroke-width:1.2}
    .agent{animation:blink 2.8s ease-in-out infinite}
    @keyframes blink{0%,100%{opacity:.6}50%{opacity:1}}
    .win{fill:rgba(18,11,51,.9);stroke:${C.cyan};stroke-width:2}
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
    .sweep{animation:sweep 7s ease-in-out infinite;animation-delay:${delay}s}
    @keyframes sweep{0%,55%{transform:translateX(-260px) skewX(-20deg)}100%{transform:translateX(760px) skewX(-20deg)}}
    ${reduced('.float,.agent,.pipe,.flow,.check,.scan,.field,.sweep')}
    @media (prefers-reduced-motion: reduce){.field{opacity:1}}
  </style>
  <g class="float">
    <rect x="10" y="14" width="580" height="350" rx="22" fill="url(#cardBg)"/>
    <g clip-path="url(#clip)">
      <circle cx="470" cy="205" r="150" fill="${C.violet}" opacity=".12"/>
      <rect class="sweep" x="0" y="0" width="160" height="${H}" fill="url(#sweep)"/>
    </g>
    <rect x="10" y="14" width="580" height="350" rx="22" fill="none" stroke="url(#holo)" stroke-width="1.6"/>
    <text x="40" y="58" class="ctx">${esc(context)}</text>
    ${tl.map((t, i) => `<text x="40" y="${98 + i * 34}" class="ttl">${esc(t)}</text>`).join('')}
    ${lines.map((l, i) => `<text x="40" y="${descY + i * 25}" class="desc">${esc(l)}</text>`).join('')}
    ${chipRow(chips, 40, chipY, 330)}
    <g filter="url(#g)">${visuals[visual](visual === 'doc' ? 452 : 470, 205)}</g>
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
]

// ---------------------------------------------------------------- toolkit: tech orbiting a core in 3D
function toolkit () {
  const W = 1200
  const H = 660
  const cx = 600; const cy = 370
  const rings = [
    { rx: 190, ry: 78, rot: -14, dur: 26, color: C.cyan, items: ['LangGraph', 'LangChain', 'ChromaDB', 'BM25', 'RAG'] },
    { rx: 340, ry: 150, rot: 9, dur: 38, color: C.violet, items: ['PyTorch', 'Hugging Face', 'TinyBERT', 'Scikit-learn', 'Pandas', 'NumPy'] },
    { rx: 500, ry: 215, rot: -5, dur: 52, color: C.magenta, items: ['Python', 'FastAPI', 'Pydantic', 'Java', 'SQL', 'PostgreSQL', 'React', 'Docker'] },
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
          <rect x="${f(-w / 2)}" y="-17" width="${f(w)}" height="34" rx="17" fill="rgba(18,11,51,.92)" stroke="${R.color}" stroke-width="1.5"/>
          <text y="5.5" class="pill">${t}</text>
        </g></g>
      </g></g>`
    })
  })
  return `${svgOpen(W, H, 'Toolkit', 'Technologies orbiting a glowing core: LangGraph, LangChain, ChromaDB, BM25 and RAG closest in; PyTorch, Hugging Face, TinyBERT, Scikit-learn, Pandas and NumPy in the middle; Python, FastAPI, Pydantic, Java, SQL, PostgreSQL, React and Docker on the outside.')}
  ${spaceBg(W, H, 80)}
  <defs>
    <radialGradient id="orb"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#A5F3FC"/><stop offset=".65" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></radialGradient>
    <filter id="blur" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>
  <style>
    ${starCss}
    .orb{fill:none;stroke-width:1.2;stroke-opacity:.35;stroke-dasharray:2 7}
    .pill{font:600 15px ${SANS};fill:${C.white};text-anchor:middle}
    .core{animation:breathe 4s ease-in-out infinite alternate;transform-origin:${cx}px ${cy}px}
    @keyframes breathe{from{transform:scale(.92)}to{transform:scale(1.08)}}
    .lbl{font:700 22px ${SANS};fill:${C.white};text-anchor:middle}
    .sub{font:400 15px ${SANS};fill:${C.lav};text-anchor:middle}
    ${reduced('.star,.core')}
  </style>
  <text x="${cx}" y="58" class="lbl">What I build with</text>
  <text x="${cx}" y="84" class="sub">agent frameworks inside, models in the middle, engineering on the outside</text>
  ${orbits}
  <g class="core"><circle cx="${cx}" cy="${cy}" r="90" fill="${C.violet}" opacity=".45" filter="url(#blur)"/><circle cx="${cx}" cy="${cy}" r="40" fill="url(#orb)"/></g>
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
      <rect x="${f(x)}" y="${y}" width="${bw}" height="${bh}" rx="18" fill="rgba(23,14,64,.85)" stroke="url(#holo)" stroke-width="1.4"/>
      <g clip-path="url(#c${i})"><rect class="sweep" style="animation-delay:${f(i * 0.7)}s" x="${f(x - 140)}" y="${y}" width="120" height="${bh}" fill="url(#sweep)"/></g>
      <clipPath id="c${i}"><rect x="${f(x)}" y="${y}" width="${bw}" height="${bh}" rx="18"/></clipPath>
      <text x="${f(x + 24)}" y="${y + 36}" class="who">${esc(who)}</text>
      <text x="${f(x + bw - 24)}" y="${y + 36}" class="when">${esc(when)}</text>
      <text x="${f(x + 24)}" y="${y + 72}" class="what" style="font-size:${f(Math.min(19, 318 / (what.length * 0.56)))}px">${esc(what)}</text>
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
    .sweep{animation:sw 6s ease-in-out infinite}
    @keyframes sw{0%,60%{transform:translateX(0)}100%{transform:translateX(560px)}}
    ${reduced('.star,.sweep')}
  </style>
  <text x="600" y="58" class="lbl">Certifications and wins</text>
  ${out}
</svg>
`
}

// ---------------------------------------------------------------- LinkedIn button
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
  <rect class="glow" x="14" y="14" width="${W - 28}" height="${H - 28}" rx="28" fill="url(#holo)" filter="url(#g)"/>
  <rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="30" fill="#0E0930" stroke="url(#holo)" stroke-width="2"/>
  <rect x="32" y="24" width="36" height="36" rx="8" fill="#0A66C2"/>
  <text x="50" y="50" style="font:800 21px ${SANS};fill:#fff;text-anchor:middle">in</text>
  <text x="86" y="50" class="t">Connect on LinkedIn</text>
</svg>
`
}

const out = path.join(__dirname, '..', 'assets')
fs.mkdirSync(out, { recursive: true })
for (const old of ['stack.svg']) fs.rmSync(path.join(out, old), { force: true })
const write = (name, s) => { fs.writeFileSync(path.join(out, name), s); console.log(`${name.padEnd(16)} ${(s.length / 1024).toFixed(1)} KB`) }
write('hero.svg', hero())
for (const c of cards) write(`card-${c.id}.svg`, card(c))
write('toolkit.svg', toolkit())
write('creds.svg', creds())
write('linkedin.svg', linkedin())
