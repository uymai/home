import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const recipesDir = path.join(process.cwd(), 'data', 'recipes');
    
    // Check if recipes directory exists
    if (!fs.existsSync(recipesDir)) {
      return NextResponse.json([]);
    }

    // Read all JSON files from the recipes directory
    const files = fs.readdirSync(recipesDir).filter(file => file.endsWith('.json'));
    
    const recipes = files.map(file => {
      const filePath = path.join(recipesDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent);
    });

    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Error reading recipes:', error);
    return NextResponse.json({ error: 'Failed to load recipes' }, { status: 500 });
  }
}
