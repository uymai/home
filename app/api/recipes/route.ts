import { NextResponse } from 'next/server';
import path from 'path';
import { loadRecipesFromDirectory } from '../../../lib/recipes';

export async function GET() {
  try {
    const recipesDir = path.join(process.cwd(), 'data', 'recipes');
    const recipes = loadRecipesFromDirectory(recipesDir);

    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Error reading recipes:', error);
    return NextResponse.json({ error: 'Failed to load recipes' }, { status: 500 });
  }
}
