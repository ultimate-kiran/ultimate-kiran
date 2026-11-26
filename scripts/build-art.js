// Generates the animated profile SVGs in ../assets.
// GitHub shows SVGs as <img>: CSS and SMIL animation work, scripts and web fonts do not.
// Run: node scripts/build-art.js
const fs = require('node:fs')
const path = require('node:path')

const C = {
  ink: '#0A2342', // blueprint paper
  inkLift: '#0F2D55', // raised plane
  grid: '#1E4A7A',
  chalk: '#E8F1FF',
  steel: '#7FA7D6',
  amber: '#FFB000',
}
const SANS = "'Segoe UI Variable Display','Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif"
const MONO = "'Cascadia Code','Cascadia Mono',Consolas,'SFMono-Regular',Menlo,monospace"
const f = n => Math.round(n * 10) / 10
const pct = n => `${f(n)}%`

// isometric projection
const iso = (ox, oy, s) => (x, y, z = 0) => [ox + (x - y) * s * 0.866, oy + (x + y) * s * 0.5 - z * s]
const pts = list => list.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')

// one isometric box: returns { top, left, right } polygon point strings
const box = (P, x, y, w, d, h) => ({
  top: pts([P(x, y, h), P(x + w, y, h), P(x + w, y + d, h), P(x, y + d, h)]),
  right: pts([P(x + w, y, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x + w, y, h)]),
  left: pts([P(x, y + d, 0), P(x + w, y + d, 0), P(x + w, y + d, h), P(x, y + d, h)]),
})

const blueprintGrid = (w, h) => `
  <defs>
    <pattern id="minor" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M20 0H0V20" fill="none" stroke="${C.grid}" stroke-width="0.6" opacity="0.35"/>
    </pattern>
    <pattern id="major" width="100" height="100" patternUnits="userSpaceOnUse">
      <rect width="100" height="100" fill="url(#minor)"/>
      <path d="M100 0H0V100" fill="none" stroke="${C.grid}" stroke-width="1" opacity="0.6"/>
    </pattern>
    <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
      <stop offset="60%" stop-color="${C.ink}" stop-opacity="0"/>
      <stop offset="100%" stop-color="#051428" stop-opacity="0.85"/>
    </radialGradient>
    <filter id="glow" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="${C.ink}"/>
  <rect width="${w}" height="${h}" fill="url(#major)"/>
  <rect width="${w}" height="${h}" fill="url(#vignette)"/>`

// ---------------------------------------------------------------- hero
function hero () {
  const W = 1200
  const H = 600
  const CYCLE = 12 // seconds per agent run

  // plotter-drawn name: each letter is a set of strokes on a 120-unit cap height
  const letters = [
    { w: 76, d: ['M0 0V120', 'M72 0L4 70', 'M24 48L78 120'] },
    { w: 0, d: ['M0 0V120'] },
    { w: 74, d: ['M0 120V0H44A30 30 0 0 1 44 60H0', 'M36 60L76 120'] },
    { w: 84, d: ['M0 120L42 0L84 120', 'M15 78H69'] },
    { w: 76, d: ['M0 120V0L76 120V0'] },
  ]
  const nameX = 64
  const nameY = 70
  const gap = 38
  let cursor = nameX
  let strokes = ''
  let sparks = ''
  let i = 0
  const strokeCount = letters.reduce((n, l) => n + l.d.length, 0)
  const drawDur = 2.6
  for (const l of letters) {
    for (const d of l.d) {
      const delay = f(0.3 + (i * drawDur) / strokeCount)
      const t = `translate(${cursor} ${nameY})`
      strokes += `<path class="pen" d="${d}" transform="${t}" pathLength="1" style="animation-delay:${delay}s"/>`
      sparks += `<path class="spark" d="${d}" transform="${t}" pathLength="1" style="animation-delay:${delay}s"/>`
      i++
    }
    cursor += l.w + gap
  }
  const nameEnd = cursor - gap
  const capY = nameY
  const baseY = nameY + 120

  // agent graph on an isometric plane
  const P = iso(745, 150, 50)
  const N = {
    start: { x: 0, y: 0, h: 0.35 },
    plan: { x: 2.4, y: 0, h: 0.45 },
    claude: { x: 4.8, y: 0, h: 0.85 },
    tools: { x: 4.8, y: 2.7, h: 0.45 },
    end: { x: 7.2, y: 0, h: 0.35 },
  }
  const S = 1.2 // node footprint
  const center = (n, z = 0) => P(N[n].x + S / 2, N[n].y + S / 2, z)

  // plane + iso grid
  const px0 = -0.5; const px1 = 8.9; const py0 = -0.6; const py1 = 4.2
  let plane = `<polygon points="${pts([P(px0, py0), P(px1, py0), P(px1, py1), P(px0, py1)])}" fill="${C.inkLift}" stroke="${C.grid}" stroke-width="1.2"/>`
  for (let x = px0 + 0.5; x < px1; x += 0.5) {
    plane += `<line x1="${f(P(x, py0)[0])}" y1="${f(P(x, py0)[1])}" x2="${f(P(x, py1)[0])}" y2="${f(P(x, py1)[1])}"/>`
  }
  for (let y = py0 + 0.5; y < py1; y += 0.5) {
    plane += `<line x1="${f(P(px0, y)[0])}" y1="${f(P(px0, y)[1])}" x2="${f(P(px1, y)[0])}" y2="${f(P(px1, y)[1])}"/>`
  }

  // edges on the plane, trimmed to the node footprints
  const edge = (a, b, off = 0) => {
    const ax = N[a].x + S / 2; const ay = N[a].y + S / 2
    const bx = N[b].x + S / 2; const by = N[b].y + S / 2
    const len = Math.hypot(bx - ax, by - ay)
    const ux = (bx - ax) / len; const uy = (by - ay) / len
    const trim = S / 2 + 0.18
    const ox = -uy * off; const oy = ux * off
    const p1 = P(ax + ux * trim + ox, ay + uy * trim + oy)
    const p2 = P(bx - ux * trim + ox, by - uy * trim + oy)
    return `<line x1="${f(p1[0])}" y1="${f(p1[1])}" x2="${f(p2[0])}" y2="${f(p2[1])}" marker-end="url(#arrow)"/>`
  }
  const edges = [
    edge('start', 'plan'), edge('plan', 'claude'), edge('claude', 'end'),
    edge('claude', 'tools', 0.22), edge('tools', 'claude', 0.22),
  ].join('')

  // the run: node visits in order, one hop every STEP seconds
  const route = ['start', 'plan', 'claude', 'tools', 'claude', 'tools', 'claude', 'end']
  const STEP = 1.3
  const arrive = route.map((_, k) => k * STEP)
  const runEnd = arrive[arrive.length - 1]

  // packet path through node centres, keyPoints by cumulative length
  const routePts = route.map(n => center(n, 0.02))
  let total = 0
  const cum = [0]
  for (let k = 1; k < routePts.length; k++) {
    total += Math.hypot(routePts[k][0] - routePts[k - 1][0], routePts[k][1] - routePts[k - 1][1])
    cum.push(total)
  }
  const keyPoints = [...cum.map(c => (c / total).toFixed(4)), '1'].join(';')
  const keyTimes = [...arrive.map(t => (t / CYCLE).toFixed(4)), '1'].join(';')
  const routeD = 'M' + routePts.map(p => `${f(p[0])} ${f(p[1])}`).join('L')

  // node blocks: light up at every arrival
  const drawOrder = ['start', 'plan', 'tools', 'claude', 'end'] // back to front
  let nodes = ''
  let nodeCss = ''
  for (const n of drawOrder) {
    const { x, y, h } = N[n]
    const b = box(P, x, y, S, S, h)
    const visits = arrive.filter((_, k) => route[k] === n).map(t => (t / CYCLE) * 100)
    const frames = ['0%{fill:#143a68;transform:translateY(0)}']
    for (const v of visits) {
      frames.push(`${pct(Math.max(v - 0.4, 0.1))}{fill:#143a68;transform:translateY(0)}`)
      frames.push(`${pct(v + 1.2)}{fill:${C.amber};transform:translateY(-7px)}`)
      frames.push(`${pct(v + 7)}{fill:#143a68;transform:translateY(0)}`)
    }
    frames.push('100%{fill:#143a68;transform:translateY(0)}')
    nodeCss += `@keyframes lit-${n}{${frames.join('')}}`
    nodeCss += `.n-${n} .top{animation:lit-${n} ${CYCLE}s linear infinite}`
    nodeCss += `.n-${n}{animation:lift-${n} ${CYCLE}s linear infinite}`
    nodeCss += `@keyframes lift-${n}{${frames.map(fr => fr.replace(/fill:[^;]+;/, '')).join('')}}`
    const label = P(x + S / 2, y + S / 2, h)
    nodes += `<g class="node n-${n}">
      <polygon class="left" points="${b.left}"/>
      <polygon class="right" points="${b.right}"/>
      <polygon class="top" points="${b.top}"/>
      <text x="${f(label[0])}" y="${f(label[1] - 30)}" class="nlabel">${n}</text>
    </g>`
  }

  // trace log: the run behind npm/cli pull request #10362
  const log = [
    ['start', 'issue: uninstall says "up to date"'],
    ['plan', 'reproduce, find the cause, fix, test'],
    ['claude', 'the reify diff never lists removals'],
    ['tools', 'repro: 4 removed, 0 reported'],
    ['claude', 'report the orphan sweep in the diff'],
    ['tools', 'tests pass, coverage 100%'],
    ['claude', 'write up the change'],
    ['end', 'pull request #10362 opened'],
  ]
  const logX = 64
  const logY = 404
  let logRows = ''
  let logCss = ''
  log.forEach(([who, what], k) => {
    const v = (arrive[k] / CYCLE) * 100
    logCss += `@keyframes row${k}{0%,${pct(Math.max(v - 0.2, 0))}{opacity:0;transform:translateX(-6px)}${pct(v + 2)},93%{opacity:1;transform:translateX(0)}100%{opacity:0}}`
    logCss += `.row${k}{animation:row${k} ${CYCLE}s linear infinite}`
    logRows += `<g class="row row${k}"><text x="${logX}" y="${logY + k * 22}"><tspan class="who">${who.padEnd(7, ' ')}</tspan><tspan>${what}</tspan></text></g>`
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
  <title id="t">Kiran, forward deployed engineer</title>
  <desc id="d">The name Kiran drawn by a plotter on a blueprint, next to an isometric agent graph (start, plan, claude, tools, end) that runs in a loop while a trace log records each step.</desc>
  ${blueprintGrid(W, H)}
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 1L9 5L0 9" fill="none" stroke="${C.steel}" stroke-width="1.6"/>
    </marker>
  </defs>
  <style>
    .guide{stroke:${C.steel};stroke-width:1;stroke-dasharray:2 6;opacity:.55}
    .dim{stroke:${C.steel};stroke-width:1.2;fill:none}
    .dimtext{font:500 17px ${SANS};fill:${C.steel};letter-spacing:.4px}
    .pen{fill:none;stroke:${C.chalk};stroke-width:10;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 1;stroke-dashoffset:0;animation:draw .55s cubic-bezier(.6,.1,.3,1) both}
    .spark{fill:none;stroke:${C.amber};stroke-width:12;stroke-linecap:round;stroke-dasharray:0 1;opacity:0;filter:url(#glow);animation:spark .55s cubic-bezier(.6,.1,.3,1) both}
    @keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
    @keyframes spark{0%{stroke-dasharray:.001 1;stroke-dashoffset:0;opacity:1}99%{stroke-dasharray:.001 1;stroke-dashoffset:-.999;opacity:1}100%{opacity:0}}
    .lede{font:600 27px ${SANS};fill:${C.chalk}}
    .sub{font:400 19px ${SANS};fill:${C.steel}}
    .plane line{stroke:${C.grid};stroke-width:.8;opacity:.7}
    .edges line{stroke:${C.steel};stroke-width:2;stroke-dasharray:6 5;animation:flow 1.2s linear infinite}
    @keyframes flow{to{stroke-dashoffset:-11}}
    .node .left{fill:#0c2748;stroke:${C.steel};stroke-width:1.2}
    .node .right{fill:#11335d;stroke:${C.steel};stroke-width:1.2}
    .node .top{fill:#143a68;stroke:${C.chalk};stroke-width:1.4}
    .nlabel{font:600 16px ${MONO};fill:${C.chalk};text-anchor:middle}
    .row text{font:14.5px ${MONO};fill:${C.chalk}}
    .row .who{fill:${C.amber}}
    .logrule{stroke:${C.grid};stroke-width:1}
    .logtitle{font:600 13px ${MONO};fill:${C.steel}}
    ${nodeCss}
    ${logCss}
    @media (prefers-reduced-motion: reduce){
      .pen,.spark,.edges line,.node,.node .top,.row{animation:none!important}
      .spark{opacity:0}
    }
  </style>

  <!-- drafting guidelines and the plotter-drawn name -->
  <line class="guide" x1="40" y1="${capY}" x2="${nameEnd + 40}" y2="${capY}"/>
  <line class="guide" x1="40" y1="${baseY}" x2="${nameEnd + 40}" y2="${baseY}"/>
  <g>${strokes}${sparks}</g>

  <!-- dimension line under the name carries the role -->
  <g class="dim">
    <path d="M${nameX} ${baseY + 22}V${baseY + 42}M${nameEnd} ${baseY + 22}V${baseY + 42}"/>
    <path d="M${nameX} ${baseY + 32}H${nameX + 36}M${nameEnd - 36} ${baseY + 32}H${nameEnd}"/>
  </g>
  <text class="dimtext" x="${(nameX + nameEnd) / 2}" y="${baseY + 38}" text-anchor="middle">forward deployed engineer</text>

  <text class="lede" x="${nameX}" y="${baseY + 96}">I build AI agents that leave the demo</text>
  <text class="lede" x="${nameX}" y="${baseY + 130}">and ship to production.</text>

  <!-- trace log -->
  <line class="logrule" x1="${logX}" y1="${logY - 28}" x2="${logX + 430}" y2="${logY - 28}"/>
  <text class="logtitle" x="${logX}" y="${logY - 36}">agent run, npm/cli#10362</text>
  ${logRows}

  <!-- isometric agent graph -->
  <g class="plane">${plane}</g>
  <g class="edges">${edges}</g>
  ${nodes}
  <circle r="7" fill="${C.amber}" filter="url(#glow)">
    <animateMotion dur="${CYCLE}s" repeatCount="indefinite" calcMode="linear" keyPoints="${keyPoints}" keyTimes="${keyTimes}" path="${routeD}"/>
    <animate attributeName="opacity" dur="${CYCLE}s" repeatCount="indefinite" values="1;1;0;0" keyTimes="0;${((runEnd + 1.2) / CYCLE).toFixed(3)};${((runEnd + 1.6) / CYCLE).toFixed(3)};1"/>
  </circle>
</svg>
`
}

// ---------------------------------------------------------------- stack
function stack () {
  const W = 1200
  const H = 520
  const P = iso(370, 76, 36)
  const slabW = 5.2; const slabD = 3.4; const slabH = 0.34
  const gapPx = 84
  const layers = [
    { name: 'Claude', what: 'Reasoning, tool use and long context', accent: true },
    { name: 'LangGraph', what: 'Agent loops, shared state, retries, human in the loop' },
    { name: 'LangChain', what: 'Tools, retrievers and model integrations' },
    { name: 'Python, TypeScript, Node.js', face: 'Python, TS, Node', what: 'The services the agents run inside', small: true },
  ]
  // amber bus linking the label dots: requests flow down the stack
  const busX = P(slabW, 0, slabH / 2)[0] + 8
  const busTop = P(slabW, 0, slabH / 2)[1]
  const busBottom = busTop + (layers.length - 1) * gapPx
  let body = ''
  let css = ''
  // draw bottom first so upper slabs cover the beams
  for (let k = layers.length - 1; k >= 0; k--) {
    const L = layers[k]
    const dy = k * gapPx
    const b = box(P, 0, 0, slabW, slabD, slabH)
    const corner = P(slabW, 0, slabH / 2) // right corner, leader start
    const labelX = 720
    // label text on the slab's top face, laid flat in isometric space
    const o = P(0.45, slabD - 0.55, slabH)
    const fontSize = L.small ? 15 : 22
    // the position lives on the outer group; the breathing CSS transform on the inner one
    body += `<g class="slab s${k}" transform="translate(0 ${dy})">
      <g class="breath">
        <polygon class="left" points="${b.left}"/>
        <polygon class="right" points="${b.right}"/>
        <polygon class="top${L.accent ? ' accent' : ''}" points="${b.top}"/>
        <text class="face" font-size="${fontSize}" transform="matrix(0.866 0.5 -0.866 0.5 ${f(o[0])} ${f(o[1])})">${L.face || L.name}</text>
        <path class="leader" d="M${f(corner[0] + 8)} ${f(corner[1])}H${labelX - 22}"/>
        <circle class="dot" cx="${f(corner[0] + 8)}" cy="${f(corner[1])}" r="3.5"/>
      </g>
      <text class="lname" x="${labelX}" y="${f(corner[1] + 2)}">${L.name}</text>
      <text class="lwhat" x="${labelX}" y="${f(corner[1] + 28)}">${L.what}</text>
    </g>`
    const amp = (layers.length - 1 - k) * 4 + 2
    css += `.s${k} .breath{animation:breathe${k} 6s ease-in-out infinite}`
    css += `@keyframes breathe${k}{0%,100%{transform:translateY(0)}50%{transform:translateY(-${amp}px)}}`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
  <title id="t">What I build with</title>
  <desc id="d">An exploded isometric stack: Claude for reasoning, LangGraph for agent loops and state, LangChain for tools and integrations, and Python, TypeScript and Node.js underneath.</desc>
  ${blueprintGrid(W, H)}
  <style>
    .left{fill:#0c2748;stroke:${C.steel};stroke-width:1.2}
    .right{fill:#11335d;stroke:${C.steel};stroke-width:1.2}
    .top{fill:#143a68;stroke:${C.chalk};stroke-width:1.4}
    .top.accent{stroke:${C.amber};stroke-width:2}
    .face{font-family:${SANS};font-weight:700;fill:${C.chalk};opacity:.92}
    .leader{fill:none;stroke:${C.steel};stroke-width:1.2;stroke-dasharray:3 4}
    .dot{fill:${C.amber}}
    .lname{font:700 24px ${SANS};fill:${C.chalk}}
    .lwhat{font:400 17px ${SANS};fill:${C.steel}}
    .beam{stroke:${C.amber};stroke-width:3;stroke-linecap:round;stroke-dasharray:4 10;animation:beam .9s linear infinite}
    .beamglow{stroke:${C.amber};stroke-width:10;opacity:.12}
    @keyframes beam{to{stroke-dashoffset:-14}}
    ${css}
    @media (prefers-reduced-motion: reduce){.breath,.beam{animation:none!important}}
  </style>
  <line class="beamglow" x1="${f(busX)}" y1="${f(busTop - 16)}" x2="${f(busX)}" y2="${f(busBottom)}"/>
  <line class="beam" x1="${f(busX)}" y1="${f(busTop - 16)}" x2="${f(busX)}" y2="${f(busBottom)}"/>
  ${body}
</svg>
`
}

const out = path.join(__dirname, '..', 'assets')
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'hero.svg'), hero())
fs.writeFileSync(path.join(out, 'stack.svg'), stack())
console.log('wrote assets/hero.svg and assets/stack.svg')
