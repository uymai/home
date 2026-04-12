import { NextResponse } from 'next/server';
import path from 'path';
import { loadRecipesFromDirectory, generateRecipeSlug } from '../../../lib/recipes';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    const recipesDir = path.join(process.cwd(), 'data', 'recipes');
    const recipes = loadRecipesFromDirectory(recipesDir);
    const recipesWithSlugs = recipes.map(recipe => ({
      ...recipe,
      slug: generateRecipeSlug(recipe.title),
    }));

    return NextResponse.json(recipesWithSlugs, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error reading recipes:', error);
    return NextResponse.json({ error: 'Failed to load recipes' }, { status: 500, headers: CORS_HEADERS });
  }
}
