import { describe, expect, it } from 'vitest';
import { defaultConventions as conventions, unitModes, type UnitMode } from './types';
import { displayQuantity, fraction, metric, roundMetric, unitFor, US_CUP, UK_PINT } from './units';
import { parseAmount, parseIngredient, parseNumber, transformIngredient } from './ingredients';
import { matchDensity } from './densities';

describe('kitchen rounding', () => {
  it.each([
    [158, 160],
    [43, 45],
    [12.6, 15],
    [0.26, 0.3],
    [0.05, 0.1],
    [0.049, 0],
    [1, 1],
    [19.9, 20],
    [20, 20],
    [22.5, 25],
    [99.9, 100],
    [100, 100],
    [105, 105],
    [995, 995],
    [997.5, 1000],
    [7.5, 10],
    [4, 4],
  ])('rounds %s to %s', (input, output) => expect(roundMetric(input)).toBe(output));
  it('promotes units after rounding and never displays positive zero', () => {
    expect(metric(995, 'mass')).toBe('995 g');
    expect(metric(997.5, 'mass')).toBe('1 kg');
    expect(metric(1580, 'volume')).toBe('1.58 l');
    expect(metric(0.00001, 'mass')).toBe('<0.1 g');
  });
  it.each([
    [0.5, '1/2'],
    [0.25, '1/4'],
    [0.125, '1/8'],
    [1.25, '1 1/4'],
    [2 / 3, '2/3'],
    [1 / 3, '1/3'],
    [0.9375, '1'],
    [0.01, '<1/8'],
    [0.0625, '1/8'],
  ])('formats %s as %s', (input, output) => expect(fraction(input)).toBe(output));
  it('uses smaller spoon units for small cup quantities', () => {
    const volume = unitFor('ml', conventions)!;
    expect(displayQuantity(US_CUP, volume, 'cups-us')).toBe('1 cup');
    expect(displayQuantity(US_CUP / 16, volume, 'cups-us')).toBe('1 tbsp');
    expect(displayQuantity(US_CUP / 96, volume, 'cups-us')).toBe('1/2 tsp');
    expect(displayQuantity(0.0001, volume, 'cups-us')).toBe('<1/8 tsp');
  });
});

describe('combined weight, cup and spoon modes', () => {
  it.each([
    ['metric-cups', 250, 15, '455 g'],
    ['imperial-cups', UK_PINT / 2, 15, '1 lb'],
    ['customary-cups', US_CUP, US_CUP / 16, '1 lb'],
  ] as const)('uses system weights and volume cups/spoons for %s', (mode, cup, spoon, weight) => {
    expect(transformIngredient('453.59237 g plain flour', 1, mode)).toEqual({
      text: `${weight} plain flour`,
      original: '453.59237 g plain flour',
    });
    expect(transformIngredient(`${cup} ml water`, 2, mode).text).toBe('2 cup water');
    expect(transformIngredient(`${spoon} ml oil`, 0.5, mode).text).toBe('1 1/2 tsp oil');
    expect(transformIngredient(`${spoon} ml oil`, 1, mode).text).toBe('1 tbsp oil');
    expect(transformIngredient('salt to taste', 2, mode)).toEqual({
      text: 'salt to taste',
      original: 'salt to taste',
    });
  });
});

describe('US customary output', () => {
  it.each([
    [US_CUP * 16, '1 US gallon'],
    [US_CUP * 6, '1 1/2 US quart'],
    [US_CUP * 2, '1 US pint'],
    [US_CUP, '1 US cup'],
    [US_CUP / 4, '2 US fl oz'],
    [US_CUP / 16, '1 US tbsp'],
    [US_CUP / 96, '1/2 US tsp'],
  ])('converts %s ml to %s', (amount, expected) => {
    expect(displayQuantity(amount, unitFor('ml', conventions)!, 'customary')).toBe(expected);
  });
  it('scales weights without converting them to cups', () => {
    expect(transformIngredient('453.59237 g flour', 2, 'customary').text).toBe('2 lb flour');
    expect(transformIngredient('28.349523125 g flour', 0.5, 'customary').text).toBe('1/2 oz flour');
  });
  it('preserves the source liquid convention independently of output', () => {
    expect(transformIngredient('1 pint water', 1, 'customary').text).toBe('1 1/4 US pint water');
    expect(transformIngredient('1 US pint water', 1, 'customary').text).toBe('1 US pint water');
  });
});

describe('unit definitions', () => {
  it('distinguishes weight ounces and fluid ounces', () => {
    expect(unitFor('oz', conventions)?.dimension).toBe('mass');
    expect(unitFor('fl oz', conventions)?.factor).toBe(UK_PINT / 20);
    expect(unitFor('US fl oz', conventions)?.factor).toBe(US_CUP / 8);
  });
  it('honours explicit labels before conventions', () => {
    expect(unitFor('US cup', conventions)?.factor).toBe(US_CUP);
    expect(unitFor('imperial cup', conventions)?.factor).toBe(UK_PINT / 2);
    expect(unitFor('metric cup', { ...conventions, cup: 'us' })?.factor).toBe(250);
    expect(unitFor('UK pint', { ...conventions, liquid: 'us' })?.factor).toBe(UK_PINT);
    expect(unitFor('tbsp', { ...conventions, spoon: 'australian' })?.factor).toBe(20);
  });
  it.each([
    'g',
    'grammes',
    'kg',
    'oz',
    'lbs',
    'ml',
    'cl',
    'litres',
    'tsp.',
    'Tbsp',
    'cups',
    'fluid ounces',
    'pints',
    'quarts',
    'gallons',
  ])('supports %s', (unit) => expect(unitFor(unit, conventions)).not.toBeNull());
});

describe('ingredient parsing and scaling', () => {
  it.each([
    ['½', 0.5],
    ['3½', 3.5],
    ['1 1/2', 1.5],
    ['⅓', 1 / 3],
    ['2 / 3', 2 / 3],
    ['0.25', 0.25],
  ])('parses %s', (input, value) => expect(parseNumber(input)).toBeCloseTo(value));
  it('scales a recipe from two servings to six', () => {
    expect(transformIngredient('400 g chicken', 6 / 2, 'metric').text).toBe('1.2 kg chicken');
    expect(transformIngredient('1 onion', 0.5, 'metric').text).toBe('1/2 onion');
  });
  it('preserves original wording at original scale', () =>
    expect(transformIngredient('158g flour, sifted', 1, 'original').text).toBe(
      '158g flour, sifted',
    ));
  it('rounds converted metric amounts', () =>
    expect(transformIngredient('158g chicken', 1, 'metric').text).toBe('160 g chicken'));
  it('handles prefixes, mixed fractions, and ranges', () => {
    expect(transformIngredient('For the filling: ¼ tsp ground mace', 2, 'original').text).toBe(
      'For the filling: 1/2 tsp ground mace',
    );
    expect(transformIngredient('75-100 ml water', 2, 'metric').text).toBe('150 ml–200 ml water');
    expect(transformIngredient('100-101 g chicken', 1, 'metric').text).toBe('100 g chicken');
    expect(transformIngredient('1 1/2 tbsp oil', 2, 'original').text).toBe('3 tbsp oil');
  });
  it('scales packages and keeps preparation dimensions and times untouched', () => {
    expect(transformIngredient('2 × 400 g tins of tomatoes', 2, 'metric').text).toBe(
      '4 × 400 g tins of tomatoes',
    );
    expect(transformIngredient('3 (6 ounce) cans tomato paste', 2, 'metric').text).toBe(
      '6 (6 ounce) cans tomato paste',
    );
    expect(transformIngredient('1 400g can tomatoes', 2, 'metric').text).toBe(
      '2 400g can tomatoes',
    );
    expect(transformIngredient('1 small onion (cut into 6 wedges)', 2, 'metric').text).toBe(
      '2 small onion (cut into 6 wedges)',
    );
    expect(transformIngredient('50 g pork, cut into 1 1/2 inch pieces', 2, 'metric').text).toBe(
      '100 g pork, cut into 1 1/2 inch pieces',
    );
    expect(transformIngredient('5 mushrooms (soaked for 30 minutes)', 2, 'original').text).toBe(
      '10 mushrooms (soaked for 30 minutes)',
    );
  });
  it('supports uncomplicated trailing amounts', () =>
    expect(transformIngredient('Cognac 3 tbsp', 2, 'original').text).toBe('Cognac 6 tbsp'));
  it('uses paired equivalents once and prioritises explicit metric', () => {
    expect(transformIngredient('100ml/3½fl oz wine', 2, 'metric').text).toBe('200 ml wine');
    expect(transformIngredient('1 oz (25g) flour', 2, 'metric').text).toBe('50 g flour');
    expect(transformIngredient('25g (1oz) flour', 2, 'original').text).toBe('50 g (2 oz) flour');
  });
  it('flags contradictory or ambiguous amounts rather than guessing', () => {
    for (const text of [
      '100 g (10 oz) flour',
      '1 kg-2 kg lamb',
      '1 heaped tbsp salt',
      '1 cup plus 2 tbsp flour',
      '1 beef fillet, about 800g-1kg',
      '3 tomatoes (or 400g can crushed tomatoes)',
      '2 coils noodles (about 100g)',
      '150 g / 1 pack of noodles',
      '125ml cup dry white wine',
    ]) {
      const result = transformIngredient(text, 2, 'metric');
      expect(result.text).toBe(text);
      expect(result.issue, text).toBeTruthy();
    }
  });
  it.each([
    'Salt and peper for seasoning',
    'a handful of rocket',
    'olive oil for frying',
    'For the sauce: water as needed',
  ])('leaves nonnumeric ingredients unchanged without warnings: %s', (text) => {
    for (const mode of Object.keys(unitModes) as UnitMode[]) {
      for (const factor of [1, 2, 0.5]) {
        expect(transformIngredient(text, factor, mode)).toEqual({ text, original: text });
      }
    }
  });
  it('still scales numeric Unicode fractions', () => {
    expect(transformIngredient('⅕ cup water', 2, 'metric').text).toBe('100 ml water');
  });
  it('rejects malformed fractions and partial numbers', () => {
    expect(parseAmount('1/0 cup milk')).toBeNull();
    expect(parseAmount('0 g salt')).toBeNull();
    expect(parseIngredient('salt to taste')).toBeNull();
  });
  it('does not accumulate rounding between transformations', () => {
    const source = '158 g chicken';
    transformIngredient(source, 2, 'imperial');
    transformIngredient(source, 3, 'cups-us');
    expect(transformIngredient(source, 1, 'metric').text).toBe('160 g chicken');
    expect(transformIngredient(source, 1, 'original').text).toBe(source);
  });
});

describe('ingredient density conversion', () => {
  it('converts matching flour with an explicit estimate and source value', () => {
    const result = transformIngredient('120 g plain flour', 1, 'cups-us');
    expect(result.text).toBe('1 cup plain flour');
    expect(result.density?.gramsPerCup).toBe(120);
    expect(transformIngredient('1 US cup plain flour', 1, 'metric').text).toBe('120 g plain flour');
  });
  it('scales density conversion by selected cup size', () => {
    expect(transformIngredient('250 ml water', 1, 'cups-metric').text).toBe('1 cup water');
    expect(transformIngredient(`${UK_PINT / 2} ml water`, 1, 'cups-imperial').text).toBe(
      '1 cup water',
    );
  });
  it.each([
    'flour',
    'gluten-free all-purpose flour',
    'sifted plain flour',
    'brown sugar',
    'peanut butter',
    'clarified butter',
    'honey or syrup',
  ])('does not guess a density for %s', (ingredient) =>
    expect(matchDensity(ingredient)).toBeUndefined(),
  );
  it('matches packing and ingredient qualifiers', () => {
    expect(matchDensity('packed brown sugar')?.gramsPerCup).toBe(213);
    expect(matchDensity('unsalted butter')?.gramsPerCup).toBe(226);
    expect(matchDensity('old-fashioned oats')?.gramsPerCup).toBe(89);
  });
  it('retains weight when no conversion is available', () => {
    const result = transformIngredient('158 g chicken', 1, 'cups-us');
    expect(result.text).toBe('160 g chicken');
    expect(result.note).toContain('Kept as weight');
  });
});
