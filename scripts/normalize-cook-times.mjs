import { globSync, readFileSync, writeFileSync } from 'node:fs';

function duration(value) {
  if (/^(?:none|no cooking required|0)$/i.test(value)) return 'PT0M';
  const normalized = value
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/[¼½¾]/g, (c) => ({ '¼': ' 1/4', '½': ' 1/2', '¾': ' 3/4' })[c]);
  const token = /(\d+(?:\s+\d+\/\d+)?|\d+\/\d+)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)/g;
  let seconds = 0;
  let cursor = 0;
  let found = false;
  for (const match of normalized.matchAll(token)) {
    if (normalized.slice(cursor, match.index).trim()) return value;
    const amount = match[1].split(/\s+/).reduce((sum, part) => {
      const [n, d = '1'] = part.split('/');
      return sum + Number(n) / Number(d);
    }, 0);
    seconds += amount * (match[2].startsWith('h') ? 3600 : match[2].startsWith('m') ? 60 : 1);
    cursor = match.index + match[0].length;
    found = true;
  }
  if (!found || normalized.slice(cursor).trim() || !Number.isInteger(seconds)) return value;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}${remainder ? `${remainder}S` : ''}${seconds === 0 ? '0M' : ''}`;
}

const write = process.argv.includes('--write');
let added = 0;
let removed = 0;
let conflicts = 0;
for (const path of globSync('recipes/**/*.jsonld')) {
  const recipe = JSON.parse(readFileSync(path, 'utf8'));
  if (recipe['@type'] !== 'Recipe') continue;
  const pattern =
    /^(?:cook(?:ing)?(?:[ \t]+time)?)[ \t]*:[ \t]*([^\r\n]*)(?:\r?\n(?:[ \t]*\r?\n)?)?/im;
  const match = recipe.text?.match(pattern);
  const value = match?.[1].trim();
  if (!value || /^[?\s]+$/.test(value)) continue;
  const cookTime = duration(value);
  if (recipe.cookTime && recipe.cookTime !== cookTime) {
    console.log(`Conflicting cooking time left unchanged: ${path}: ${value} / ${recipe.cookTime}`);
    conflicts++;
    continue;
  }
  if (!recipe.cookTime) {
    recipe.cookTime = cookTime;
    added++;
  }
  recipe.text = recipe.text.replace(pattern, '');
  removed++;
  if (process.argv.includes('--details')) console.log(`${path}: ${cookTime}`);
  if (write) writeFileSync(path, JSON.stringify(recipe, null, 2) + '\n');
}
console.log(
  `${write ? 'Added' : 'Would add'} ${added} cookTime fields; ${write ? 'removed' : 'would remove'} ${removed} cooking-time lines; ${conflicts} conflicts.`,
);
if (conflicts || (!write && removed)) process.exitCode = 1;
