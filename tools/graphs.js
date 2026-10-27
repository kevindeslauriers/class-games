'use strict';
// Draws the economics graphs used by the clue banks, as SVG files in
// class-clues/images/. Curves are plotted from real functions, so every
// number labelled on a graph matches the curves. Run: npm run graphs
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'class-clues', 'images');
const W = 640, H = 450, L = 78, R = 600, T = 30, B = 392;
const COL = { D: '#1f4fd1', S: '#d1342f', MR: '#e07b00', MC: '#111111', ATC: '#1a8f3c', AVC: '#7b3fb5', AFC: '#0f8a8a', soc: '#d1342f', grey: '#666' };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function graph({ xmax, ymax, xlabel, ylabel, curves = [], regions = [], guides = [], points = [], hlines = [], xticks = [], yticks = [], notes = [] }) {
  const X = x => L + (x / xmax) * (R - L);
  const Y = y => B - (y / ymax) * (B - T);
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial, Helvetica, sans-serif">`);
  out.push(`<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="14" fill="#ffffff" stroke="#c9d3ff" stroke-width="2"/>`);
  // Shaded areas, each with a big letter.
  for (const r of regions) {
    out.push(`<polygon points="${r.pts.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ')}" fill="${r.fill || '#fde68a'}" fill-opacity="${r.opacity || 0.75}" stroke="none"/>`);
    if (r.label) {
      const [lx, ly] = r.at || r.pts.reduce(([a, b], [x, y]) => [a + x / r.pts.length, b + y / r.pts.length], [0, 0]);
      out.push(`<text x="${X(lx).toFixed(1)}" y="${(Y(ly) + 7).toFixed(1)}" font-size="${r.size || 22}" font-weight="bold" text-anchor="middle" fill="#111" stroke="#fff" stroke-width="4" paint-order="stroke">${esc(r.label)}</text>`);
    }
  }
  // Dashed guides from a point to the axes.
  const guide = (x, y) => out.push(`<path d="M${X(0)},${Y(y).toFixed(1)} H${X(x).toFixed(1)} V${Y(0)}" fill="none" stroke="#888" stroke-width="1.5" stroke-dasharray="5 5"/>`);
  guides.forEach(([x, y]) => guide(x, y));
  for (const h of hlines) {
    out.push(`<line x1="${X(0)}" y1="${Y(h.y).toFixed(1)}" x2="${X(h.to || xmax).toFixed(1)}" y2="${Y(h.y).toFixed(1)}" stroke="${h.color || '#333'}" stroke-width="${h.width || 3}"${h.dash ? ` stroke-dasharray="${h.dash}"` : ''}/>`);
    if (h.label) {
      const lx = h.labelAt != null ? X(h.labelAt) : X(h.to || xmax) - 4;
      out.push(`<text x="${lx.toFixed(1)}" y="${(Y(h.y) - 8).toFixed(1)}" font-size="17" font-weight="bold" text-anchor="${h.labelAt != null ? 'start' : 'end'}" fill="${h.color || '#333'}" stroke="#fff" stroke-width="5" paint-order="stroke">${esc(h.label)}</text>`);
    }
  }
  // Curves: a function of x, or a list of points.
  for (const c of curves) {
    let pts = c.pts;
    if (!pts) {
      pts = [];
      const [a, b] = c.range || [0, xmax];
      for (let i = 0; i <= 200; i++) { const x = a + (b - a) * i / 200; const y = c.f(x); if (y >= 0 && y <= ymax * 1.02) pts.push([x, y]); }
    }
    out.push(`<polyline points="${pts.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ')}" fill="none" stroke="${c.color}" stroke-width="${c.width || 3.5}" stroke-linejoin="round"${c.dash ? ` stroke-dasharray="${c.dash}"` : ''}/>`);
    if (c.label) {
      const [lx, ly] = c.labelAt || pts[pts.length - 1];
      out.push(`<text x="${(X(lx) + (c.dx || 6)).toFixed(1)}" y="${(Y(ly) + (c.dy || 0)).toFixed(1)}" font-size="18" font-weight="bold" fill="${c.color}" stroke="#fff" stroke-width="5" paint-order="stroke">${esc(c.label)}</text>`);
    }
  }
  for (const p of points) {
    out.push(`<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="6" fill="#111"/>`);
    if (p.label) out.push(`<text x="${(X(p.x) + (p.dx ?? 10)).toFixed(1)}" y="${(Y(p.y) + (p.dy ?? -10)).toFixed(1)}" font-size="20" font-weight="bold" fill="#111" stroke="#fff" stroke-width="5" paint-order="stroke">${esc(p.label)}</text>`);
  }
  // Axes and ticks.
  out.push(`<path d="M${L},${T - 10} V${B} H${R + 14}" fill="none" stroke="#111" stroke-width="2.5"/>`);
  for (const [v, lab] of xticks) out.push(`<line x1="${X(v)}" y1="${B}" x2="${X(v)}" y2="${B + 6}" stroke="#111" stroke-width="2"/><text x="${X(v)}" y="${B + 24}" font-size="16" text-anchor="middle" fill="#111">${esc(lab)}</text>`);
  for (const [v, lab] of yticks) out.push(`<line x1="${L - 6}" y1="${Y(v)}" x2="${L}" y2="${Y(v)}" stroke="#111" stroke-width="2"/><text x="${L - 10}" y="${Y(v) + 5}" font-size="16" text-anchor="end" fill="#111">${esc(lab)}</text>`);
  out.push(`<text x="${(L + R) / 2}" y="${H - 14}" font-size="17" font-weight="bold" text-anchor="middle" fill="#111">${esc(xlabel)}</text>`);
  out.push(`<text x="22" y="${(T + B) / 2}" font-size="17" font-weight="bold" text-anchor="middle" fill="#111" transform="rotate(-90 22 ${(T + B) / 2})">${esc(ylabel)}</text>`);
  for (const n of notes) out.push(`<text x="${X(n.x)}" y="${Y(n.y)}" font-size="${n.size || 16}" font-weight="${n.bold ? 'bold' : 'normal'}" text-anchor="${n.anchor || 'start'}" fill="${n.color || '#111'}">${esc(n.text)}</text>`);
  out.push('</svg>');
  return out.join('\n');
}

const line = (a, m) => x => a + m * x;      // y = a + m x
const $ = n => '$' + n;
const G = {};

// Unit 1: a production possibilities curve.
{
  const ppc = x => 100 * Math.sqrt(Math.max(0, 1 - (x / 100) ** 2));
  G['ppc'] = graph({ xmax: 115, ymax: 115, xlabel: 'Consumer goods', ylabel: 'Capital goods',
    curves: [{ f: ppc, range: [0, 100], color: COL.D, label: 'PPC', labelAt: [72, 72] }],
    points: [{ x: 30, y: 45, label: 'A' }, { x: 60, y: ppc(60), label: 'B' }, { x: 92, y: ppc(92), label: 'C' }, { x: 85, y: 88, label: 'D' }] });
}

// Unit 2: supply and demand.
{
  const D = line(20, -0.1), S = line(6, 0.075);
  G['surplus'] = graph({ xmax: 130, ymax: 22, xlabel: 'Quantity', ylabel: 'Price ($)',
    regions: [{ pts: [[0, 20], [0, 12], [80, 12]], label: 'A', fill: '#bfdbfe' }, { pts: [[0, 12], [0, 6], [80, 12]], label: 'B', fill: '#fecaca' }],
    guides: [[80, 12]],
    curves: [{ f: D, range: [0, 130], color: COL.D, label: 'D', labelAt: [124, D(124)], dy: -10 }, { f: S, range: [0, 130], color: COL.S, label: 'S', labelAt: [124, S(124)], dx: 4, dy: 18 }],
    xticks: [[80, '80']], yticks: [[20, '20'], [12, '12'], [6, '6']] });
  G['ceiling'] = graph({ xmax: 130, ymax: 22, xlabel: 'Quantity', ylabel: 'Price ($)',
    guides: [[80, 12], [40, 9], [110, 9]],
    hlines: [{ y: 9, color: '#111', label: 'Price ceiling', width: 3, to: 128, labelAt: 4 }],
    curves: [{ f: D, range: [0, 130], color: COL.D, label: 'D', labelAt: [124, D(124)], dy: -10 }, { f: S, range: [0, 130], color: COL.S, label: 'S', labelAt: [124, S(124)], dx: 4, dy: 18 }],
    xticks: [[40, '40'], [80, '80'], [110, '110']], yticks: [[20, '20'], [12, '12'], [9, '9'], [6, '6']] });
}
{
  // A $4 per-unit tax on sellers: S shifts up to S + tax.
  const D = line(20, -0.1), S = line(4, 0.1), St = line(8, 0.1);
  G['tax'] = graph({ xmax: 130, ymax: 22, xlabel: 'Quantity', ylabel: 'Price ($)',
    regions: [
      { pts: [[0, 20], [0, 14], [60, 14]], label: 'A', fill: '#bfdbfe' },
      { pts: [[0, 14], [60, 14], [60, 12], [0, 12]], label: 'B', fill: '#fde68a', size: 18, at: [20, 12.85] },
      { pts: [[60, 14], [80, 12], [60, 12]], label: 'C', fill: '#c4b5fd', size: 17, at: [66.5, 12.55] },
      { pts: [[0, 12], [60, 12], [60, 10], [0, 10]], label: 'D', fill: '#fde68a', size: 18, at: [20, 10.85] },
      { pts: [[60, 12], [80, 12], [60, 10]], label: 'E', fill: '#c4b5fd', size: 17, at: [66.5, 11.1] },
      { pts: [[0, 10], [60, 10], [0, 4]], label: 'F', fill: '#fecaca' }],
    guides: [[60, 14], [60, 10], [80, 12]],
    curves: [{ f: D, range: [0, 130], color: COL.D, label: 'D', labelAt: [124, D(124)], dy: -10 },
      { f: S, range: [0, 130], color: COL.S, label: 'S', labelAt: [124, S(124)], dx: 4, dy: 18 },
      { f: St, range: [0, 125], color: COL.S, dash: '9 6', label: 'S + tax', labelAt: [110, St(110)], dx: -70, dy: -6 }],
    xticks: [[60, '60'], [80, '80']], yticks: [[20, '20'], [14, '14'], [12, '12'], [10, '10'], [4, '4']] });
}
{
  // Price elasticity along a straight-line demand curve.
  const D = line(10, -0.1);
  G['elasticity'] = graph({ xmax: 110, ymax: 11, xlabel: 'Quantity', ylabel: 'Price ($)',
    curves: [{ f: D, range: [0, 100], color: COL.D, label: 'D', labelAt: [96, D(96)], dy: -8 }],
    points: [{ x: 20, y: D(20), label: 'X' }, { x: 50, y: D(50), label: 'Y' }, { x: 80, y: D(80), label: 'Z' }],
    guides: [[50, 5]], xticks: [[50, '50'], [100, '100']], yticks: [[10, '10'], [5, '5']] });
}
{
  // An increase in demand.
  const S = line(2, 0.08), D1 = line(14, -0.08), D2 = line(18, -0.08);
  G['demand-shift'] = graph({ xmax: 200, ymax: 20, xlabel: 'Quantity', ylabel: 'Price',
    guides: [[75, 8], [100, 10]],
    curves: [{ f: S, range: [0, 200], color: COL.S, label: 'S', labelAt: [190, S(190)], dx: -24 },
      { f: D1, range: [0, 165], color: COL.D, label: 'D₁', labelAt: [160, D1(160)], dy: -6 },
      { f: D2, range: [0, 200], color: COL.D, dash: '9 6', label: 'D₂', labelAt: [195, D2(195)], dx: -18, dy: -10 }],
    points: [{ x: 75, y: 8 }, { x: 100, y: 10 }],
    xticks: [[75, 'Q₁'], [100, 'Q₂']], yticks: [[8, 'P₁'], [10, 'P₂']] });
}
{
  // A minimum wage above equilibrium in a labour market.
  const Ld = line(30, -0.2), Ls = line(6, 0.2);
  G['min-wage'] = graph({ xmax: 140, ymax: 32, xlabel: 'Quantity of labour (workers)', ylabel: 'Wage ($ per hour)',
    guides: [[60, 18], [40, 22], [80, 22]],
    hlines: [{ y: 22, color: '#111', label: 'Minimum wage', to: 130 }],
    curves: [{ f: Ld, range: [0, 140], color: COL.D, label: 'Demand', labelAt: [120, Ld(120)], dy: -8, dx: -20 },
      { f: Ls, range: [0, 125], color: COL.S, label: 'Supply', labelAt: [120, Ls(120)], dx: -70, dy: -6 }],
    xticks: [[40, '40'], [60, '60'], [80, '80']], yticks: [[22, '22'], [18, '18']] });
}

// Unit 3: costs and perfect competition.
// One cost function gives every curve: VC = q * AVC, so MC = AVC + q * AVC'
// passes through the minimums of AVC and ATC, and AFC = FC / q only falls.
function costs(fc) {
  const AVC = q => 4 + 0.0025 * (q - 30) ** 2;
  const MC = q => AVC(q) + 0.005 * q * (q - 30);
  const AFC = q => fc / q;
  return { AVC, MC, AFC, ATC: q => AVC(q) + AFC(q) };
}
// A U-shaped curve with its minimum at (q0, m): m + s (q - q0)^2.
const U = (q0, m, s) => q => m + s * (q - q0) ** 2;
{
  // P = MR = $10; MC = 10 at q = 50, where ATC = 7 and AVC = 5 (fixed cost $100).
  const { AVC, MC, ATC } = costs(100);
  G['pc-firm'] = graph({ xmax: 80, ymax: 14, xlabel: 'Quantity (units)', ylabel: 'Price and cost ($)',
    regions: [{ pts: [[0, 10], [50, 10], [50, 7], [0, 7]], fill: '#bbf7d0', opacity: 0.8 }],
    guides: [[50, 10], [50, 7], [50, 5]],
    hlines: [{ y: 10, color: COL.MR, label: 'P = MR', to: 78, labelAt: 58 }],
    curves: [{ f: MC, range: [5, 58], color: COL.MC, label: 'MC', labelAt: [58, MC(58)], dx: 4, dy: 4 },
      { f: ATC, range: [12, 72], color: COL.ATC, label: 'ATC', labelAt: [12, ATC(12)], dx: 8, dy: 4 },
      { f: AVC, range: [4, 74], color: COL.AVC, label: 'AVC', labelAt: [74, AVC(74)], dx: 6, dy: 8 }],
    points: [{ x: 50, y: 10 }, { x: 50, y: 7 }, { x: 50, y: 5 }],
    xticks: [[50, '50']], yticks: [[10, '10'], [7, '7'], [5, '5']] });
}
{
  // Which curve is which: MC (1), ATC (2), AVC (3), AFC (4).
  const { AVC, MC, ATC, AFC } = costs(60);
  G['cost-curves'] = graph({ xmax: 84, ymax: 14, xlabel: 'Quantity', ylabel: 'Cost ($)',
    curves: [{ f: MC, range: [4, 60], color: COL.MC, label: '1', labelAt: [60, MC(60)], dx: 6 },
      { f: ATC, range: [6, 78], color: COL.ATC, label: '2', labelAt: [78, ATC(78)], dx: 6 },
      { f: AVC, range: [2, 78], color: COL.AVC, label: '3', labelAt: [78, AVC(78)], dx: 6 },
      { f: AFC, range: [5, 78], color: COL.AFC, label: '4', labelAt: [78, AFC(78)], dx: 6 }] });
}

// Unit 4: imperfect competition.
{
  // Monopoly: D: P = 100 - Q, MR = 100 - 2Q, MC = 10 + Q, ATC minimum 50 at Q = 40.
  const D = line(100, -1), MR = line(100, -2), MC = line(10, 1), ATC = U(40, 50, 0.02);
  G['monopoly'] = graph({ xmax: 105, ymax: 110, xlabel: 'Quantity', ylabel: 'Price and cost ($)',
    regions: [{ pts: [[0, 70], [30, 70], [30, 52], [0, 52]], fill: '#bbf7d0', opacity: 0.8 }],
    guides: [[30, 70], [30, 52], [30, 40], [45, 55], [50, 50]],
    curves: [{ f: D, range: [0, 100], color: COL.D, label: 'D', labelAt: [96, D(96)], dy: -8 },
      { f: MR, range: [0, 50], color: COL.MR, label: 'MR', labelAt: [50, 0], dx: 6, dy: -6 },
      { f: MC, range: [0, 90], color: COL.MC, label: 'MC', labelAt: [90, MC(90)], dx: -10, dy: -10 },
      { f: ATC, range: [8, 80], color: COL.ATC, label: 'ATC', labelAt: [80, ATC(80)], dx: 6 }],
    points: [{ x: 30, y: 70 }, { x: 30, y: 40 }, { x: 45, y: 55 }],
    xticks: [[30, '30'], [45, '45'], [50, '50'], [100, '100']], yticks: [[100, '100'], [70, '70'], [52, '52'], [40, '40']] });
}
{
  // Monopolistic competition in long-run equilibrium: demand tangent to ATC.
  const ATC = U(60, 30, 0.02), D = line(70, -0.8), MR = line(70, -1.6), MC = line(6 - 1.2 * 40, 1.2);
  G['monopolistic-competition'] = graph({ xmax: 100, ymax: 75, xlabel: 'Quantity', ylabel: 'Price and cost ($)',
    guides: [[40, 38], [60, 30]],
    curves: [{ f: D, range: [0, 85], color: COL.D, label: 'D', labelAt: [85, D(85)], dy: -6 },
      { f: MR, range: [0, 43], color: COL.MR, label: 'MR', labelAt: [43, MR(43)], dx: 6 },
      { f: MC, range: [36, 88], color: COL.MC, label: 'MC', labelAt: [84, MC(84)], dx: 10, dy: 6 },
      { f: ATC, range: [18, 98], color: COL.ATC, label: 'ATC', labelAt: [98, ATC(98)], dx: 4, dy: 18 }],
    points: [{ x: 40, y: 38 }, { x: 60, y: 30 }],
    xticks: [[40, 'Q₁'], [60, 'Q₂']], yticks: [[38, 'P₁']] });
}

// Unit 5: a monopsony labour market.
{
  const S = line(5, 0.5), MFC = line(5, 1), MRP = line(35, -0.5);
  G['monopsony'] = graph({ xmax: 62, ymax: 40, xlabel: 'Quantity of labour (workers)', ylabel: 'Wage ($)',
    guides: [[20, 25], [20, 15], [30, 20]],
    curves: [{ f: S, range: [0, 60], color: COL.S, label: 'S', labelAt: [60, S(60)], dx: -18, dy: -10 },
      { f: MFC, range: [0, 34], color: COL.MR, label: 'MFC', labelAt: [34, MFC(34)], dx: 6 },
      { f: MRP, range: [0, 62], color: COL.D, label: 'MRP = D', labelAt: [56, MRP(56)], dx: -40, dy: -12 }],
    points: [{ x: 20, y: 25 }, { x: 20, y: 15 }, { x: 30, y: 20 }],
    xticks: [[20, '20'], [30, '30']], yticks: [[25, '25'], [20, '20'], [15, '15'], [5, '5']] });
}

// Unit 6: externalities and inequality.
{
  const D = line(100, -1), MPC = line(10, 1), MSC = line(30, 1);
  G['negative-externality'] = graph({ xmax: 100, ymax: 110, xlabel: 'Quantity', ylabel: 'Price ($)',
    guides: [[45, 55], [35, 65]],
    curves: [{ f: D, range: [0, 95], color: COL.D, label: 'D = MSB', labelAt: [80, D(80)], dy: -12, dx: -6 },
      { f: MPC, range: [0, 85], color: COL.S, label: 'MPC = S', labelAt: [80, MPC(80)], dx: 8, dy: 8 },
      { f: MSC, range: [0, 75], color: COL.soc, dash: '9 6', label: 'MSC', labelAt: [75, MSC(75)], dx: 8 }],
    points: [{ x: 45, y: 55 }, { x: 35, y: 65 }],
    xticks: [[35, '35'], [45, '45']], yticks: [[65, '65'], [55, '55']] });
}
{
  const MPB = line(80, -1), MSB = line(100, -1), S = line(20, 1);
  G['positive-externality'] = graph({ xmax: 100, ymax: 110, xlabel: 'Quantity', ylabel: 'Price ($)',
    guides: [[30, 50], [40, 60]],
    curves: [{ f: MPB, range: [0, 80], color: COL.D, label: 'MPB = D', labelAt: [50, MPB(50)], dy: 26, dx: 14 },
      { f: MSB, range: [0, 95], color: COL.D, dash: '9 6', label: 'MSB', labelAt: [88, MSB(88)], dy: -8 },
      { f: S, range: [0, 82], color: COL.S, label: 'S = MSC', labelAt: [82, S(82)], dx: -86, dy: -8 }],
    points: [{ x: 30, y: 50 }, { x: 40, y: 60 }],
    xticks: [[30, '30'], [40, '40']], yticks: [[60, '60'], [50, '50']] });
}
{
  const A = x => 100 * (x / 100) ** 1.6, Bc = x => 100 * (x / 100) ** 3.2;
  G['lorenz'] = graph({ xmax: 110, ymax: 110, xlabel: 'Cumulative % of households', ylabel: 'Cumulative % of income',
    curves: [{ f: x => x, range: [0, 100], color: '#555', width: 2.5, label: 'Equality', labelAt: [55, 58], dx: -88, dy: -6 },
      { f: A, range: [0, 100], color: COL.D, label: 'Curve A', labelAt: [28, A(28)], dx: 0, dy: -22 },
      { f: Bc, range: [0, 100], color: COL.S, label: 'Curve B', labelAt: [78, Bc(78)], dx: 12, dy: 14 }],
    xticks: [[50, '50'], [100, '100']], yticks: [[50, '50'], [100, '100']] });
}

// A payoff matrix for game theory (not a graph, but drawn the same way).
function matrix({ rowName, colName, rows, cols, cells }) {
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial, Helvetica, sans-serif">`,
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="14" fill="#ffffff" stroke="#c9d3ff" stroke-width="2"/>`];
  const x0 = 230, y0 = 120, cw = 180, ch = 110;
  out.push(`<text x="${x0 + cw}" y="50" font-size="22" font-weight="bold" text-anchor="middle" fill="#d1342f">${esc(colName)}</text>`);
  out.push(`<text x="70" y="${y0 + ch}" font-size="22" font-weight="bold" text-anchor="middle" fill="#1f4fd1" transform="rotate(-90 70 ${y0 + ch})">${esc(rowName)}</text>`);
  cols.forEach((c, j) => out.push(`<text x="${x0 + cw * j + cw / 2}" y="${y0 - 16}" font-size="19" font-weight="bold" text-anchor="middle" fill="#d1342f">${esc(c)}</text>`));
  rows.forEach((r, i) => out.push(`<text x="${x0 - 14}" y="${y0 + ch * i + ch / 2 + 7}" font-size="19" font-weight="bold" text-anchor="end" fill="#1f4fd1">${esc(r)}</text>`));
  cells.forEach((row, i) => row.forEach(([a, b], j) => {
    out.push(`<rect x="${x0 + cw * j}" y="${y0 + ch * i}" width="${cw}" height="${ch}" fill="#f8fafc" stroke="#111" stroke-width="2.5"/>`);
    out.push(`<text x="${x0 + cw * j + cw / 2}" y="${y0 + ch * i + ch / 2 + 10}" font-size="28" font-weight="bold" text-anchor="middle"><tspan fill="#1f4fd1">${$(a)}</tspan><tspan fill="#111">, </tspan><tspan fill="#d1342f">${$(b)}</tspan></text>`);
  }));
  out.push(`<text x="${W / 2}" y="${H - 28}" font-size="16" text-anchor="middle" fill="#333">Payoffs: (${esc(rowName)}, ${esc(colName)}) profits</text>`);
  out.push('</svg>');
  return out.join('\n');
}
G['payoff-matrix'] = matrix({ rowName: 'Firm A', colName: 'Firm B', rows: ['Advertise', 'Don’t'], cols: ['Advertise', 'Don’t'],
  cells: [[[40, 30], [70, 20]], [[30, 60], [50, 50]]] });


/* ---------- MDM4U: Data Management ---------- */
const svgOpen = () => [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial, Helvetica, sans-serif">`,
  `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="14" fill="#ffffff" stroke="#c9d3ff" stroke-width="2"/>`];
const txt = (x, y, t, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 18}" font-weight="${o.bold === false ? 'normal' : 'bold'}" text-anchor="${o.anchor || 'middle'}" fill="${o.color || '#111'}"${o.halo ? ' stroke="#fff" stroke-width="5" paint-order="stroke"' : ''}>${esc(t)}</text>`;

// A normal curve with mean 70 and standard deviation 5, plotted as x - 50.
{
  const bell = x => 100 * Math.exp(-((((x + 50) - 70) / 5) ** 2) / 2);
  const ticks = [55, 60, 65, 70, 75, 80, 85].map(v => [v - 50, String(v)]);
  const under = (a, b) => { const pts = [[a - 50, 0]]; for (let i = 0; i <= 60; i++) { const x = a - 50 + (b - a) * i / 60; pts.push([x, bell(x)]); } pts.push([b - 50, 0]); return pts; };
  G['normal-rule'] = graph({ xmax: 40, ymax: 118, xlabel: 'Test score (mean 70, standard deviation 5)', ylabel: '',
    regions: [{ pts: under(55, 85), fill: '#dbeafe', opacity: 1 }, { pts: under(60, 80), fill: '#93c5fd', opacity: 1 }, { pts: under(65, 75), fill: '#3b82f6', opacity: 0.85, label: 'A', at: [20, 40] },
      { pts: under(75, 80), fill: '#93c5fd', opacity: 0, label: 'B', at: [27.5, 18], size: 20 }, { pts: under(80, 85), fill: '#dbeafe', opacity: 0, label: 'C', at: [32.4, 9], size: 18 }],
    curves: [{ f: bell, range: [3, 37], color: '#111', width: 3 }],
    xticks: ticks });
  G['normal-shade'] = graph({ xmax: 40, ymax: 118, xlabel: 'Test score (mean 70, standard deviation 5)', ylabel: '',
    regions: [{ pts: under(65, 80), fill: '#fbbf24', opacity: 0.85 }],
    curves: [{ f: bell, range: [3, 37], color: '#111', width: 3 }],
    xticks: ticks });
}

// Four scatter plots, A to D, for matching correlation coefficients.
{
  const out = svgOpen();
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const panels = [
    { label: 'A', f: x => x, noise: 0.06 },
    { label: 'B', f: x => 0.85 - 0.5 * x, noise: 0.22 },
    { label: 'C', f: () => 0.5, noise: 0.45 },
    { label: 'D', f: x => 1 - x, noise: 0.05 }];
  panels.forEach((pn, i) => {
    const x0 = 30 + (i % 2) * 300, y0 = 22 + Math.floor(i / 2) * 212, w = 280, h = 190;
    out.push(`<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5" rx="8"/>`);
    out.push(txt(x0 + w - 22, y0 + 32, pn.label, { size: 26 }));
    out.push(`<path d="M${x0 + 30},${y0 + 15} V${y0 + h - 20} H${x0 + w - 12}" fill="none" stroke="#111" stroke-width="2"/>`);
    for (let k = 0; k < 22; k++) {
      const x = 0.05 + 0.9 * rnd(); let y = pn.f(x) + (rnd() - 0.5) * 2 * pn.noise; y = Math.max(0.03, Math.min(0.97, y));
      out.push(`<circle cx="${(x0 + 38 + x * (w - 56)).toFixed(1)}" cy="${(y0 + h - 26 - y * (h - 50)).toFixed(1)}" r="5" fill="#1f4fd1"/>`);
    }
  });
  out.push('</svg>');
  G['scatter-four'] = out.join('\n');
}

// Hours studied and test marks, with a line of best fit: mark = 5(hours) + 50.
{
  const pts = [[1, 57], [2, 58], [2, 62], [3, 63], [4, 72], [4, 68], [5, 73], [6, 82], [7, 83], [8, 88]];
  G['best-fit'] = graph({ xmax: 10.5, ymax: 105, xlabel: 'Hours studied', ylabel: 'Test mark (%)',
    curves: [{ f: x => 5 * x + 50, range: [0, 10], color: COL.S, width: 3, label: 'mark = 5h + 50', labelAt: [6.2, 81], dx: -165, dy: -14 }],
    points: pts.map(([x, y]) => ({ x, y })),
    xticks: [0, 2, 4, 6, 8, 10].map(v => [v, String(v)]), yticks: [50, 60, 70, 80, 90, 100].map(v => [v, String(v)]) });
}

// A box plot: min 12, Q1 20, median 26, Q3 34, max 45.
{
  const out = svgOpen();
  const X = v => 70 + (v - 10) * (500 / 40), y = 190;
  out.push(`<line x1="${X(12)}" y1="${y}" x2="${X(20)}" y2="${y}" stroke="#111" stroke-width="3"/><line x1="${X(34)}" y1="${y}" x2="${X(45)}" y2="${y}" stroke="#111" stroke-width="3"/>`);
  out.push(`<rect x="${X(20)}" y="${y - 55}" width="${X(34) - X(20)}" height="110" fill="#bfdbfe" stroke="#111" stroke-width="3"/>`);
  out.push(`<line x1="${X(26)}" y1="${y - 55}" x2="${X(26)}" y2="${y + 55}" stroke="#d1342f" stroke-width="4"/>`);
  [12, 45].forEach(v => out.push(`<line x1="${X(v)}" y1="${y - 25}" x2="${X(v)}" y2="${y + 25}" stroke="#111" stroke-width="3"/>`));
  out.push(`<line x1="${X(10)}" y1="330" x2="${X(50)}" y2="330" stroke="#111" stroke-width="2.5"/>`);
  for (let v = 10; v <= 50; v += 5) out.push(`<line x1="${X(v)}" y1="330" x2="${X(v)}" y2="338" stroke="#111" stroke-width="2"/>` + txt(X(v), 358, String(v), { size: 16, bold: false }));
  out.push(txt(W / 2, 400, 'Minutes spent on homework', { size: 17 }));
  out.push('</svg>');
  G['box-plot'] = out.join('\n');
}

// Three histograms: skewed left, symmetric, skewed right.
{
  const out = svgOpen();
  const shapes = { A: [1, 1, 2, 3, 5, 8, 9], B: [1, 3, 6, 8, 6, 3, 1], C: [9, 8, 5, 3, 2, 1, 1] };
  Object.entries(shapes).forEach(([lab, bars], i) => {
    const x0 = 30 + i * 200, base = 360, bw = 24;
    out.push(txt(x0 + 90, 70, lab, { size: 26 }));
    bars.forEach((b, k) => out.push(`<rect x="${x0 + 6 + k * bw}" y="${base - b * 28}" width="${bw - 2}" height="${b * 28}" fill="#93c5fd" stroke="#1f4fd1" stroke-width="1.5"/>`));
    out.push(`<line x1="${x0}" y1="${base}" x2="${x0 + 180}" y2="${base}" stroke="#111" stroke-width="2.5"/>`);
  });
  out.push('</svg>');
  G['histograms'] = out.join('\n');
}

// A Venn diagram for a class of 30: hockey and soccer.
{
  const out = svgOpen();
  out.push(`<rect x="40" y="40" width="560" height="360" rx="10" fill="#f8fafc" stroke="#111" stroke-width="2.5"/>`);
  out.push(txt(64, 384, 'Class of 30 students', { size: 17, anchor: 'start', bold: false }));
  out.push(`<circle cx="250" cy="225" r="130" fill="#1f4fd1" fill-opacity="0.22" stroke="#1f4fd1" stroke-width="3"/>`);
  out.push(`<circle cx="390" cy="225" r="130" fill="#d1342f" fill-opacity="0.22" stroke="#d1342f" stroke-width="3"/>`);
  out.push(txt(180, 84, 'Hockey', { color: '#1f4fd1', size: 20, halo: true }), txt(460, 84, 'Soccer', { color: '#d1342f', size: 20, halo: true }));
  out.push(txt(190, 235, '12', { size: 34 }), txt(320, 235, '8', { size: 34 }), txt(450, 235, '6', { size: 34 }), txt(560, 380, '4', { size: 30 }));
  out.push('</svg>');
  G['venn'] = out.join('\n');
}

// A tree diagram: two marbles drawn without replacement from 3 red and 2 blue.
{
  const out = svgOpen();
  const line = (x1, y1, x2, y2) => out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111" stroke-width="2.5"/>`);
  const node = (x, y, t, c) => out.push(`<circle cx="${x}" cy="${y}" r="22" fill="${c}"/>` + txt(x, y + 7, t, { color: '#fff', size: 20 }));
  const lab = (x, y, t) => out.push(txt(x, y, t, { size: 19, halo: true }));
  const R = '#d1342f', B = '#1f4fd1';
  line(60, 225, 250, 125); line(60, 225, 250, 325);
  line(272, 125, 470, 70); line(272, 125, 470, 180); line(272, 325, 470, 270); line(272, 325, 470, 380);
  out.push(`<circle cx="60" cy="225" r="8" fill="#111"/>`);
  node(272, 125, 'R', R); node(272, 325, 'B', B);
  node(492, 70, 'R', R); node(492, 180, 'B', B); node(492, 270, 'R', R); node(492, 380, 'B', B);
  lab(150, 155, '3/5'); lab(150, 305, '2/5'); lab(370, 82, '2/4'); lab(370, 170, '2/4'); lab(370, 282, '3/4'); lab(370, 370, '1/4');
  out.push(txt(272, 40, '1st draw', { size: 17, bold: false }), txt(492, 30, '2nd draw', { size: 17, bold: false }));
  out.push(txt(320, 432, '3 red and 2 blue marbles; draw two without replacement', { size: 15, bold: false }));
  out.push('</svg>');
  G['tree'] = out.join('\n');
}

// Pascal's triangle, rows 0 to 7, with one entry hidden.
{
  const out = svgOpen();
  const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - i + 1) / i; return r; };
  for (let n = 0; n <= 7; n++) {
    out.push(txt(40, 52 + n * 50, `row ${n}`, { size: 14, bold: false, anchor: 'start', color: '#555' }));
    for (let k = 0; k <= n; k++) {
      const x = 340 + (k - n / 2) * 66, y = 50 + n * 50;
      const hide = n === 6 && k === 2;
      out.push(`<circle cx="${x}" cy="${y - 7}" r="21" fill="${hide ? '#fde68a' : '#eef2ff'}" stroke="${hide ? '#b45309' : '#94a3b8'}" stroke-width="2"/>`);
      out.push(txt(x, y, hide ? '?' : String(C(n, k)), { size: 18 }));
    }
  }
  out.push('</svg>');
  G['pascal'] = out.join('\n');
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, svg] of Object.entries(G)) fs.writeFileSync(path.join(OUT, name + '.svg'), svg + '\n');
console.log(`Wrote ${Object.keys(G).length} graphs to ${path.relative(process.cwd(), OUT)}`);
