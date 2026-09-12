import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeEntry, filterDocuments, duration } from './catalog';
import { transformIngredient } from './ingredients';
import { unitModes, type UnitMode } from './types';

const assets = Object.fromEntries(
  globSync('recipes/**/*.assets/*').map((path) => ['../' + path, path]),
);
const entries = globSync('recipes/**/*.jsonld').map((path) =>
  makeEntry('../' + path, readFileSync(path, 'utf8'), assets),
);

describe('the complete collection', () => {
  it('loads every document and image with distinct IDs', () => {
    expect(entries).toHaveLength(419);
    expect(entries.filter((entry) => entry['@type'] === 'Recipe')).toHaveLength(413);
    expect(entries.filter((entry) => entry['@type'] === 'CreativeWork')).toHaveLength(6);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(419);
    const images = entries.flatMap((entry) => entry.images);
    expect(images).toHaveLength(12);
    for (const image of images) expect(readFileSync(image).length).toBeGreaterThan(100);
  });
  it('handles all ingredients in every output mode without corrupting source text', () => {
    for (const entry of entries)
      for (const ingredient of entry.recipeIngredient || []) {
        expect(transformIngredient(ingredient, 1, 'original').text).toBe(ingredient);
        for (const mode of Object.keys(unitModes) as UnitMode[]) {
          const result = transformIngredient(ingredient, 2, mode);
          expect(result.text, ingredient).not.toMatch(/NaN|Infinity|undefined/);
          expect(result.original).toBe(ingredient);
        }
      }
  });
  it('combines hierarchical folder filtering and case-insensitive search', () => {
    const result = filterDocuments(entries, 'recipes', 'CHICKEN', 'british');
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((entry) => entry.folder.startsWith('british'))).toBe(true);
    expect(filterDocuments(entries, 'recipes', 'nonexistent-ingredient-xyz', '')).toHaveLength(0);
    expect(filterDocuments(entries, 'references', '250', '')[0].name).toBe('Cups & Spoons');
  });
  it('formats durations without inventing totals', () => {
    expect(duration('PT1H30M')).toBe('1h 30m');
    expect(duration(undefined)).toBeUndefined();
  });
});
