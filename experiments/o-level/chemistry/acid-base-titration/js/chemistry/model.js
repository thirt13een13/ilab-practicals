export const ACIDS = {
  hcl:     { name: 'Hydrochloric acid', formula: 'HCl',      strong: true,  basicity: 1 },
  hno3:    { name: 'Nitric acid',       formula: 'HNO₃',     strong: true,  basicity: 1 },
  h2so4:   { name: 'Sulfuric acid',     formula: 'H₂SO₄',    strong: true,  basicity: 2 },
  ch3cooh: { name: 'Acetic acid',       formula: 'CH₃COOH',  strong: false, basicity: 1, pKa: 4.76 },
  h3po4:   { name: 'Phosphoric acid',   formula: 'H₃PO₄',    strong: false, basicity: 1, pKa: 2.15 },
};

export const BASES = {
  naoh:   { name: 'Sodium hydroxide',    formula: 'NaOH',      strong: true,  acidity: 1 },
  koh:    { name: 'Potassium hydroxide', formula: 'KOH',       strong: true,  acidity: 1 },
  caoh2:  { name: 'Calcium hydroxide',   formula: 'Ca(OH)₂',   strong: true,  acidity: 2 },
  nh3:    { name: 'Ammonia solution',    formula: 'NH₃',       strong: false, acidity: 1, pKb: 4.75 },
};

export const INDICATORS = {
  phenolphthalein: {
    name: 'Phenolphthalein', range: [8.2, 10],
    colorAcid:    'rgba(214,234,246,0.30)',
    colorBase:    'rgba(220,55,130,0.92)',
    colorNeutral: 'rgba(230,80,150,0.58)', // visible pale pink at equivalence point
  },
  methylorange: {
    name: 'Methyl orange', range: [3.1, 4.4],
    colorAcid:    'rgba(217,77,58,0.78)',
    colorBase:    'rgba(247,196,56,0.72)',
    colorNeutral: 'rgba(230,130,50,0.76)',  // orange at equivalence
  },
};

export const COLOR_LIQUID_NEUTRAL = 'rgba(214,234,246,0.35)';

export function estimateEquivalencePh(acid, base) {
  if (acid.strong && base.strong)   return 7.0;
  if (!acid.strong && base.strong)  return 8.8;
  if (acid.strong && !base.strong)  return 5.3;
  return null;
}

export function judgeIndicatorFit(acid, base, indicatorKey) {
  const ind = INDICATORS[indicatorKey];
  const eqPh = estimateEquivalencePh(acid, base);
  if (eqPh === null) {
    return { ok: false, severity: 'warn',
      msg: 'Weak acid + weak base gives no sharp endpoint with any indicator — the colour change will be gradual and the reading unreliable, just as in a real lab.' };
  }
  const [lo, hi] = ind.range;
  const within = eqPh >= lo - 2.0 && eqPh <= hi + 2.0;
  if (within) {
    return { ok: true, severity: 'good',
      msg: `${ind.name} is a good choice here — its colour-change range (pH ${lo}–${hi}) brackets the expected equivalence point (pH ≈ ${eqPh.toFixed(1)}).` };
  }
  return { ok: false, severity: 'warn',
    msg: `${ind.name} (pH ${lo}–${hi}) will change colour well before or after the true equivalence point (pH ≈ ${eqPh.toFixed(1)}) — expect an inaccurate titre with this combination.` };
}

// Receives state and the active indicator object as arguments so this stays pure.
// Three-phase colour model:
//   1. Pre-endpoint  : analyte colour → colorNeutral as titrant is added
//   2. At endpoint   : colorNeutral (orange for MO; near-colourless for phenolphthalein)
//   3. Post-endpoint : colorNeutral → titrant colour as excess accumulates
export function flaskColor(state, ind) {
  if (!state.flaskHasIndicator || !state.flaskHasBase) return COLOR_LIQUID_NEUTRAL;

  // Which side of the indicator scale the analyte and titrant sit on.
  const analyteColor = state.buretteRole === 'acid' ? ind.colorBase : ind.colorAcid;
  const titrantColor = state.buretteRole === 'acid' ? ind.colorAcid : ind.colorBase;

  const totalEq = state.flaskEqBase;
  const addedEq = state.flaskEqAcidAdded;

  if (totalEq <= 0) return ind.colorNeutral;

  if (!state.flaskNeutralized) {
    // fracRemaining: 1 at start → 0 at endpoint
    const fracRemaining = Math.max(0, Math.min(1, (totalEq - addedEq) / totalEq));
    return mixRgba(ind.colorNeutral, analyteColor, fracRemaining);
  }

  // Post-endpoint: excess titrant drives the solution into the titrant's pH territory.
  // Full colour shift is reached at ~25 % excess equivalents.
  const excessEq   = Math.max(0, addedEq - totalEq);
  const excessFrac = Math.min(1, excessEq / (totalEq * 0.25));
  return mixRgba(ind.colorNeutral, titrantColor, excessFrac);
}

// Stock-bottle colours before mixing into the flask.
export function getLiquidColorFor(kind, ind) {
  if (kind === 'acid' || kind === 'base') return COLOR_LIQUID_NEUTRAL;
  if (kind === 'indicator') return mixRgba(ind.colorAcid, COLOR_LIQUID_NEUTRAL, 0.55);
  return 'transparent';
}

export function mixRgba(c1, c2, t) {
  const p1 = parseRgba(c1), p2 = parseRgba(c2);
  const r = Math.round(p1.r + (p2.r - p1.r) * t);
  const g = Math.round(p1.g + (p2.g - p1.g) * t);
  const b = Math.round(p1.b + (p2.b - p1.b) * t);
  const a = p1.a + (p2.a - p1.a) * t;
  return `rgba(${r},${g},${b},${a.toFixed(2)})`;
}

export function parseRgba(str) {
  const m = str.match(/rgba?\(([^)]+)\)/)[1].split(',').map(s => parseFloat(s));
  return { r: m[0], g: m[1], b: m[2], a: m[3] !== undefined ? m[3] : 1 };
}
