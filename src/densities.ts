import { US_CUP } from './units';

export const densitySource = 'https://www.kingarthurbaking.com/learn/ingredient-weight-chart';
export interface Density {
  name: string;
  gramsPerCup: number;
  matches: RegExp;
  exclude?: RegExp;
}
// Source consulted September 2026. Butter: 113g per half cup; honey: 21g per tablespoon.
// These are kitchen estimates, not universal physical densities.
export const densities: Density[] = [
  {
    name: 'Plain / all-purpose flour',
    gramsPerCup: 120,
    matches: /\b(?:plain|all[- ]purpose) flour\b/,
    exclude: /gluten.free|sifted|packed/,
  },
  {
    name: 'Bread flour',
    gramsPerCup: 120,
    matches: /\b(?:bread|strong(?: white)?) flour\b/,
    exclude: /gluten.free|whole|sifted|packed/,
  },
  {
    name: 'Wholemeal flour',
    gramsPerCup: 113,
    matches: /\b(?:wholemeal|whole[- ]wheat) flour\b/,
    exclude: /sifted|packed/,
  },
  { name: 'Granulated sugar', gramsPerCup: 198, matches: /\bgranulated sugar\b/ },
  {
    name: 'Packed brown sugar',
    gramsPerCup: 213,
    matches: /\b(?:light |dark |soft )?brown sugar\b/,
    exclude: /unpacked|loosely/,
  },
  {
    name: 'Icing sugar (unsifted)',
    gramsPerCup: 113,
    matches: /\b(?:icing|powdered|confectioners'?)[ -]sugar\b/,
    exclude: /(?<!un)sifted/,
  },
  {
    name: 'Butter',
    gramsPerCup: 226,
    matches: /^(?:(?:unsalted|salted|softened|cold|chilled|melted)\s+)*butter\b/,
    exclude: /clarified|whipped|peanut|almond|cocoa/,
  },
  {
    name: 'Honey',
    gramsPerCup: 336,
    matches: /^(?:(?:clear|runny|liquid)\s+)*honey\b/,
    exclude: /powder|creamed/,
  },
  {
    name: 'Rolled / old-fashioned oats',
    gramsPerCup: 89,
    matches: /\b(?:rolled|old[- ]fashioned) oats\b/,
    exclude: /ground|cooked|instant/,
  },
];
export function matchDensity(ingredient: string): Density | undefined {
  const text = ingredient
    .toLowerCase()
    .trim()
    .replace(/^of\s+/, '');
  if (/\bor\b|\band\b/.test(text)) return undefined;
  return densities.find(
    (d) =>
      d.matches.test(text) &&
      !d.exclude?.test(text) &&
      (d.name !== 'Packed brown sugar' || /\bpacked\b/.test(text)),
  );
}
export function gramsPerMl(density: Density): number {
  return density.gramsPerCup / US_CUP;
}
