# Recipe Collection

A static cookbook built with React, TypeScript, and Vite. Browse the JSON-LD collection, search by ingredient or folder, adjust yields, convert measurements, and print recipes. Settings are saved automatically in the current browser; no server or account is required.

## Run locally

Use Node.js 24 LTS (minimum 22.12).

```sh
npm ci
npm run dev
```

Open the address printed by Vite. For a production build:

```sh
npm run build
npm run preview
```

The distributable site is `dist/`. For hosting under a subdirectory, build with `BASE_PATH=/your-repository/ npm run build`. Recipe and settings links use hash routes, so refreshing a deep link needs no server rewrite.

## Adding content

Keep `.jsonld` documents inside `recipes/`, using lowercase folder names and kebab-case filenames (for example, `chicken-cacciatore.jsonld`). Vite includes them in the next build. `Recipe` documents appear in the cookbook; `CreativeWork` documents appear on the reference shelf. Keep `name` and `@type`, and use the existing schema.org fields for ingredients, instructions, yield, and metadata. `HowToSection` instruction groups are supported recursively.

Image paths are relative to the document, pointing into adjacent `.assets` folders. PNG, JPG, JPEG, and WebP are supported; both literal and percent-encoded filenames work. Missing image files fail the build. Spreadsheets are not published.

The document's relative path is its link ID. Duplicate titles remain distinct; moving or renaming a file changes its link. Original source text is always available on the detail page. The application never rewrites recipe files.

The collection tests currently assert 413 recipes, six references, and 12 images. Update these expected counts when intentionally adding or removing content.

## Preferences and scaling

Settings contains preferred output units and an optional default serving count. Valid changes save immediately under the versioned `recipe-collection.preferences.v1` localStorage key. Invalid entries do not overwrite saved values. Corrupt or unknown storage versions fall back to defaults. If storage is disabled, preferences remain available until the page is reloaded.

Automatic serving scaling applies only to a single, explicit `serves`, `servings`, `portions`, or `people` yield. A bare `4`, a range such as `4–6 servings`, or `20 pieces` is not automatically scaled. The recipe header provides editable required yield and display units. Recipes without a known baseline cannot be scaled. Advanced baseline and yield-unit overrides remain supported in URLs.

Explicit recipe URL overrides take precedence over preferences, then original values. Opening a recipe without URL overrides uses saved preferences. Search and folder selections survive the return from a recipe. Ingredient checks last for the current recipe view and are not persisted.

Scaling changes ingredient quantities only. Package counts change while package sizes remain fixed. Cooking times, temperature settings, preparation dimensions, and quantities in instruction text do not change with the yield. Unrecognised or contradictory quantities are retained and flagged when scaling. Qualitative amounts such as “a handful” require judgement.

## Temperatures

Structured recipe instructions, ingredients, and notes use Celsius (`°C`). Settings lets you choose Celsius (the default), Fahrenheit, or Gas Mark. Recipe pages and printouts show the selected unit, independently of ingredient units, yield scaling, and kitchen quantity rounding. The preference is saved in this browser; older saved settings default to Celsius.

Existing Celsius values take precedence when the source's equivalents disagree. Fahrenheit-only temperatures use `(°F − 32) / 1.8`, stored to one decimal place; displayed Fahrenheit is rounded to the nearest 10°F. Fan-oven temperatures remain explicitly labelled in Celsius and Fahrenheit modes. Gas Mark mode uses the conventional oven setting when both conventional and fan settings are provided. Fan-only settings, frying, sauce, internal food temperatures, and temperatures outside the supported Gas Mark range fall back to Celsius. Gas Marks are approximate.

Gas Marks use the approximate conventional-oven table from [Delia's conversion guide](https://www.deliaonline.com/information-centre/oven-temperatures-and-conversions), with the quarter and half marks rounded from [AEG's low-temperature settings](https://support.aeg.co.uk/support-articles/article/what-do-the-gas-mark-numbers-mean-relate-to-temperatures). Fahrenheit conversion follows [NIST's formula](https://www.nist.gov/pml/owm/si-units-temperature). Top-level source `text` fields have been removed; structured instructions and notes retain their nested `text` fields. Reference documents use `description`.

After adding recipes, check or normalize their structured temperature notation:

```sh
npm run normalize:temperatures
npm run normalize:temperatures -- --write
```

The check exits nonzero if changes are needed; `--details` lists affected fields. The normalizer preserves other recipe fields. Gas-only instructions without oven context gain an `(oven)` label so the site can distinguish an oven dial from an oil or food temperature.

## Measurement conventions

Output modes: Original, Metric, Imperial, US customary, Metric with cups and spoons, Imperial with cups and spoons, US Customary with cups and spoons, Cups — 250 ml, Cups — imperial (284.130625 ml), and Cups — US (236.5882365 ml).

The three “with cups and spoons” modes preserve weights in their selected system and display volumes as cups, tablespoons, or teaspoons. They use 250 ml, imperial, or US cups respectively. Metric and Imperial modes use 15 ml tablespoons and 5 ml teaspoons; US Customary uses US spoons. These modes do not infer weight-to-volume conversions.

US customary output uses pounds and ounces for weight, and US gallons, quarts, pints, cups, fluid ounces, tablespoons, or teaspoons for volume, with simple fractions. Unlike Cups — US, it keeps weights as weights.

Unspecified source cups default to 250 ml, tablespoons to 15 ml, teaspoons to 5 ml, and liquid ounces/pints/quarts/gallons to UK imperial. Recipe URL overrides independently allow US/imperial cups, UK/US liquids, and metric/US/Australian spoons (Australian tablespoons are 20 ml). Explicit source-system labels take precedence. Changing preferred output units does not reinterpret source measures.

Mass and volume conversions use conventional definitions (avoirdupois ounce: 28.349523125 g; UK pint: 568.26125 ml; US customary cup: 236.5882365 ml). See [NIST conversion tables](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b8).

Weight-to-volume conversions require a recognised ingredient. The bundled approximate table covers specified flour and sugar varieties, butter, honey, and rolled oats, with values from the [King Arthur Baking ingredient weight chart](https://www.kingarthurbaking.com/learn/ingredient-weight-chart). Packing and preparation matter: plain “flour”, unspecified brown sugar, clarified butter, and ambiguous alternatives do not receive inferred densities. Each estimate identifies its ingredient and grams per US customary cup. Unsupported weights remain weights in cup mode. This table is local and makes no runtime requests.

### Rounding

Calculations always start from original amounts with full internal precision. Only the displayed result is rounded:

| Amount in grams or millilitres | Increment |
| ------------------------------ | --------- |
| 100 and above                  | 10        |
| 20 to below 100                | 5         |
| 1 to below 20                  | 1         |
| Below 1                        | 0.1       |

For example, 158 g becomes 160 g, 43 ml becomes 45 ml, and 12.6 g becomes 13 g. Kilograms and litres are selected after rounding when the base amount reaches 1,000. Tiny positive amounts display as `<0.1 g` or `<0.1 ml`, never zero.

Customary amounts and counts use whole/mixed numbers with fractional parts 1/8, 1/4, 1/3, 1/2, 2/3, 3/4, and 7/8. The nearest allowed value is selected, with ties rounded up. Cup output uses tablespoons below one cup, and teaspoons below one tablespoon. US cup mode uses US spoons; other cup modes use 15/5 ml spoons. Tiny positive measures display as `<1/8` of the smallest supported unit. Equivalent displayed range endpoints collapse to one amount. Original units at the original yield preserve source text exactly.

## Checks

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests build and serve the production site under `/test-kitchen/`, verifying repository-path hosting as well as desktop/mobile browsing, preferences, recipe overrides, images, printing, and keyboard access. To use an installed Chromium-compatible browser, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/browser` when running browser tests. The browser test build replaces `dist/`; run `npm run build` again before deploying it manually at a different base path.

## GitHub Pages

Connect this repository to GitHub, push the files, and enable **Settings → Pages → Source → GitHub Actions**. The included workflow checks pull requests and builds/deploys pushes to `main` (also available through manual dispatch on `main`). It obtains the deployment base path from Pages configuration, runs unit and browser tests, then publishes the production artifact. See [Vite's Pages deployment guide](https://vite.dev/guide/static-deploy).

The application has no backend, editing interface, account, favourites, cloud preference syncing, or manual density overrides.
