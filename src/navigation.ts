import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}
export function useRoute() {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash || '#/',
    () => '#/',
  );
  const separator = hash.indexOf('?');
  const path = hash.slice(1, separator < 0 ? undefined : separator);
  return { path, params: new URLSearchParams(separator < 0 ? '' : hash.slice(separator + 1)) };
}
export function navigate(path: string, params = new URLSearchParams(), replace = false) {
  const hash = '#' + path + (params.size ? '?' + params.toString() : '');
  if (replace) {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else window.location.hash = hash;
}
export function recipeLink(id: string, from: string) {
  return `#/${id.split('/').map(encodeURIComponent).join('/')}?${new URLSearchParams({ from })}`;
}
export function safeReturn(raw: string | null) {
  return raw && /^#\/(?:references)?(?:\?|$)/.test(raw) ? raw : '#/';
}

export function citationLink(text: string, currentId: string): string {
  if (/^https?:\/\//i.test(text)) return text;
  if (text.startsWith('#/')) return text;
  const base = `https://recipe.invalid/${currentId.split('/').map(encodeURIComponent).join('/')}`;
  const destination = new URL(text, base);
  return `#${destination.pathname}${destination.search}`;
}
