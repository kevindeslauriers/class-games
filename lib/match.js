'use strict';
// Forgiving answer matching: "The Puppies!" and "puppy" match, and small typos are fine.

const STOP = new Set(['A', 'AN', 'THE', 'SOME', 'MY', 'YOUR', 'HIS', 'HER', 'THEIR', 'OUR']);

function singular(w) {
  if (w.length > 4 && w.endsWith('IES')) return w.slice(0, -3) + 'Y';
  if (w.length > 4 && /(SS|SH|CH|X|Z)ES$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('S') && !w.endsWith('SS') && !w.endsWith('US')) return w.slice(0, -1);
  return w;
}

// "The Puppies!" and "puppy" both become "PUPPY".
function normalize(s) {
  const words = String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/&/g, ' AND ').replace(/['’]/g, '').replace(/[^A-Z0-9]+/g, ' ')
    .trim().split(' ').filter(Boolean);
  while (words.length > 1 && STOP.has(words[0])) words.shift();
  return words.map(singular).join(' ');
}

function distance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

const hasWords = (hay, needle) => (' ' + hay + ' ').includes(' ' + needle + ' ');

// Which answer (index) a typed guess matches, or -1. Exact matches win over
// typos, and typos over partial matches like "towel" for "BEACH TOWEL".
function matchAnswer(typed, answers) {
  const t = normalize(typed);
  if (!t) return -1;
  const tiers = [[], [], []];
  answers.forEach((a, i) => {
    let best = 3;
    for (const k of a.keys) {
      if (k === t) best = 0;
      else if (best > 1 && k.length >= 5 && distance(k, t) <= (k.length >= 9 ? 2 : 1)) best = 1;
      else if (best > 2 && ((k.length >= 4 && hasWords(t, k)) || (t.length >= 4 && hasWords(k, t)))) best = 2;
    }
    if (best < 3) tiers[best].push(i);
  });
  for (const tier of tiers) if (tier.length) return tier[0];
  return -1;
}

// "What is a cow?" -> "a cow"
const stripQuestion = s => String(s || '').replace(/^\s*(what|who|where|when)\s*('?s|\s+is|\s+are|\s+was|\s+were)\s+/i, '');

module.exports = { matchAnswer, normalize, stripQuestion };
