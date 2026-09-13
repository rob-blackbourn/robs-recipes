import type { DocumentEntry, RecipeDocument } from './types';

export function makeEntry(
  path: string,
  raw: string,
  assets: Record<string, string>,
): DocumentEntry {
  const data = JSON.parse(raw) as RecipeDocument;
  if (!['Recipe', 'CreativeWork'].includes(data['@type']) || typeof data.name !== 'string')
    throw new Error(`Invalid document: ${path}`);
  const relative = path.replace(/^.*?recipes\//, '');
  const folder = relative.includes('/') ? relative.slice(0, relative.lastIndexOf('/')) : '';
  const parent = path.slice(0, path.lastIndexOf('/') + 1);
  const images = (data.image || []).map((image) => {
    const imagePath = parent + decodeURIComponent(image);
    if (!assets[imagePath]) throw new Error(`Missing image: ${imagePath}`);
    return assets[imagePath];
  });
  const searchFields = [
    data.name,
    data.recipeCuisine,
    data.recipeCategory,
    data.keywords,
    data.recipeIngredient,
    ...(data['@type'] === 'CreativeWork' ? [data.description] : []),
  ].map((value) =>
    (Array.isArray(value) ? value : [value]).filter(Boolean).join(' ').toLocaleLowerCase('en-GB'),
  );
  return {
    ...data,
    id: relative,
    folder,
    images,
    searchFields,
    search: searchFields.join(' '),
  };
}
export function filterDocuments(
  entries: DocumentEntry[],
  kind: string,
  query: string,
  folder: string,
) {
  const words = [...new Set(query.trim().toLocaleLowerCase('en-GB').split(/\s+/).filter(Boolean))];
  const filtered = entries.filter(
    (entry) =>
      entry['@type'] === (kind === 'references' ? 'CreativeWork' : 'Recipe') &&
      (!folder || entry.folder === folder || entry.folder.startsWith(folder + '/')),
  );
  if (!words.length) return filtered;
  return filtered
    .flatMap((entry) => {
      const score = Array(entry.searchFields.length).fill(0) as number[];
      for (const word of words) {
        const index = entry.searchFields.findIndex((field) => field.includes(word));
        if (index < 0) return [];
        score[index]++;
      }
      return [{ entry, score }];
    })
    .sort((a, b) => {
      // Compare highest-priority fields first; stable ties retain catalogue order.
      for (let i = 0; i < Math.max(a.score.length, b.score.length); i++) {
        const difference = (b.score[i] || 0) - (a.score[i] || 0);
        if (difference) return difference;
      }
      return 0;
    })
    .map((result) => result.entry);
}
export function duration(raw?: string): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!match) return raw;
  return (
    [
      match[1] && `${match[1]}d`,
      match[2] && `${match[2]}h`,
      match[3] && `${match[3]}m`,
      match[4] && `${match[4]}s`,
    ]
      .filter(Boolean)
      .join(' ') || raw
  );
}
