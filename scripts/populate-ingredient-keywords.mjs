import { globSync, readFileSync, writeFileSync } from 'node:fs';

const groups = [
  [
    'meat',
    [
      ['pork', /\b(?:pork|bacon|ham|pancetta|prosciutto|gammon)\b/i],
      ['lamb', /\b(?:lamb|mutton)\b/i],
      ['beef', /\b(?:beef|veal)\b/i],
    ],
  ],
  [
    'seafood',
    [
      ['crab', /\bcrab(?:s|meat)?\b/i],
      ['lobster', /\blobsters?\b/i],
      ['scallops', /\bscallops?\b/i],
      ['prawns', /\bprawns?\b/i],
      ['shrimp', /\bshrimps?\b/i],
    ],
  ],
  [
    'poultry',
    [
      ['chicken', /\bchickens?\b/i],
      ['duck', /\bducks?\b/i],
      ['goose', /\b(?:goose|geese)\b/i],
    ],
  ],
];
const fish = [
  ['black cod', /\b(?:black cod|sablefish)\b/gi],
  ['sea bass', /\bsea\s*bass\b/gi],
  ['sea bream', /\bsea\s*bream\b/gi],
  ['John Dory', /\bjohn dory\b/gi],
  ['lemon sole', /\blemon sole\b/gi],
  ['Dover sole', /\bdover sole\b/gi],
  ['anchovies', /\banchov(?:y|ies)\b/gi],
  ['sardines', /\b(?:sardines?|niboshi)\b/gi],
  ['bonito', /\b(?:bonito|katsuobushi)\b/gi],
  ...[
    'salmon',
    'tuna',
    'haddock',
    'cod',
    'pollock',
    'mackerel',
    'monkfish',
    'snapper',
    'sole',
    'plaice',
    'halibut',
    'herring',
    'trout',
    'eel',
    'whiting',
    'perch',
    'bream',
    'bass',
    'tilapia',
    'turbot',
    'swordfish',
    'skate',
  ].map((name) => [name, new RegExp(`\\b${name}\\b`, 'gi')]),
];
const write = process.argv.includes('--write');
let changed = 0;
let added = 0;
const categories = {};
for (const path of globSync('recipes/**/*.jsonld')) {
  const recipe = JSON.parse(readFileSync(path, 'utf8'));
  if (recipe['@type'] !== 'Recipe') continue;
  const ingredients = (recipe.recipeIngredient || [])
    .map((line) =>
      line.replace(/^[^:]+:\s*/, '').replace(/\(\s*(?:for\b|to serve\b|to garnish\b)[^)]*\)/gi, ''),
    )
    .join('\n');
  const found = [];
  for (const [category, kinds] of groups) {
    const matches = kinds.filter(([, pattern]) => pattern.test(ingredients)).map(([name]) => name);
    if (matches.length) {
      found.push(category, ...matches);
      categories[category] = (categories[category] || 0) + 1;
    }
  }
  let remaining = ingredients;
  const fishKinds = [];
  for (const [name, pattern] of fish) {
    if (remaining.match(pattern)) {
      fishKinds.push(name.toLowerCase());
      remaining = remaining.replace(pattern, '');
    }
  }
  if (fishKinds.length || /\b(?:fish|whitefish)\b/i.test(remaining)) {
    found.push('fish', ...fishKinds);
    if (!fishKinds.length && /\b(?:white fish|whitefish)\b/i.test(remaining))
      found.push('white fish');
    categories.fish = (categories.fish || 0) + 1;
  }
  if (!found.length) continue;
  const existing = recipe.keywords || [];
  const keywords = Array.isArray(existing)
    ? [...existing]
    : existing
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  const seen = new Set(keywords.map((s) => s.toLowerCase()));
  let additions = 0;
  for (const keyword of found) {
    if (!seen.has(keyword.toLowerCase())) {
      keywords.push(keyword);
      seen.add(keyword.toLowerCase());
      additions++;
    }
  }
  if (!additions) continue;
  changed++;
  added += additions;
  if (process.argv.includes('--details')) console.log(`${path}: ${keywords.join(', ')}`);
  if (write) writeFileSync(path, JSON.stringify({ ...recipe, keywords }, null, 2) + '\n');
}
console.log(
  `${write ? 'Added' : 'Would add'} ${added} keywords in ${changed} recipes. Matches by category: ${JSON.stringify(categories)}`,
);
if (!write && changed) process.exitCode = 1;
