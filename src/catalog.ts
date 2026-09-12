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
  return {
    ...data,
    id: relative.replace(/\.jsonld$/, ''),
    folder,
    images,
    search: [
      data.name,
      folder,
      ...(data['@type'] === 'Recipe' ? data.recipeIngredient || [] : [data.description]),
    ]
      .join(' ')
      .toLocaleLowerCase('en-GB'),
  };
}
export function filterDocuments(
  entries: DocumentEntry[],
  kind: string,
  query: string,
  folder: string,
) {
  const words = query.trim().toLocaleLowerCase('en-GB').split(/\s+/).filter(Boolean);
  return entries.filter(
    (entry) =>
      entry['@type'] === (kind === 'references' ? 'CreativeWork' : 'Recipe') &&
      (!folder || entry.folder === folder || entry.folder.startsWith(folder + '/')) &&
      words.every((word) => entry.search.includes(word)),
  );
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
