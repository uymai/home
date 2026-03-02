import fs from 'fs';
import path from 'path';

import type { Recipe } from '../app/recipes/types';

export function isValidRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const recipe = value as Partial<Recipe> & { macros?: Partial<Recipe['macros']> };

  return (
    typeof recipe.title === 'string' &&
    typeof recipe.description === 'string' &&
    typeof recipe.prepTime === 'string' &&
    typeof recipe.cookTime === 'string' &&
    typeof recipe.servings === 'number' &&
    typeof recipe.difficulty === 'string' &&
    Array.isArray(recipe.tags) &&
    recipe.tags.every((tag) => typeof tag === 'string') &&
    Array.isArray(recipe.ingredients) &&
    recipe.ingredients.every((ingredient) => typeof ingredient === 'string') &&
    Array.isArray(recipe.instructions) &&
    recipe.instructions.every((instruction) => typeof instruction === 'string') &&
    (recipe.notes === undefined || typeof recipe.notes === 'string') &&
    recipe.macros !== undefined &&
    typeof recipe.macros.calories === 'number' &&
    typeof recipe.macros.protein === 'number' &&
    typeof recipe.macros.carbs === 'number' &&
    typeof recipe.macros.fat === 'number'
  );
}

export function loadRecipesFromDirectory(recipesDir: string): Recipe[] {
  if (!fs.existsSync(recipesDir)) {
    return [];
  }

  const files = fs.readdirSync(recipesDir).filter((file) => file.endsWith('.json'));

  return files.map((file) => {
    const filePath = path.join(recipesDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(fileContent) as unknown;

    if (!isValidRecipe(parsed)) {
      throw new Error(`Invalid recipe schema in ${file}`);
    }

    return parsed;
  });
}
