import { describe, expect, it } from 'vitest';
import {
  fahrenheitToCelsius,
  celsiusToFahrenheit,
  nearestGasMark,
  normalizeTemperatureText,
  temperatureGroups,
  temperatureParts,
} from './temperatures';

describe('temperature normalization', () => {
  it.each([
    ['Preheat to 200C/400F/Gas 6.', 'Preheat to 200°C (oven).'],
    ['Preheat the oven to Gas 7/200C.', 'Preheat the oven to 200°C.'],
    ['Preheat the oven to gas 6 (200C, 400F).', 'Preheat the oven to 200°C.'],
    ['Heat the oven to 180C/Gas 4/350F.', 'Heat the oven to 180°C.'],
    ['Preheat the oven to Gas 5, 375 ̊F, 190 ̊C.', 'Preheat the oven to 190°C.'],
    ['Bake at 190०C/Gas 5.', 'Bake at 190°C.'],
    ['Bake at 170ºC/350ºF/Gas 3.', 'Bake at 170°C.'],
    ['Preheat oven to 350 degrees F (175 degrees C).', 'Preheat oven to 175°C.'],
    ['Heat oven to 200C/180C fan/gas 6.', 'Heat oven to 200°C / 180°C fan.'],
    ['Cook in the oven at Gas mark 1/4.', 'Cook in the oven at 110°C.'],
    ['Cook on Gas 7 for 25 minutes.', 'Cook on 220°C (oven) for 25 minutes.'],
    ['Preheat oven to 350 degrees F.', 'Preheat oven to 176.7°C.'],
    [
      'Cook to an internal temperature of 150 degrees F.',
      'Cook to an internal temperature of 65.6°C.',
    ],
    ['Heat oil to 170C, 340F.', 'Heat oil to 170°C.'],
    ['Heat the oven to Gas mark 1/4 (90C).', 'Heat the oven to 90°C.'],
  ])('normalizes %s', (source, expected) => {
    expect(normalizeTemperatureText(source)).toBe(expected);
    expect(normalizeTemperatureText(expected)).toBe(expected);
  });
  it('preserves ingredient cup measures and preparation quantities', () => {
    const text = '1 1/2 c. ponzu sauce, 2 cm deep, cook 15 minutes.';
    expect(normalizeTemperatureText(text)).toBe(text);
    expect(temperatureGroups(text)).toHaveLength(0);
  });
  it('preserves independent temperatures and fan qualifiers', () => {
    expect(
      normalizeTemperatureText(
        'Heat oven to 200°C. Reduce the oven to 150C/300F/Gas 2 after 30 minutes.',
      ),
    ).toBe('Heat oven to 200°C. Reduce the oven to 150°C after 30 minutes.');
    expect(normalizeTemperatureText('Use 52C for rare, 60C for medium.')).toBe(
      'Use 52°C for rare, 60°C for medium.',
    );
  });
});

describe('display conversions', () => {
  it('uses the exact Celsius/Fahrenheit formula independently of ingredient rounding', () => {
    expect(celsiusToFahrenheit(200)).toBe(392);
    expect(fahrenheitToCelsius(350)).toBeCloseTo(176.6666667);
    expect(temperatureParts('Heat the oven to 200°C.')[1]).toEqual({
      text: '200°C',
      equivalents: '392°F; approx. Gas Mark 6',
    });
  });
  it('keeps fan oven equivalents distinct', () => {
    const converted = temperatureParts('Heat oven to 200°C / 180°C fan.').filter(
      (part) => part.equivalents,
    );
    expect(converted).toEqual([
      { text: '200°C', equivalents: '392°F; approx. Gas Mark 6' },
      { text: '180°C fan', equivalents: '356°F fan' },
    ]);
  });
  it.each([
    'Heat the oil to 180°C.',
    'Deep fry at 170°C.',
    'Cook to an internal temperature of 65.6°C.',
    'Preheat the oven to 160°C. Heat an oven-proof dish to 190°C.',
  ])('does not attach Gas Marks to non-oven temperatures in %s', (text) => {
    expect(
      temperatureParts(text)
        .filter((part) => part.equivalents)
        .at(-1)?.equivalents,
    ).not.toContain('Gas Mark');
  });
  it('can explicitly exclude gas conversion in ingredient descriptions', () => {
    expect(temperatureParts('For the oven: 180°C', false)[1].equivalents).toBe('356°F');
  });
  it('does not invent Gas Marks outside the supported oven range', () => {
    expect(nearestGasMark(90)).toBeUndefined();
    expect(nearestGasMark(300)).toBeUndefined();
    expect(temperatureParts('Set the oven to 90°C.')[1].equivalents).toContain(
      'outside the supported Gas Mark range',
    );
  });
  it('supports low gas settings and conventional rounding', () => {
    expect(nearestGasMark(110)).toBe('1/4');
    expect(nearestGasMark(120)).toBe('1/2');
    expect(nearestGasMark(170)).toBe('3');
    expect(nearestGasMark(250)).toBe('9');
  });
});
