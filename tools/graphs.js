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

fs.mkdirSync(OUT, { recursive: true });
for (const [name, svg] of Object.entries(G)) fs.writeFileSync(path.join(OUT, name + '.svg'), svg + '\n');
console.log(`Wrote ${Object.keys(G).length} graphs to ${path.relative(process.cwd(), OUT)}`);
