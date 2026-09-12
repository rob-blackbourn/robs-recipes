import { globSync, readFileSync, writeFileSync } from 'node:fs';

const write = process.argv.includes('--write');
let updated = 0;
let unknown = 0;
for (const path of globSync('recipes/**/*.jsonld')) {
  const recipe = JSON.parse(readFileSync(path, 'utf8'));
  if (recipe['@type'] !== 'Recipe' || recipe.prepTime) continue;
  const match = recipe.text?.match(/^(?:prep(?:aration)?(?:[ \t]+time)?)[ \t]*:[ \t]*([^\r\n]*)/im);
  const value = match?.[1].trim();
  if (!value) continue;
  if (/^[?\s]+$/.test(value)) {
    unknown++;
    continue;
  }
  // Only exact, unqualified durations can be represented without losing meaning.
  // Keep ranges, waiting periods and qualifiers as text instead of guessing a duration.
  const exact = value.match(/^(\d+)\s*(days?|hours?|hrs?|minutes?|mins?|seconds?|secs?)\.?$/i);
  let prepTime = value;
  if (exact) {
    const unit = exact[2][0].toUpperCase();
    prepTime = `P${unit === 'D' ? '' : 'T'}${exact[1]}${unit}`;
  }
  recipe.prepTime = prepTime;
  recipe.text = recipe.text.replace(
    /^(?:prep(?:aration)?(?:[ \t]+time)?)[ \t]*:[ \t]*[^\r\n]*(?:\r?\n(?:[ \t]*\r?\n)?)?/im,
    '',
  );
  updated++;
  if (process.argv.includes('--details')) console.log(`${path}: ${prepTime}`);
  if (write) writeFileSync(path, JSON.stringify(recipe, null, 2) + '\n');
}
console.log(
  `${write ? 'Updated' : 'Would update'} prepTime in ${updated} recipes; ${unknown} unknown values left unset.`,
);
if (!write && updated) process.exitCode = 1;
