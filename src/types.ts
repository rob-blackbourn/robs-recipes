export interface Step {
  '@type': 'HowToStep' | 'HowToSection';
  text?: string;
  name?: string;
  itemListElement?: Step[];
}

export interface RecipeDocument {
  '@context': string;
  '@type': 'Recipe' | 'CreativeWork';
  name: string;
  text: string;
  description?: string;
  recipeCuisine?: string;
  recipeYield?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeIngredient?: string[];
  recipeInstructions?: Step[];
  comment?: { text: string }[];
  tool?: { name: string }[];
  citation?: string | string[];
  image?: string[];
}

export interface DocumentEntry extends RecipeDocument {
  id: string;
  folder: string;
  images: string[];
  search: string;
}

export const unitModes = {
  original: 'Original',
  metric: 'Metric',
  imperial: 'Imperial',
  'cups-metric': 'Cups — 250 ml',
  'cups-imperial': 'Cups — imperial',
  'cups-us': 'Cups — US',
} as const;
export type UnitMode = keyof typeof unitModes;
export interface Preferences {
  units: UnitMode;
  servings: number | null;
}
export interface Conventions {
  cup: 'metric' | 'imperial' | 'us';
  liquid: 'uk' | 'us';
  spoon: 'metric' | 'us' | 'australian';
}
export const defaultConventions: Conventions = { cup: 'metric', liquid: 'uk', spoon: 'metric' };
