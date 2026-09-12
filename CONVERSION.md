# Recipe conversion

Converted all 419 DOCX documents to UTF-8 JSON-LD (.jsonld) beside their original locations: 413 Recipe objects and six CreativeWork reference documents. Extracted 12 embedded images into adjacent .assets folders. Original DOCX files were removed after verification.

Every JSON-LD object includes extracted document text in `text`, preserving original wording, section headings, notes, and metadata except preparation- and cooking-time lines moved into `prepTime` and `cookTime`. Recipe ingredients, instruction steps and sections, yields, equipment, and explicit durations are also structured. Repeated ingredient group prefixes are removed from unique ingredients. For ingredients repeated within a recipe, their group label is retained in parentheses at the end of the line. Exact times use ISO 8601 durations. Preparation-time ranges and qualified times are preserved verbatim in `prepTime`; comments retain their original wording. Preparation-time lines are removed from source text when migrated into `prepTime`. Missing data is not invented.

Validation: all 419 outputs parsed successfully; extracted source text was checked against every output, and all 12 images were checked byte-for-byte before source removal.

## Reference documents

- recipes/Appendix/cups-spoons.jsonld
- recipes/Drinks/Cider/notes.jsonld
- recipes/French/Sauces/Butter/savoury-butters.jsonld
- recipes/Japanese/Ingredients/katsuobushi.jsonld
- recipes/Japanese/Ingredients/kombu.jsonld
- recipes/Japanese/Ingredients/niboshi.jsonld

## Incomplete source recipes

These originals lack an ingredient list or preparation instructions; the converted files retain the available content.

- recipes/French/Seafood/Dover Sole/fillets-of-sole-with-cream-and-mushroom-sauce.jsonld
- recipes/French/Suasages/mergeuz-spice-blend.jsonld
- recipes/French/Suasages/merguez-sausages-2.jsonld
- recipes/Italian/Salsa/tomato-salsa.jsonld
- recipes/Japanese/gyoza-with-pan-roasted-duck-breast.jsonld
- recipes/Japanese/Pork/gyoza.jsonld
- recipes/Japanese/Tempura/asparagus.jsonld
- recipes/Japanese/Tempura/aubergine.jsonld
- recipes/Japanese/Tempura/sweet-potato.jsonld

The green chicken curry from Books/Thai Food has an empty “Make the paste” heading in the source. It is retained in the full text; no preparation steps have been invented.

To populate missing preparation times from labelled source text, run `node scripts/normalize-prep-times.mjs --write`. Without `--write`, the script checks for missing values. Newly migrated preparation-time lines are removed from `text`. Existing preparation times are preserved; blank and unknown values remain unset.

To migrate cooking times, run `node scripts/normalize-cook-times.mjs --write` (omit `--write` for a check). Exact durations, including fractional hours, use ISO 8601; ranges and qualified wording are preserved. Matching cooking-time lines are removed from `text`, including when `cookTime` already exists. Conflicting values are reported and preserved for review; blank and unknown values remain unchanged.

Duplicate yield lines already captured in `recipeYield` are removed from `text`. Run `node scripts/remove-duplicate-yields.mjs --write` to repeat this cleanup (omit `--write` for a check). Conflicting values are preserved.

Top-level `text` fields have now been removed from all 419 documents. Structured recipe steps and notes retain their nested `text` fields. Reference pages use `description`. The source-text migration scripts above are retained for importing future documents that still contain source text.

Recipe yields are normalized to a number followed by a unit. Bare numbers use servings; ranges use the upper bound with the original wording retained in a comment. Unknown yields remain unset and are listed in `reports/recipe-yield-audit.md`. Descriptions of how much meat a marinade or seasoning treats are retained in comments instead of being treated as the finished yield. The combined half-cup plus tablespoon yield uses the collection’s 250 ml cup and 15 ml tablespoon conventions (140 ml).
