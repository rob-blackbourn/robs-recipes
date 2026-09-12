# Recipe conversion

Converted all 419 DOCX documents to UTF-8 JSON-LD (.jsonld) beside their original locations: 413 Recipe objects and six CreativeWork reference documents. Extracted 12 embedded images into adjacent .assets folders. Original DOCX files were removed after verification.

Every JSON-LD object includes the complete extracted document text in `text`, preserving original wording, section headings, notes, and metadata. Recipe ingredients, instruction steps and sections, yields, equipment, and explicit durations are also structured. Ingredient group names prefix their ingredient strings. Exact times use ISO 8601 durations; ranges and qualified times remain in comments and source text. Missing data is not invented.

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
