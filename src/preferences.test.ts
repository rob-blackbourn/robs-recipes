import { temperatureForUnits } from './preferences';
import { describe, expect, it } from 'vitest';
import {
  decodePreferences,
  defaults,
  encodePreferences,
  parseYield,
  resolveOptions,
} from './preferences';

describe('serving preferences', () => {
  const preferences = { ...defaults, units: 'metric' as const, servings: 8 };
  it.each(['4 servings', 'Serves 4', '4 portions', '4 people', '4 servings as a starter'])(
    'applies defaults to %s',
    (raw) => expect(resolveOptions(raw, preferences, new URLSearchParams()).factor).toBe(2),
  );
  it.each([
    '4',
    '4–6 servings',
    'Serves 4-6',
    '20 pieces',
    '600 ml',
    '1 large loaf',
    '4 as a starter',
    undefined,
  ])('does not automatically scale %s', (raw) =>
    expect(resolveOptions(raw, preferences, new URLSearchParams()).factor).toBe(1),
  );
  it.each(['1 drink', '2 drinks', '1 glass', '2 glasses', '1 cocktail', '2 cocktails'])(
    'recognizes beverage yields and scales them: %s',
    (raw) => {
      const count = Number(raw.split(' ')[0]);
      expect(parseYield(raw)).toEqual({ value: count, label: raw.slice(2), servings: false });
      const result = resolveOptions(
        raw,
        preferences,
        new URLSearchParams({ yield: String(count * 3) }),
      );
      expect(result.baseline).toBe(count);
      expect(result.factor).toBe(3);
    },
  );
  it('allows manual scaling of bare yields and other counts', () => {
    expect(resolveOptions('4', preferences, new URLSearchParams('yield=6')).factor).toBe(1.5);
    expect(resolveOptions('20 pieces', preferences, new URLSearchParams('yield=10')).factor).toBe(
      0.5,
    );
  });
  it('handles absent or ambiguous yields through a baseline or multiplier', () => {
    expect(
      resolveOptions('4-6', preferences, new URLSearchParams('baseline=4&yield=8')).factor,
    ).toBe(2);
    expect(resolveOptions(undefined, preferences, new URLSearchParams('factor=0.5')).factor).toBe(
      0.5,
    );
    expect(parseYield('Makes enough marinade for 500g of beef')).toBeUndefined();
  });
  it('supports compatible target yield units', () =>
    expect(
      resolveOptions('600 ml', preferences, new URLSearchParams('yield=1.2&yieldUnit=l')).factor,
    ).toBe(2));
  it('ignores incompatible yield units', () =>
    expect(
      resolveOptions('600 ml', preferences, new URLSearchParams('yield=1200&yieldUnit=kg')).factor,
    ).toBe(2));
  it('applies URL overrides ahead of saved settings', () => {
    const resolved = resolveOptions(
      '4 servings',
      preferences,
      new URLSearchParams('yield=2&units=imperial'),
    );
    expect(resolved.factor).toBe(0.5);
    expect(resolved.units).toBe('imperial');
    expect(
      resolveOptions('4 servings', preferences, new URLSearchParams('factor=1&units=original'))
        .factor,
    ).toBe(1);
  });
  it('does not confuse preferred output with source conventions', () => {
    const resolved = resolveOptions(
      '4 servings',
      { ...defaults, units: 'cups-us', servings: null },
      new URLSearchParams(),
    );
    expect(resolved.conventions).toEqual({ cup: 'metric', liquid: 'uk', spoon: 'metric' });
  });
  it('rejects invalid query values', () => {
    for (const query of ['factor=0', 'factor=-2', 'factor=Infinity', 'yield=NaN', 'units=bogus']) {
      const resolved = resolveOptions('4', defaults, new URLSearchParams(query));
      expect(resolved.factor).toBe(1);
      expect(resolved.units).toBe('original');
    }
  });
  it('reports overflowing yields without producing infinite displayed quantities', () => {
    const result = resolveOptions('4 servings', defaults, new URLSearchParams('factor=1e308'));
    expect(result.factor).toBe(1);
    expect(result.error).toBeTruthy();
  });
});
describe('saved settings', () => {
  it.each(['metric-cups', 'imperial-cups', 'customary-cups'] as const)(
    'persists and accepts overrides for %s',
    (units) => {
      const preferences = { ...defaults, units };
      expect(decodePreferences(encodePreferences(preferences))).toEqual(preferences);
      expect(resolveOptions('4 servings', defaults, new URLSearchParams({ units })).units).toBe(
        units,
      );
    },
  );
  it('saves customary units and accepts recipe overrides', () => {
    const preferences = { ...defaults, units: 'customary' as const };
    expect(decodePreferences(encodePreferences(preferences))).toEqual(preferences);
    expect(
      resolveOptions('4 servings', defaults, new URLSearchParams('units=customary')).units,
    ).toBe('customary');
  });
  it.each([undefined, 'invalid'])(
    'preserves older preferences with a missing or invalid temperature unit',
    (temperatureUnit) => {
      expect(
        decodePreferences(
          JSON.stringify({ version: 1, units: 'metric', servings: 8, temperatureUnit }),
        ),
      ).toEqual({ ...defaults, units: 'metric', servings: 8 });
    },
  );

  it('round-trips versioned preferences', () =>
    expect(
      decodePreferences(
        encodePreferences({ units: 'cups-us', servings: 6, temperatureUnit: 'fahrenheit' }),
      ),
    ).toEqual({
      units: 'cups-us',
      servings: 6,
      temperatureUnit: 'fahrenheit',
    }));
  it.each([
    null,
    'not json',
    '{}',
    '{"version":2,"units":"metric"}',
    '{"version":1,"units":"bogus","servings":-1}',
  ])('safely defaults corrupt or unsupported data %s', (raw) =>
    expect(decodePreferences(raw)).toEqual(defaults),
  );
});

describe('temperature units for US Customary', () => {
  it.each(['customary', 'customary-cups'] as const)('uses Fahrenheit for %s', (units) => {
    expect(temperatureForUnits(units, 'celsius')).toBe('fahrenheit');
    expect(temperatureForUnits(units, 'gas')).toBe('fahrenheit');
  });
  it('keeps the preferred temperature for other measurement systems', () => {
    expect(temperatureForUnits('metric', 'celsius')).toBe('celsius');
    expect(temperatureForUnits('imperial', 'gas')).toBe('gas');
  });
});
