const fs = require('fs');
const path = require('path');

function isValidRecipe(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const recipe = value;

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

function loadRecipesFromDirectory(recipesDir) {
  if (!fs.existsSync(recipesDir)) {
    return [];
  }

  const files = fs.readdirSync(recipesDir).filter((file) => file.endsWith('.json'));

  return files.map((file) => {
    const filePath = path.join(recipesDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(fileContent);

    if (!isValidRecipe(parsed)) {
      throw new Error(`Invalid recipe schema in ${file}`);
    }

    return parsed;
  });
}

module.exports = {
  isValidRecipe,
  loadRecipesFromDirectory,
};
