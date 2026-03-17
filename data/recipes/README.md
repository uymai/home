# Recipes Collection

This directory contains recipe files in JSON format. Each recipe file should follow the structure defined below.

## Recipe File Structure

Each recipe should be a JSON file with the following structure:

```json
{
  "title": "Recipe Name",
  "description": "Brief description of the recipe",
  "prepTime": "X minutes",
  "cookTime": "X minutes", 
  "servings": 4,
  "difficulty": "Easy|Medium|Hard",
  "tags": ["tag1", "tag2", "tag3"],
  "ingredients": [
    "ingredient 1",
    "ingredient 2"
  ],
  "instructions": [
    "Step 1",
    "Step 2"
  ],
  "macros": {
    "calories": 420,
    "protein": 32,
    "carbs": 28,
    "fat": 14
  },
  "notes": "Optional cooking notes or tips"
}
```

Macro values are numeric and represent one serving of the recipe. In this collection, some values are estimated from the listed ingredients when exact nutrition labels are not available.

## Adding New Recipes

1. Create a new JSON file in this directory
2. Use kebab-case for the filename (e.g., `chicken-parmesan.json`)
3. Follow the JSON structure above
4. Use descriptive tags for better searchability
5. Commit the file to the repository

## Tags

Common tags used in recipes:
- `quick` - Quick to prepare
- `easy` - Easy difficulty
- `vegetarian` - Vegetarian recipe
- `vegan` - Vegan recipe
- `gluten-free` - Gluten-free recipe
- `comfort-food` - Comfort food
- `healthy` - Healthy recipe
- `dessert` - Dessert recipe
- `breakfast` - Breakfast recipe
- `lunch` - Lunch recipe
- `dinner` - Dinner recipe
- `snack` - Snack recipe
- `italian` - Italian cuisine
- `asian` - Asian cuisine
- `mexican` - Mexican cuisine
- `baking` - Baking recipe
- `grilled` - Grilled recipe
- `make-ahead` - Can be prepared ahead of time
- `family-favorite` - Family favorite recipe
