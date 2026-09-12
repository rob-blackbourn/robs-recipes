import { type Conventions, type UnitMode, defaultConventions } from './types';
import { type Unit, unitFor, unitPattern, displayQuantity } from './units';
import { type Density, matchDensity, gramsPerMl } from './densities';

const unicodeFractions: Record<string, number> = {
  '¼': 1 / 4,
  '½': 1 / 2,
  '¾': 3 / 4,
  '⅐': 1 / 7,
  '⅑': 1 / 9,
  '⅒': 1 / 10,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅕': 1 / 5,
  '⅖': 2 / 5,
  '⅗': 3 / 5,
  '⅘': 4 / 5,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
};
const glyphs = Object.keys(unicodeFractions).join('');
export const numberPattern = `(?:\\d+\\s+\\d+\\s*[/⁄]\\s*\\d+|\\d+\\s*[/⁄]\\s*\\d+|\\d*\\s*[${glyphs}]|\\d+(?:\\.\\d+)?|\\.\\d+)`;
const rangePattern = `(${numberPattern})(?:\\s*(?:[-–—]|to|or)\\s*(${numberPattern}))?`;

export function parseNumber(text: string): number {
  const trimmed = text.trim();
  const glyph = trimmed.at(-1)!;
  if (unicodeFractions[glyph])
    return Number(trimmed.slice(0, -1).trim() || 0) + unicodeFractions[glyph];
  if (/[/⁄]/.test(trimmed)) {
    const parts = trimmed.split(/[/⁄]/);
    const left = parts[0].trim().split(/\s+/).map(Number);
    return (left.length === 2 ? left[0] : 0) + left.at(-1)! / Number(parts[1]);
  }
  return Number(trimmed);
}

export interface Amount {
  low: number;
  high?: number;
  unit: Unit;
  length: number;
}
export function parseAmount(
  text: string,
  conventions: Conventions = defaultConventions,
): Amount | null {
  const match = text.match(new RegExp(`^${rangePattern}`, 'i'));
  if (!match) return null;
  const low = parseNumber(match[1]);
  const high = match[2] ? parseNumber(match[2]) : undefined;
  if (
    !Number.isFinite(low) ||
    low <= 0 ||
    (high !== undefined && (!Number.isFinite(high) || high < low))
  )
    return null;
  const rest = text.slice(match[0].length);
  const unitMatch = rest.match(new RegExp(`^\\s*(${unitPattern})(?=$|[^a-zA-Z])`, 'i'));
  const unit = unitMatch ? unitFor(unitMatch[1], conventions) : null;
  // Without a unit, require a word boundary so e.g. "00 flour" isn't partially parsed.
  if (!unit && /^[\d./⁄]/.test(rest)) return null;
  return {
    low,
    high,
    unit: unit || { name: '', dimension: 'count', factor: 1 },
    length: match[0].length + (unitMatch?.[0].length || 0),
  };
}

export interface ParsedIngredient {
  original: string;
  prefix: string;
  amount: Amount;
  equivalent?: Amount;
  equivalentOpen?: string;
  equivalentClose?: string;
  suffix: string;
  package: boolean;
  issue?: string;
}
export function parseIngredient(
  original: string,
  conventions: Conventions = defaultConventions,
): ParsedIngredient | null {
  const colon = original.indexOf(':');
  let prefix = colon >= 0 ? original.slice(0, colon + 1) + ' ' : '';
  let body = (colon >= 0 ? original.slice(colon + 1) : original).trimStart();
  let amount = parseAmount(body, conventions);
  if (!amount) {
    // Also support uncomplicated trailing measures such as "Cognac 3 tbsp".
    const trailing = body.match(
      new RegExp(`^([A-Za-z][A-Za-z '\\-]+?)\\s+(${rangePattern}\\s*${unitPattern})[.,]?$`, 'i'),
    );
    if (!trailing) return null;
    prefix += trailing[1] + ' ';
    body = trailing[2];
    amount = parseAmount(body, conventions);
    if (!amount) return null;
  }
  let suffix = body.slice(amount.length);
  const packaged =
    amount.unit.dimension === 'count' &&
    (/^\s*[x×]\s*\d/.test(suffix) ||
      new RegExp(
        `^\\s*\\(?${numberPattern}\\s*${unitPattern}\\s*\\)?\\s*(?:cans?|tins?|packs?|packets?)\\b`,
        'i',
      ).test(suffix));
  let equivalent: Amount | undefined;
  let equivalentOpen: string | undefined;
  let equivalentClose: string | undefined;
  let issue: string | undefined;
  const paired = suffix.match(/^\s*(\/|\()\s*/);
  if (paired && amount.unit.dimension !== 'count') {
    const second = parseAmount(suffix.slice(paired[0].length), conventions);
    const tail = second ? suffix.slice(paired[0].length + second.length) : '';
    if (
      second &&
      second.unit.dimension === amount.unit.dimension &&
      (paired[1] !== '(' || /^\s*\)/.test(tail))
    ) {
      equivalent = second;
      equivalentOpen = paired[1] === '/' ? ' / ' : ' (';
      equivalentClose = paired[1] === '(' ? ')' : '';
      suffix = paired[1] === '(' ? tail.replace(/^\s*\)/, '') : tail;
      const firstBase = amount.low * amount.unit.factor;
      const secondBase = second.low * second.unit.factor;
      const conflict = (a: number, b: number) => Math.abs(a - b) / Math.max(a, b) > 0.15;
      if (
        conflict(firstBase, secondBase) ||
        (amount.high === undefined) !== (second.high === undefined) ||
        (amount.high !== undefined &&
          second.high !== undefined &&
          conflict(amount.high * amount.unit.factor, second.high * second.unit.factor))
      )
        issue = 'Conflicting equivalent measures; check the original quantity.';
    }
  }
  if (!packaged && /^\s*(?:[-–—]|\+|plus\b|or\b|to\b)\s*\d/.test(suffix))
    issue = 'Multiple quantities need checking.';
  if (paired?.[1] === '/' && !equivalent) issue = 'Alternative quantities need checking.';
  if (
    amount.unit.dimension !== 'count' &&
    new RegExp(`^\\s*${unitPattern}(?=$|[^a-zA-Z])`, 'i').test(suffix)
  )
    issue = 'Conflicting unit labels; check the original quantity.';
  if (
    !packaged &&
    new RegExp(`${numberPattern}\\s*${unitPattern}(?=$|[^a-zA-Z])`, 'i').test(suffix)
  )
    issue = 'Additional measures need checking; the full line is kept as written.';
  if (!packaged && /\b(?:or|substitute|equivalent|about|approximately)\s+\d/i.test(suffix))
    issue = 'Alternative quantities need checking.';
  if (
    /^\s*(?:heaped|heaping|rounded|scant)\b/.test(suffix) ||
    /\b(?:heaped|heaping|rounded|scant)\s+(?:tsp|tbsp|cup|teaspoon|tablespoon)/i.test(suffix)
  )
    issue = 'Qualified measure; check the original quantity.';
  if (amount.unit.dimension === 'count' && /^\s*(?:inch|cm|mm|%|°|cup|ml|g\b)/i.test(suffix))
    issue = 'This may be a size rather than an ingredient count.';
  return {
    original,
    prefix,
    amount,
    equivalent,
    equivalentOpen,
    equivalentClose,
    suffix,
    package: packaged,
    issue,
  };
}

export interface IngredientResult {
  text: string;
  original: string;
  issue?: string;
  note?: string;
  density?: Density;
}
export function transformIngredient(
  original: string,
  factor: number,
  mode: UnitMode,
  conventions = defaultConventions,
): IngredientResult {
  if (!Number.isFinite(factor) || factor <= 0)
    return { text: original, original, issue: 'Invalid scaling factor.' };
  if (mode === 'original' && factor === 1) return { text: original, original };
  const parsed = parseIngredient(original, conventions);
  if (!parsed || parsed.issue)
    return {
      text: original,
      original,
      issue:
        parsed?.issue ||
        (factor !== 1
          ? 'Quantity could not be scaled automatically.'
          : /\d|[¼½¾⅓⅔⅛⅜⅝⅞]/.test(original)
            ? 'Quantity could not be converted automatically.'
            : undefined),
    };
  const { prefix, suffix } = parsed;
  let amount = parsed.amount;
  if (mode !== 'original' && parsed.equivalent?.unit.metric && !amount.unit.metric)
    amount = parsed.equivalent;
  let unit = amount.unit;
  let low = amount.low * unit.factor * factor;
  let high = amount.high === undefined ? undefined : amount.high * unit.factor * factor;
  let density: Density | undefined;
  let note: string | undefined;
  let outputMode = mode;
  const cupMode = mode.startsWith('cups-');
  if (cupMode && unit.dimension === 'mass') {
    density = matchDensity(suffix);
    if (density) {
      low /= gramsPerMl(density);
      if (high !== undefined) high /= gramsPerMl(density);
      unit = { name: 'ml', dimension: 'volume', factor: 1, metric: true };
    } else {
      outputMode = 'original';
      note = 'Kept as weight: no matching cup conversion.';
    }
  } else if (mode === 'metric' && unit.dimension === 'volume') {
    density = matchDensity(suffix);
    if (density) {
      low *= gramsPerMl(density);
      if (high !== undefined) high *= gramsPerMl(density);
      unit = { name: 'g', dimension: 'mass', factor: 1, metric: true };
    }
  }
  if (![low, ...(high === undefined ? [] : [high])].every(Number.isFinite))
    return { text: original, original, issue: 'Quantity is too large to calculate.' };
  const formatRange = (a: number, b: number | undefined, u: Unit, m: UnitMode) => {
    const first = displayQuantity(a, u, m);
    const second = b === undefined ? first : displayQuantity(b, u, m);
    return first === second ? first : `${first}–${second}`;
  };
  let quantity = formatRange(low, high, unit, outputMode);
  if (mode === 'original' && parsed.equivalent) {
    const eq = parsed.equivalent;
    quantity +=
      parsed.equivalentOpen +
      formatRange(
        eq.low * eq.unit.factor * factor,
        eq.high === undefined ? undefined : eq.high * eq.unit.factor * factor,
        eq.unit,
        mode,
      ) +
      parsed.equivalentClose;
  }
  if (parsed.package) note = 'Package size retained; only the number of packages changes.';
  return {
    original,
    text: prefix + quantity + (suffix && !/^\s|^[,.)]/.test(suffix) ? ' ' : '') + suffix,
    note,
    density,
  };
}
