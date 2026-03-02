import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { Recipe } from '../../recipes/types';

function isValidRecipe(value: unknown): value is Recipe {
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

export async function GET() {
  try {
    const recipesDir = path.join(process.cwd(), 'data', 'recipes');
    
    // Check if recipes directory exists
    if (!fs.existsSync(recipesDir)) {
      return NextResponse.json([]);
    }

    // Read all JSON files from the recipes directory
    const files = fs.readdirSync(recipesDir).filter(file => file.endsWith('.json'));
    
    const recipes = files.map((file) => {
      const filePath = path.join(recipesDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(fileContent);

      if (!isValidRecipe(parsed)) {
        throw new Error(`Invalid recipe schema in ${file}`);
      }

      return parsed;
    });

    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Error reading recipes:', error);
    return NextResponse.json({ error: 'Failed to load recipes' }, { status: 500 });
  }
}
