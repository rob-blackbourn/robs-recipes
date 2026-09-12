import { makeEntry } from './catalog';

const documents = import.meta.glob('../recipes/**/*.jsonld', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const assets = import.meta.glob('../recipes/**/*.assets/*.{png,jpg,jpeg,webp}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;
export const entries = Object.entries(documents)
  .map(([path, raw]) => makeEntry(path, raw, assets))
  .sort((a, b) => a.name.localeCompare(b.name, 'en-GB') || a.id.localeCompare(b.id));
export const entryById = new Map(entries.map((entry) => [entry.id, entry]));
