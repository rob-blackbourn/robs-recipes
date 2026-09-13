import { useEffect, useMemo, useState } from 'react';
import { entries, entryById } from './data';
import { duration, filterDocuments } from './catalog';
import {
  type Preferences,
  type DocumentEntry,
  temperatureUnits,
  type TemperatureUnit,
} from './types';
import {
  defaults,
  decodePreferences,
  encodePreferences,
  storageKey,
  resolveOptions,
  temperatureForUnits,
} from './preferences';
import { useRoute, navigate, recipeLink, safeReturn } from './navigation';
import {
  UnitSelect,
  NumberField,
  Instructions,
  SourceLink,
  TemperatureText,
  TemperatureUnitContext,
  WarningIcon,
} from './components';
import { temperatureGroups, temperatureSources } from './temperatures';
import { transformIngredient } from './ingredients';
import { densitySource } from './densities';

function folderLabel(path: string) {
  return path
    .replaceAll('/', ' / ')
    .replace(
      /(^|[\s/-])([a-z])/g,
      (_, prefix: string, letter: string) => prefix + letter.toUpperCase(),
    )
    .replace(/\bBbq\b/g, 'BBQ');
}

function readSettings() {
  try {
    return { preferences: decodePreferences(localStorage.getItem(storageKey)), available: true };
  } catch {
    return { preferences: { ...defaults }, available: false };
  }
}

export default function App() {
  const [saved, setSaved] = useState(readSettings);
  const { path, params } = useRoute();
  const save = (preferences: Preferences) => {
    let available = true;
    try {
      localStorage.setItem(storageKey, encodePreferences(preferences));
    } catch {
      available = false;
    }
    setSaved({ preferences, available });
  };
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setSaved(readSettings());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true });
  }, [path]);
  let entry: DocumentEntry | undefined;
  try {
    const relativePath = decodeURIComponent(path.replace(/^\//, ''));
    entry = entryById.get(relativePath);
    if (!entry && path.startsWith('/recipe/')) {
      const legacyPath = decodeURIComponent(path.slice(8));
      entry = entryById.get(legacyPath.endsWith('.jsonld') ? legacyPath : `${legacyPath}.jsonld`);
    }
  } catch {
    /* Unknown malformed link */
  }
  useEffect(() => {
    document.title = `${entry?.name || (path === '/settings' ? 'Settings' : path === '/references' ? 'Reference shelf' : 'Recipes')} · Rob's Recipes`;
  }, [entry, path]);
  const listing = path === '/' || path === '' || path === '/references';
  return (
    <TemperatureUnitContext.Provider value={saved.preferences.temperatureUnit}>
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#/" aria-label="Rob's Recipes home">
            <span className="brand-mark" aria-hidden="true">
              rr<span>.</span>
            </span>
            <span>Rob's Recipes</span>
          </a>
          <nav aria-label="Main navigation">
            <a className={path !== '/references' && path !== '/settings' ? 'active' : ''} href="#/">
              Recipes
            </a>
            <a className={path === '/references' ? 'active' : ''} href="#/references">
              Reference Shelf
            </a>
            <a className={path === '/settings' ? 'active' : ''} href="#/settings">
              Settings
            </a>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {listing ? (
          <Catalogue
            kind={path === '/references' ? 'references' : 'recipes'}
            params={params}
            path={path || '/'}
          />
        ) : path === '/settings' ? (
          <Settings preferences={saved.preferences} save={save} available={saved.available} />
        ) : entry ? (
          <Recipe
            key={entry.id}
            entry={entry}
            preferences={saved.preferences}
            params={params}
            path={path}
          />
        ) : (
          <section className="empty">
            <span className="eyebrow">NOT FOUND</span>
            <h1>This page isn’t in the collection.</h1>
            <p>The recipe may have moved, or the link may be incomplete.</p>
            <a className="button primary" href="#/">
              Browse recipes
            </a>
          </section>
        )}
      </main>
      <footer className="site-footer">
        <span>Rob's Recipes</span>
        <a href="#/settings">Your cooking preferences</a>
      </footer>
    </TemperatureUnitContext.Provider>
  );
}

function Catalogue({
  kind,
  params,
  path,
}: {
  kind: string;
  params: URLSearchParams;
  path: string;
}) {
  const query = params.get('q') || '';
  const folder = params.get('folder') || '';
  const [filtersOpen, setFiltersOpen] = useState(false);
  const results = useMemo(
    () => filterDocuments(entries, kind, query, folder),
    [kind, query, folder],
  );
  const base = entries.filter(
    (entry) => entry['@type'] === (kind === 'references' ? 'CreativeWork' : 'Recipe'),
  );
  const roots = Array.from(
    new Set(base.map((entry) => entry.folder.split('/')[0]).filter(Boolean)),
  ).sort();
  const folders = Array.from(
    new Set(
      base
        .flatMap((entry) =>
          entry.folder.split('/').map((_, i, segments) => segments.slice(0, i + 1).join('/')),
        )
        .filter(Boolean),
    ),
  ).sort();
  const pages = Math.max(1, Math.ceil(results.length / 36));
  const page = Math.min(pages, Math.max(1, Number.parseInt(params.get('page') || '1') || 1));
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    navigate(path, next, true);
  };
  const from = '#' + path + (params.size ? '?' + params : '');
  return (
    <div className="catalogue layout">
      <aside className={`sidebar ${filtersOpen ? 'open' : ''}`} aria-label="Collection filters">
        <div className="sidebar-title">
          THE COLLECTION <span>{base.length}</span>
        </div>
        <button
          className={!folder ? 'folder active-folder' : 'folder'}
          onClick={() => update('folder', '')}
        >
          <span>All {kind === 'recipes' ? 'recipes' : 'references'}</span>
          <span>{base.length}</span>
        </button>
        <div className="folder-list">
          {roots.map((root) => (
            <button
              key={root}
              className={
                folder === root || folder.startsWith(root + '/') ? 'folder active-folder' : 'folder'
              }
              onClick={() => update('folder', root)}
            >
              <span>{folderLabel(root)}</span>
              <span>
                {
                  base.filter(
                    (entry) => entry.folder === root || entry.folder.startsWith(root + '/'),
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
        <label className="field subfolders">
          <span>Choose a subfolder</span>
          <select value={folder} onChange={(event) => update('folder', event.target.value)}>
            <option value="">All folders</option>
            {folders.map((f) => (
              <option key={f} value={f}>
                {folderLabel(f)}
              </option>
            ))}
          </select>
        </label>
        <div className="sidebar-note">
          <span aria-hidden="true">↗</span>
          <p>
            Cook for your table.
            <br />
            <a href="#/settings">Set your units & servings</a>
          </p>
        </div>
      </aside>
      <section className="catalogue-content">
        <div className="page-heading">
          <span className="eyebrow">
            {kind === 'recipes' ? 'FIND YOUR NEXT FAVOURITE' : 'A LITTLE KITCHEN KNOW-HOW'}
          </span>
          <h1>{kind === 'recipes' ? 'What’s cooking?' : 'The reference shelf.'}</h1>
          <p>
            {kind === 'recipes'
              ? 'Familiar favourites and something new. Find a recipe and make it yours.'
              : 'Ingredient notes, useful measures, and the details worth keeping.'}
          </p>
        </div>
        <div className="search-row">
          <label className="search">
            <span className="sr-only">
              {kind === 'recipes' ? 'Search recipes' : 'Search references'}
            </span>
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 5 5" />
            </svg>
            <input
              type="search"
              placeholder={
                kind === 'recipes'
                  ? 'Search recipes, ingredients, keywords, or folders…'
                  : 'Search reference notes…'
              }
              value={query}
              onChange={(event) => update('q', event.target.value)}
            />
          </label>
          <button
            className="mobile-filter"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            Folders {filtersOpen ? '−' : '+'}
          </button>
        </div>
        <div className="results-bar">
          <p role="status">
            <strong>{results.length}</strong> {kind === 'recipes' ? 'recipes' : 'references'}
            {folder && (
              <>
                {' '}
                in <strong>{folderLabel(folder)}</strong>
              </>
            )}
          </p>
          {query || folder ? (
            <button
              className="text-button"
              onClick={() => navigate(path, new URLSearchParams(), true)}
            >
              Clear filters
            </button>
          ) : (
            <span>A–Z</span>
          )}
        </div>
        {results.length ? (
          <div className="recipe-list">
            {results.slice((page - 1) * 36, page * 36).map((entry) => (
              <a className="recipe-card" key={entry.id} href={recipeLink(entry.id, from)}>
                <div className="recipe-card-body">
                  <span className="card-folder">{folderLabel(entry.folder) || 'Collection'}</span>
                  <h2>{entry.name}</h2>
                  <div className="card-meta">
                    {entry.recipeYield && <span>Yield: {entry.recipeYield}</span>}
                    {(entry.totalTime || entry.cookTime || entry.prepTime) && (
                      <span>
                        {entry.totalTime ? 'Total' : entry.cookTime ? 'Cook' : 'Prep'}{' '}
                        {duration(entry.totalTime || entry.cookTime || entry.prepTime)}
                      </span>
                    )}
                    {entry['@type'] === 'CreativeWork' && <span>Reference note</span>}
                  </div>
                </div>
                <span className="card-arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>No recipes on this shelf.</h2>
            <p>Try a different ingredient or clear your filters.</p>
            <button onClick={() => navigate(path, new URLSearchParams(), true)}>
              Clear filters
            </button>
          </div>
        )}
        {pages > 1 && (
          <nav className="pagination" aria-label="Results pages">
            <button
              disabled={page === 1}
              onClick={() => {
                update('page', String(page - 1));
                window.scrollTo(0, 0);
              }}
            >
              ← Previous
            </button>
            <span>
              Page {page} of {pages}
            </span>
            <button
              disabled={page === pages}
              onClick={() => {
                update('page', String(page + 1));
                window.scrollTo(0, 0);
              }}
            >
              Next →
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}

function Settings({
  preferences,
  save,
  available,
}: {
  preferences: Preferences;
  save: (prefs: Preferences) => void;
  available: boolean;
}) {
  const [resetVersion, setResetVersion] = useState(0);
  return (
    <section className="settings-page narrow">
      <a className="back-link" href="#/">
        ← Back to recipes
      </a>
      <div className="page-heading">
        <span className="eyebrow">MAKE YOURSELF AT HOME</span>
        <h1>Your kitchen, your way.</h1>
        <p>Set your everyday preferences. You can always adjust an individual recipe.</p>
      </div>
      <div className="settings-panel">
        <h2>Cooking preferences</h2>
        <UnitSelect
          label="Preferred units"
          value={preferences.units}
          onChange={(units) =>
            save({
              ...preferences,
              units,
              temperatureUnit: temperatureForUnits(units, preferences.temperatureUnit),
            })
          }
        />
        <label className="field">
          <span>Preferred temperature unit</span>
          <select
            value={temperatureForUnits(preferences.units, preferences.temperatureUnit)}
            disabled={preferences.units === 'customary' || preferences.units === 'customary-cups'}
            onChange={(event) =>
              save({ ...preferences, temperatureUnit: event.target.value as TemperatureUnit })
            }
            aria-describedby="temperature-help"
          >
            {Object.entries(temperatureUnits).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <small id="temperature-help">
            US Customary uses Fahrenheit. Gas Marks are approximate conventional oven settings.
            Other temperatures, including fan-only settings and temperatures outside the Gas Mark
            range, use Celsius.
          </small>
        </label>
        <NumberField
          key={resetVersion}
          label="Default servings"
          value={preferences.servings}
          optional
          onChange={(servings) => save({ ...preferences, servings })}
          hint="Leave blank to keep each recipe’s original yield."
        />
        <p className="help">
          Your serving preference applies only when a recipe explicitly says serves, servings,
          portions, or people. Bare numbers, ranges, loaves, pieces, and other yields stay as
          written.
        </p>
        <div className="settings-actions">
          <span className={available ? 'save-status' : 'error'} role="status">
            {available
              ? '✓ Saved automatically in this browser'
              : 'Preferences are kept for this session. Browser storage is unavailable.'}
          </span>
          <button
            onClick={() => {
              save({ ...defaults });
              setResetVersion((value) => value + 1);
            }}
          >
            Reset settings
          </button>
        </div>
      </div>
      <div className="settings-info">
        <h2>A note on measures</h2>
        <p>
          A 250 ml cup, an imperial cup (about 284 ml), and a US cup (about 237 ml) are different
          sizes. Your choice controls the output; original recipes use the collection’s conventions
          unless you override them on the recipe page.
        </p>
        <p>
          The “with cups and spoons” options keep weights in the selected system and use cups,
          tablespoons, and teaspoons for volumes. Metric and Imperial options use 15 ml tablespoons
          and 5 ml teaspoons; US Customary uses US spoons.
        </p>
        <p>
          Metric quantities of 5 g or ml and above round to the nearest 5: 158 g becomes 160 g.
          Smaller amounts retain finer precision. Customary quantities use simple fractions,
          including thirds. Weight-to-cup conversions are estimates and are available only for
          recognised ingredients.
        </p>
        <p>
          These preferences are stored on this browser only. There is no account or cloud syncing.
        </p>
      </div>
    </section>
  );
}

function Recipe({
  entry,
  preferences,
  params,
  path,
}: {
  entry: DocumentEntry;
  preferences: Preferences;
  params: URLSearchParams;
  path: string;
}) {
  const options = resolveOptions(entry.recipeYield, preferences, params);
  const { info, units, factor, conventions, baseline, targetUnit } = options;
  const [resetVersion, setResetVersion] = useState(0);
  const [ingredientsOpen, setIngredientsOpen] = useState(true);
  const [methodOpen, setMethodOpen] = useState(true);
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) =>
      value === null ? next.delete(key) : next.set(key, value),
    );
    navigate(path, next, true);
  };
  const resetPage = () => {
    const next = new URLSearchParams(params);
    for (const key of [
      'yield',
      'baseline',
      'factor',
      'units',
      'cup',
      'liquid',
      'spoon',
      'yieldUnit',
    ])
      next.delete(key);
    navigate(path, next, true);
    setChecked(new Set());
    setIngredientsOpen(true);
    setMethodOpen(true);
    setResetVersion((version) => version + 1);
  };
  const effectiveYield = baseline
    ? baseline * factor * (info?.unit && targetUnit ? info.unit.factor / targetUnit.factor : 1)
    : undefined;
  const lines = (entry.recipeIngredient || []).map((line) =>
    transformIngredient(line, factor, units, conventions),
  );
  const issues = lines.filter((line) => line.issue).length;
  const usedDensities = [
    ...new Map(
      lines.filter((line) => line.density).map((line) => [line.density!.name, line.density!]),
    ).values(),
  ];
  const isRecipe = entry['@type'] === 'Recipe';
  const hasTemperatures =
    temperatureGroups(
      JSON.stringify([
        entry.recipeInstructions,
        entry.recipeIngredient,
        entry.comment,
        entry.description,
        entry.tool,
      ]),
    ).length > 0;
  const citations = typeof entry.citation === 'string' ? [entry.citation] : entry.citation || [];
  return (
    <TemperatureUnitContext.Provider
      value={temperatureForUnits(units, preferences.temperatureUnit)}
    >
      <article className="recipe-page narrow-wide" key={resetVersion}>
        <div className="recipe-topbar">
          <a className="back-link" href={safeReturn(params.get('from'))}>
            ← Back to {isRecipe ? 'recipes' : 'references'}
          </a>
          <button onClick={() => window.print()}>
            Print {isRecipe ? 'recipe' : 'reference'} <span aria-hidden="true">↗</span>
          </button>
        </div>
        <header className="recipe-heading">
          <span className="eyebrow">{folderLabel(entry.folder) || 'THE COLLECTION'}</span>
          <h1>{entry.name}</h1>
          {isRecipe && entry.description && (
            <p>
              <TemperatureText text={entry.description} />
            </p>
          )}
          <dl className="recipe-meta">
            {isRecipe && (
              <NumberField
                metadata
                plain
                label="Yield"
                unit={
                  info ? (info.servings ? 'servings' : targetUnit?.name || info.label) : 'servings'
                }
                value={info ? effectiveYield : options.target}
                hint={
                  !baseline
                    ? 'This recipe has no known yield; ingredient quantities cannot be scaled.'
                    : undefined
                }
                onChange={(value) => update({ yield: String(value), factor: null })}
              />
            )}
            {[
              ['Prep', entry.prepTime],
              ['Cook', entry.cookTime],
              ['Total', entry.totalTime],
            ].map(
              ([name, time]) =>
                time && (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{duration(time)}</dd>
                  </div>
                ),
            )}
            {isRecipe && (
              <>
                <UnitSelect metadata value={units} onChange={(value) => update({ units: value })} />
                <div className="reset-meta">
                  <dt className="sr-only">Page controls</dt>
                  <dd>
                    <button type="button" className="text-button" onClick={resetPage}>
                      Reset page
                    </button>
                  </dd>
                </div>
              </>
            )}
          </dl>
        </header>
        {entry.images.length > 0 && (
          <div className="recipe-images">
            {entry.images.map((url, i) => (
              <img
                src={url}
                alt={`${entry.name}${entry.images.length > 1 ? ` — image ${i + 1}` : ''}`}
                key={url}
                loading="lazy"
              />
            ))}
          </div>
        )}
        {isRecipe && (
          <>
            {options.error && (
              <p className="notice" role="alert">
                {options.error}
              </p>
            )}
            {factor !== 1 && (
              <p className="notice">
                Ingredient amounts are scaled. Cooking times, temperature settings, and quantities
                mentioned in the method do not change with the yield.
              </p>
            )}
            {issues > 0 && (
              <p className="notice">
                <WarningIcon /> {issues} ingredient{' '}
                {issues === 1 ? 'quantity needs' : 'quantities need'} checking. Ingredients marked
                with this icon could not be scaled or converted and remain as written.
              </p>
            )}
            <div className="cooking-layout">
              <section className="ingredients">
                <div className="section-heading">
                  <h2>
                    <button
                      className="section-toggle"
                      aria-expanded={ingredientsOpen}
                      aria-controls="ingredients-content"
                      onClick={() => setIngredientsOpen((open) => !open)}
                    >
                      Ingredients <span aria-hidden="true">{ingredientsOpen ? '−' : '+'}</span>
                    </button>
                  </h2>
                </div>
                <div id="ingredients-content" className="cooking-content" hidden={!ingredientsOpen}>
                  {!lines.length && <p className="notice">No ingredient list is available.</p>}
                  <ul className="ingredient-list">
                    {lines.map((line, index) => (
                      <li
                        key={index}
                        className={checked.has(index) ? 'checked' : ''}
                        onClick={(event) => {
                          if ((event.target as HTMLElement).closest('details')) return;
                          setChecked((previous) => {
                            const next = new Set(previous);
                            if (next.has(index)) next.delete(index);
                            else next.add(index);
                            return next;
                          });
                        }}
                      >
                        <button
                          type="button"
                          className="ingredient-toggle"
                          aria-pressed={checked.has(index)}
                        >
                          <span>
                            {line.density && <span aria-label="Approximate">≈ </span>}
                            <TemperatureText text={line.text} allowGas={false} />
                          </span>
                          {line.issue && <WarningIcon message={`Check quantity: ${line.issue}`} />}
                        </button>
                        {line.note && <small className="ingredient-note">{line.note}</small>}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
              <section className="method">
                <h2>
                  <button
                    className="section-toggle"
                    aria-expanded={methodOpen}
                    aria-controls="method-content"
                    onClick={() => setMethodOpen((open) => !open)}
                  >
                    Method <span aria-hidden="true">{methodOpen ? '−' : '+'}</span>
                  </button>
                </h2>
                <div id="method-content" className="cooking-content" hidden={!methodOpen}>
                  {entry.recipeInstructions?.length ? (
                    <Instructions steps={entry.recipeInstructions} />
                  ) : (
                    <p className="notice">No preparation steps are available.</p>
                  )}
                  {entry.tool?.length ? (
                    <section className="notes">
                      <h3>Equipment</h3>
                      <ul>
                        {entry.tool.map((tool, i) => (
                          <li key={i}>
                            <TemperatureText text={tool.name} allowGas={false} />
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {entry.comment?.length ? (
                    <section className="notes">
                      <h3>Recipe notes</h3>
                      {entry.comment.map((comment, i) => (
                        <p key={i}>
                          <TemperatureText text={comment.text} />
                        </p>
                      ))}
                    </section>
                  ) : null}
                </div>
              </section>
            </div>
            {usedDensities.length > 0 && (
              <details className="density-notes">
                <summary>Approximate cup conversions used</summary>
                <p>
                  Ingredient weights vary with preparation and packing. These estimates use a US
                  customary cup.
                </p>
                <ul>
                  {usedDensities.map((d) => (
                    <li key={d.name}>
                      {d.name}: {d.gramsPerCup} g per US cup.
                    </li>
                  ))}
                </ul>
                <a href={densitySource} target="_blank" rel="noreferrer">
                  Source: King Arthur Baking ingredient weight chart ↗
                </a>
              </details>
            )}
            {hasTemperatures && (
              <details className="temperature-notes">
                <summary>About temperature conversions</summary>
                <p>
                  Your preferred temperature unit is selected in Settings and also used when
                  printing. Celsius is the recipe’s stored temperature. Fahrenheit values are
                  rounded to the nearest 10°F. Gas Marks are approximate conventional-oven settings,
                  not frying or internal food temperatures. Fan temperatures stay labelled
                  separately.
                </p>
                <p>
                  Existing Celsius values take precedence where the original equivalents disagree.
                </p>
                <p>
                  <a href={temperatureSources.fahrenheit} target="_blank" rel="noreferrer">
                    Celsius/Fahrenheit formula (NIST)
                  </a>{' '}
                  ·{' '}
                  <a href={temperatureSources.gas} target="_blank" rel="noreferrer">
                    Oven settings (Delia)
                  </a>{' '}
                  ·{' '}
                  <a href={temperatureSources.lowGas} target="_blank" rel="noreferrer">
                    Low Gas Marks (AEG)
                  </a>
                </p>
              </details>
            )}
          </>
        )}
        {!isRecipe && (
          <section className="reference-text">
            <h2>Reference notes</h2>
            <div className="source-text">{entry.description}</div>
          </section>
        )}
        {citations.length > 0 && (
          <section className="citations">
            <h2>Sources</h2>
            <ul>
              {citations.map((citation, i) => (
                <li key={i}>
                  <SourceLink text={citation} currentId={entry.id} />
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="recipe-end">From the collection · {entry.folder || 'Recipes'}</p>
      </article>
    </TemperatureUnitContext.Provider>
  );
}
