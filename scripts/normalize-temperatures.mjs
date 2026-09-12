import { globSync, readFileSync, writeFileSync } from 'node:fs';
import { normalizeTemperatureText, temperatureGroups } from '../src/temperatures.ts';

const write = process.argv.includes('--write');
let documents = 0;
let fields = 0;
const corrections = [];
function normalize(value, location) {
  if (typeof value === 'string') {
    const updated = normalizeTemperatureText(value);
    if (updated !== value) {
      fields++;
      for (const group of temperatureGroups(value)) {
        const result = normalizeTemperatureText(group.source);
        corrections.push(`${location}: ${group.source} → ${result}`);
      }
    }
    return updated;
  }
  if (Array.isArray(value))
    return value.map((item, index) => normalize(item, `${location}[${index}]`));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalize(item, `${location}.${key}`)]),
    );
  }
  return value;
}
for (const path of globSync('recipes/**/*.jsonld')) {
  const original = JSON.parse(readFileSync(path, 'utf8'));
  if (original['@type'] !== 'Recipe') continue;
  const updated = { ...original };
  // Preserve the archived source text, identifiers, links, and bibliographic metadata.
  for (const key of ['recipeInstructions', 'recipeIngredient', 'description', 'comment', 'tool']) {
    if (original[key] !== undefined) updated[key] = normalize(original[key], `${path}:${key}`);
  }
  if (JSON.stringify(original) !== JSON.stringify(updated)) {
    documents++;
    if (write) writeFileSync(path, JSON.stringify(updated, null, 2) + '\n');
  }
}
console.log(`${write ? 'Updated' : 'Would update'} ${fields} fields in ${documents} recipes.`);
if (process.argv.includes('--details')) console.log(corrections.join('\n'));
if (!write && documents) process.exitCode = 1;
