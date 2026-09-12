import {
  type Preferences,
  type UnitMode,
  type Conventions,
  defaultConventions,
  unitModes,
  temperatureUnits,
  type TemperatureUnit,
} from './types';
import { parseAmount } from './ingredients';
import { type Unit, unitFor } from './units';

export const defaults: Preferences = {
  units: 'original',
  servings: null,
  temperatureUnit: 'celsius',
};
export const storageKey = 'recipe-collection.preferences.v1';
export const isUnitMode = (value: unknown): value is UnitMode =>
  typeof value === 'string' && Object.hasOwn(unitModes, value);
export function positive(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}
export function decodePreferences(raw: string | null): Preferences {
  try {
    const data = JSON.parse(raw || 'null');
    if (data?.version !== 1) return { ...defaults };
    return {
      units: isUnitMode(data.units) ? data.units : defaults.units,
      servings: positive(data.servings) ?? null,
      temperatureUnit:
        typeof data.temperatureUnit === 'string' &&
        Object.hasOwn(temperatureUnits, data.temperatureUnit)
          ? (data.temperatureUnit as TemperatureUnit)
          : defaults.temperatureUnit,
    };
  } catch {
    return { ...defaults };
  }
}
export function encodePreferences(value: Preferences): string {
  return JSON.stringify({ version: 1, ...value });
}

export interface YieldInfo {
  value: number;
  label: string;
  servings: boolean;
  unit?: Unit;
}
export function parseYield(
  raw: string | undefined,
  conventions = defaultConventions,
): YieldInfo | undefined {
  if (!raw) return undefined;
  const text = raw
    .trim()
    .replace(/^makes\s+(?:about\s+)?/i, '')
    .replace(/^serves?\s+/i, '');
  const amount = parseAmount(text, conventions);
  if (!amount || amount.high !== undefined) return undefined;
  const rest = text.slice(amount.length).trim();
  const servings =
    /^serves?\s+/i.test(raw) ||
    /^(?:servings?|portions?|people)(?:\s+as\s+(?:a\s+)?starter)?$/i.test(rest);
  if (amount.unit.dimension !== 'count') {
    if (rest) return undefined;
    return { value: amount.low, label: amount.unit.name, servings: false, unit: amount.unit };
  }
  if (
    servings &&
    (!rest || /^(?:servings?|portions?|people)(?:\s+as\s+(?:a\s+)?starter)?$/i.test(rest))
  )
    return { value: amount.low, label: 'servings', servings: true };
  if (
    /^(?:(?:small|medium|large)\s+)?(?:pieces?|loaves?|loafs?|skewers?|chickens?|meringues?|baguettes?|pizzas?|pies?|cakes?|pitta breads?|duck|curries|starters|portions?)?$/i.test(
      rest,
    )
  )
    return { value: amount.low, label: rest || 'yield', servings: false };
  return undefined;
}

export function conventionsFrom(params: URLSearchParams): Conventions {
  const cup = params.get('cup');
  const liquid = params.get('liquid');
  const spoon = params.get('spoon');
  return {
    cup: cup === 'us' || cup === 'imperial' ? cup : 'metric',
    liquid: liquid === 'us' ? 'us' : 'uk',
    spoon: spoon === 'us' || spoon === 'australian' ? spoon : 'metric',
  };
}
export function resolveOptions(
  rawYield: string | undefined,
  preferences: Preferences,
  params: URLSearchParams,
) {
  const conventions = conventionsFrom(params);
  const info = parseYield(rawYield, conventions);
  const baseline = positive(params.get('baseline')) ?? info?.value;
  const manualFactor = positive(params.get('factor'));
  const target =
    positive(params.get('yield')) ??
    (info?.servings ? (preferences.servings ?? info.value) : info?.value);
  const unitsParam = params.get('units');
  const units = isUnitMode(unitsParam) ? unitsParam : preferences.units;
  const targetUnit = info?.unit
    ? unitFor(params.get('yieldUnit') || info.unit.name, conventions)
    : null;
  const compatibleUnit = targetUnit?.dimension === info?.unit?.dimension ? targetUnit : info?.unit;
  const unitFactor = info?.unit && compatibleUnit ? compatibleUnit.factor / info.unit.factor : 1;
  const computed = manualFactor ?? (baseline && target ? (target * unitFactor) / baseline : 1);
  const valid =
    Number.isFinite(computed) &&
    computed > 0 &&
    (baseline === undefined ||
      (Number.isFinite((baseline * computed) / unitFactor) &&
        (baseline * computed) / unitFactor > 0));
  const factor = valid ? computed : 1;
  return {
    info,
    baseline,
    target,
    units,
    conventions,
    factor,
    targetUnit: compatibleUnit,
    error: valid
      ? undefined
      : 'This yield is outside the supported numeric range. Original quantities are shown; choose a smaller adjustment.',
  };
}

export function temperatureForUnits(units: UnitMode, preferred: TemperatureUnit): TemperatureUnit {
  return units === 'customary' || units === 'customary-cups' ? 'fahrenheit' : preferred;
}
