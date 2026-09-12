import { globSync, readFileSync, writeFileSync } from 'node:fs';

const write = process.argv.includes('--write');
const normalize = (value) => String(value).trim().replace(/\s+/g, ' ').toLowerCase();
let updated = 0;
let conflicts = 0;
for (const path of globSync('recipes/**/*.jsonld')) {
  const recipe = JSON.parse(readFileSync(path, 'utf8'));
  if (recipe['@type'] !== 'Recipe' || !recipe.recipeYield || !recipe.text) continue;
  const original = recipe.text;
  recipe.text = original.replace(
    /^[ \t]*(?:yield|servings?|serves|makes)[ \t]*:[ \t]*([^\r\n]*)(?:\r?\n(?:[ \t]*\r?\n)?)?/gim,
    (line, value) => {
      if (normalize(value) === normalize(recipe.recipeYield)) return '';
      conflicts++;
      console.log(`Yield differs; preserved ${path}: ${value} / ${recipe.recipeYield}`);
      return line;
    },
  );
  if (recipe.text === original) continue;
  updated++;
  if (write) writeFileSync(path, JSON.stringify(recipe, null, 2) + '\n');
}
console.log(
  `${write ? 'Removed' : 'Would remove'} duplicate yield lines in ${updated} recipes; ${conflicts} conflicts preserved.`,
);
if (!write && updated) process.exitCode = 1;
