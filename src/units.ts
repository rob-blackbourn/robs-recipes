import { type Conventions, type UnitMode } from './types';

export type Dimension = 'mass' | 'volume' | 'count';
export interface Unit {
  name: string;
  dimension: Dimension;
  factor: number;
  metric?: boolean;
}
export const US_CUP = 236.5882365;
export const UK_PINT = 568.26125;
const ounce = 28.349523125;
export const cupVolumes = { metric: 250, imperial: UK_PINT / 2, us: US_CUP };

// Exact customary definitions; see NIST SP 811, Appendix B.
export function unitFor(name: string, conventions: Conventions): Unit | null {
  const text = name.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
  const explicitUS = /\bus\b|american/.test(text);
  const explicitUK = /\buk\b|imperial/.test(text);
  const key = text.replace(/\b(us|uk|imperial|american|metric)\b/g, '').trim();
  const uk = explicitUK || (!explicitUS && conventions.liquid === 'uk');
  const cup = explicitUS
    ? US_CUP
    : explicitUK
      ? UK_PINT / 2
      : /metric/.test(text)
        ? 250
        : cupVolumes[conventions.cup];
  const spoon = explicitUS ? 'us' : conventions.spoon;
  if (/^(g|grams?|grammes?)$/.test(key))
    return { name: 'g', dimension: 'mass', factor: 1, metric: true };
  if (/^(kg|kilograms?|kilogrammes?)$/.test(key))
    return { name: 'kg', dimension: 'mass', factor: 1000, metric: true };
  if (/^(oz|ounces?)$/.test(key)) return { name: 'oz', dimension: 'mass', factor: ounce };
  if (/^(lb|lbs|pounds?)$/.test(key)) return { name: 'lb', dimension: 'mass', factor: ounce * 16 };
  if (/^(ml|millilitres?|milliliters?)$/.test(key))
    return { name: 'ml', dimension: 'volume', factor: 1, metric: true };
  if (/^(cl|centilitres?|centiliters?)$/.test(key))
    return { name: 'cl', dimension: 'volume', factor: 10, metric: true };
  if (/^(l|litres?|liters?)$/.test(key))
    return { name: 'l', dimension: 'volume', factor: 1000, metric: true };
  if (/^(cups?|c)$/.test(key)) return { name: 'cup', dimension: 'volume', factor: cup };
  if (/^(tbsp|tbs|tablespoons?)$/.test(key))
    return {
      name: 'tbsp',
      dimension: 'volume',
      factor: spoon === 'us' ? US_CUP / 16 : spoon === 'australian' ? 20 : 15,
    };
  if (/^(tsp|teaspoons?)$/.test(key))
    return { name: 'tsp', dimension: 'volume', factor: spoon === 'us' ? US_CUP / 48 : 5 };
  if (/^(fl oz|floz|fluid ounces?)$/.test(key))
    return {
      name: uk ? 'UK fl oz' : 'US fl oz',
      dimension: 'volume',
      factor: uk ? UK_PINT / 20 : US_CUP / 8,
    };
  if (/^(pt|pints?)$/.test(key))
    return {
      name: uk ? 'UK pint' : 'US pint',
      dimension: 'volume',
      factor: uk ? UK_PINT : US_CUP * 2,
    };
  if (/^(qt|quarts?)$/.test(key))
    return {
      name: uk ? 'UK quart' : 'US quart',
      dimension: 'volume',
      factor: uk ? UK_PINT * 2 : US_CUP * 4,
    };
  if (/^(gal|gallons?)$/.test(key))
    return {
      name: uk ? 'UK gallon' : 'US gallon',
      dimension: 'volume',
      factor: uk ? UK_PINT * 8 : US_CUP * 16,
    };
  return null;
}

export const unitPattern =
  '(?:(?:US|UK|imperial|American|metric)\\s+)?(?:fluid\\s+ounces?|fl\\.?\\s*oz\\.?|millilit(?:re|er)s?|centilit(?:re|er)s?|kilogram(?:me)?s?|gram(?:me)?s?|tablespoons?|teaspoons?|lit(?:re|er)s?|gallons?|quarts?|pounds?|ounces?|pints?|cups?|tbsp\\.?|tbs\\.?|tsp\\.?|floz|lbs?\\.?|oz\\.?|kg|ml|cl|pt|qt|gal|g|l|c\\.?)(?:\\s+(?:US|UK|imperial))?';

const fractionValues = [0, 1 / 8, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 7 / 8, 1];
const fractionLabels = ['', '1/8', '1/4', '1/3', '1/2', '2/3', '3/4', '7/8', ''];
export function fraction(value: number): string {
  if (!Number.isFinite(value) || value < 0) throw new Error('Invalid quantity');
  if (value === 0) return '0';
  const whole = Math.floor(value);
  const part = value - whole;
  let best = 0;
  fractionValues.forEach((candidate, i) => {
    if (Math.abs(candidate - part) <= Math.abs(fractionValues[best] - part) + 1e-12) best = i;
  });
  if (best === 8) return String(whole + 1);
  if (best === 0) return whole ? String(whole) : '<1/8';
  return `${whole ? `${whole} ` : ''}${fractionLabels[best]}`;
}

export function roundMetric(value: number): number {
  const increment = value >= 100 ? 10 : value >= 20 ? 5 : value >= 1 ? 1 : 0.1;
  return Number((Math.floor(value / increment + 0.5 + 1e-10) * increment).toFixed(1));
}
export function metric(value: number, dimension: Dimension): string {
  const rounded = roundMetric(value);
  const small = dimension === 'mass' ? 'g' : 'ml';
  if (value > 0 && rounded === 0) return `<0.1 ${small}`;
  return rounded >= 1000
    ? `${Number((rounded / 1000).toFixed(4))} ${dimension === 'mass' ? 'kg' : 'l'}`
    : `${rounded} ${small}`;
}

export const combinedUnitModes = {
  'metric-cups': { weight: 'metric', volume: 'cups-metric' },
  'imperial-cups': { weight: 'imperial', volume: 'cups-imperial' },
  'customary-cups': { weight: 'customary', volume: 'cups-us' },
} as const;

export function cupModeFor(mode: UnitMode): UnitMode | undefined {
  if (mode in combinedUnitModes)
    return combinedUnitModes[mode as keyof typeof combinedUnitModes].volume;
  return mode.startsWith('cups-') ? mode : undefined;
}

export function displayQuantity(base: number, unit: Unit, mode: UnitMode): string {
  if (unit.dimension === 'count') return fraction(base);
  if (mode in combinedUnitModes) {
    const combined = combinedUnitModes[mode as keyof typeof combinedUnitModes];
    return displayQuantity(
      base,
      unit,
      unit.dimension === 'mass' ? combined.weight : combined.volume,
    );
  }
  if (mode === 'metric' || (mode === 'original' && unit.metric))
    return metric(base, unit.dimension);
  if (mode === 'original') return `${fraction(base / unit.factor)} ${unit.name}`;
  if (mode === 'customary' && unit.dimension === 'volume') {
    const measures = [
      { factor: US_CUP * 16, name: 'US gallon' },
      { factor: US_CUP * 4, name: 'US quart' },
      { factor: US_CUP * 2, name: 'US pint' },
      { factor: US_CUP, name: 'US cup' },
      { factor: US_CUP / 8, name: 'US fl oz' },
      { factor: US_CUP / 16, name: 'US tbsp' },
      { factor: US_CUP / 48, name: 'US tsp' },
    ];
    const target =
      measures.find((measure) => base >= measure.factor - 1e-9) ?? measures[measures.length - 1];
    return `${fraction(base / target.factor)} ${target.name}`;
  }
  if (mode === 'imperial' || mode === 'customary') {
    const target =
      unit.dimension === 'mass'
        ? base >= ounce * 16
          ? { factor: ounce * 16, name: 'lb' }
          : { factor: ounce, name: 'oz' }
        : base >= UK_PINT
          ? { factor: UK_PINT, name: 'UK pint' }
          : { factor: UK_PINT / 20, name: 'UK fl oz' };
    return `${fraction(base / target.factor)} ${target.name}`;
  }
  const cup =
    cupVolumes[mode === 'cups-us' ? 'us' : mode === 'cups-imperial' ? 'imperial' : 'metric'];
  const tablespoon = mode === 'cups-us' ? US_CUP / 16 : 15;
  const teaspoon = mode === 'cups-us' ? US_CUP / 48 : 5;
  const target =
    base >= cup - 1e-9
      ? { factor: cup, name: 'cup' }
      : base >= tablespoon - 1e-9
        ? { factor: tablespoon, name: 'tbsp' }
        : { factor: teaspoon, name: 'tsp' };
  return `${fraction(base / target.factor)} ${target.name}`;
}
