import path from 'path';
import { describe, expect, it } from 'vitest';

import { loadRecipesFromDirectory } from '../lib/recipes';

const recipesDir = path.join(process.cwd(), 'data', 'recipes');

describe('recipe JSON loading', () => {
  it('loads every recipe JSON through the shared recipe loader', () => {
    const recipes = loadRecipesFromDirectory(recipesDir);

    expect(recipes).toHaveLength(33);
  });

  it('returns the fields used by the recipe page for every recipe', () => {
    const recipes = loadRecipesFromDirectory(recipesDir);

    for (const recipe of recipes) {
      expect(recipe.title).toEqual(expect.any(String));
      expect(recipe.description).toEqual(expect.any(String));
      expect(recipe.prepTime).toEqual(expect.any(String));
      expect(recipe.cookTime).toEqual(expect.any(String));
      expect(recipe.servings).toEqual(expect.any(Number));
      expect(recipe.difficulty).toEqual(expect.any(String));
      expect(recipe.tags).toEqual(expect.any(Array));
      expect(recipe.ingredients).toEqual(expect.any(Array));
      expect(recipe.instructions).toEqual(expect.any(Array));
      expect(recipe.macros.calories).toEqual(expect.any(Number));
      expect(recipe.macros.protein).toEqual(expect.any(Number));
      expect(recipe.macros.carbs).toEqual(expect.any(Number));
      expect(recipe.macros.fat).toEqual(expect.any(Number));
    }
  });
});
