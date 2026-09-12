# Recipe conversion

Converted all 419 DOCX documents to UTF-8 JSON-LD (.jsonld) beside their original locations: 413 Recipe objects and six CreativeWork reference documents. Extracted 12 embedded images into adjacent .assets folders. Original DOCX files were removed after verification.

Every JSON-LD object includes the complete extracted document text in `text`, preserving original wording, section headings, notes, and metadata. Recipe ingredients, instruction steps and sections, yields, equipment, and explicit durations are also structured. Ingredient group names prefix their ingredient strings. Exact times use ISO 8601 durations; ranges and qualified times remain in comments and source text. Missing data is not invented.

Validation: all 419 outputs parsed successfully; extracted source text was checked against every output, and all 12 images were checked byte-for-byte before source removal.

## Reference documents

- Recipes/Appendix/Cups & Spoons.jsonld
- Recipes/Drinks/Cider/Notes.jsonld
- Recipes/French/Sauces/Butter/Savoury Butters.jsonld
- Recipes/Japanese/Ingredients/Katsuobushi.jsonld
- Recipes/Japanese/Ingredients/Kombu.jsonld
- Recipes/Japanese/Ingredients/Niboshi.jsonld

## Incomplete source recipes

These originals lack an ingredient list or preparation instructions; the converted files retain the available content.

- Recipes/French/Seafood/Dover Sole/Fillets of Sole with Cream and Mushroom Sauce.jsonld
- Recipes/French/Suasages/Mergeuz Spice Blend.jsonld
- Recipes/French/Suasages/Merguez Sausages 2.jsonld
- Recipes/Italian/Salsa/Tomato Salsa.jsonld
- Recipes/Japanese/Gyoza with Pan Roasted Duck Breast.jsonld
- Recipes/Japanese/Pork/Gyoza.jsonld
- Recipes/Japanese/Tempura/Asparagus.jsonld
- Recipes/Japanese/Tempura/Aubergine.jsonld
- Recipes/Japanese/Tempura/Sweet potato.jsonld

The green chicken curry from Books/Thai Food has an empty “Make the paste” heading in the source. It is retained in the full text; no preparation steps have been invented.
