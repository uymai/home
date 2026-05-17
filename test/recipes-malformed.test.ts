import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateRecipeSlug, isValidRecipe, loadRecipesFromDirectory } from '../lib/recipes';

const VALID_RECIPE = {
  title: 'Test Recipe',
  description: 'A test recipe',
  prepTime: '10 min',
  cookTime: '20 min',
  servings: 4,
  difficulty: 'Easy',
  tags: ['test'],
  ingredients: ['1 cup flour'],
  instructions: ['Mix it'],
  macros: { calories: 100, protein: 5, carbs: 20, fat: 2 },
};

/** Remove a key from an object, simulating a field absent from JSON. */
function without<T extends object>(obj: T, ...keys: (keyof T)[]): Omit<T, keyof T> {
  const copy = { ...obj };
  for (const key of keys) delete copy[key];
  return copy;
}

describe('generateRecipeSlug', () => {
  it('lowercases the title', () => {
    expect(generateRecipeSlug('Pasta')).toBe('pasta');
  });

  it('replaces spaces with dashes', () => {
    expect(generateRecipeSlug('chicken soup')).toBe('chicken-soup');
  });

  it('collapses multiple spaces into a single dash', () => {
    expect(generateRecipeSlug('chicken  soup')).toBe('chicken-soup');
  });

  it('strips non-alphanumeric characters', () => {
    expect(generateRecipeSlug("Steve's Chili!")).toBe('steve-s-chili');
  });

  it('strips leading and trailing dashes', () => {
    expect(generateRecipeSlug('--leading')).toBe('leading');
    expect(generateRecipeSlug('trailing--')).toBe('trailing');
  });

  it('handles a multi-word title with mixed punctuation', () => {
    expect(generateRecipeSlug('Lemon & Herb Chicken')).toBe('lemon-herb-chicken');
  });
});

describe('isValidRecipe', () => {
  it('accepts a complete valid recipe', () => {
    expect(isValidRecipe(VALID_RECIPE)).toBe(true);
  });

  it('accepts a valid recipe with optional notes', () => {
    expect(isValidRecipe({ ...VALID_RECIPE, notes: 'Some notes' })).toBe(true);
  });

  it('accepts empty tags', () => {
    expect(isValidRecipe({ ...VALID_RECIPE, tags: [] })).toBe(true);
  });

  it('rejects null', () => {
    expect(isValidRecipe(null)).toBe(false);
  });

  it('rejects a non-object', () => {
    expect(isValidRecipe('string')).toBe(false);
    expect(isValidRecipe(42)).toBe(false);
    expect(isValidRecipe([])).toBe(false);
  });

  it.each([
    'title', 'description', 'prepTime', 'cookTime', 'difficulty',
  ])('rejects missing string field: %s', (field) => {
    expect(isValidRecipe(without(VALID_RECIPE, field as keyof typeof VALID_RECIPE))).toBe(false);
  });

  it('rejects missing servings', () => {
    expect(isValidRecipe(without(VALID_RECIPE, 'servings'))).toBe(false);
  });

  it('rejects servings as a string', () => {
    expect(isValidRecipe({ ...VALID_RECIPE, servings: '4' })).toBe(false);
  });

  it.each(['tags', 'ingredients', 'instructions'])('rejects missing array field: %s', (field) => {
    expect(isValidRecipe(without(VALID_RECIPE, field as keyof typeof VALID_RECIPE))).toBe(false);
  });

  it.each(['tags', 'ingredients', 'instructions'])('rejects array with non-string elements: %s', (field) => {
    expect(isValidRecipe({ ...VALID_RECIPE, [field]: [42] })).toBe(false);
  });

  it('rejects empty ingredients', () => {
    expect(isValidRecipe({ ...VALID_RECIPE, ingredients: [] })).toBe(false);
  });

  it('rejects empty instructions', () => {
    expect(isValidRecipe({ ...VALID_RECIPE, instructions: [] })).toBe(false);
  });

  it('rejects missing macros', () => {
    expect(isValidRecipe(without(VALID_RECIPE, 'macros'))).toBe(false);
  });

  it.each(['calories', 'protein', 'carbs', 'fat'])('rejects missing macro field: %s', (field) => {
    expect(isValidRecipe({ ...VALID_RECIPE, macros: without(VALID_RECIPE.macros, field as keyof typeof VALID_RECIPE.macros) })).toBe(false);
  });

  it.each(['calories', 'protein', 'carbs', 'fat'])('rejects macro field as a string: %s', (field) => {
    expect(isValidRecipe({ ...VALID_RECIPE, macros: { ...VALID_RECIPE.macros, [field]: '100' } })).toBe(false);
  });

  it('rejects notes as a non-string', () => {
    expect(isValidRecipe({ ...VALID_RECIPE, notes: 42 })).toBe(false);
  });
});

describe('loadRecipesFromDirectory', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'recipes-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  const write = (filename: string, content: unknown) =>
    fs.writeFileSync(path.join(tmpDir, filename), JSON.stringify(content), 'utf8');

  const writeRaw = (filename: string, content: string) =>
    fs.writeFileSync(path.join(tmpDir, filename), content, 'utf8');

  it('returns empty array for non-existent directory', () => {
    expect(loadRecipesFromDirectory('/does/not/exist')).toEqual([]);
  });

  it('returns empty array for empty directory', () => {
    expect(loadRecipesFromDirectory(tmpDir)).toEqual([]);
  });

  it('ignores non-JSON files', () => {
    fs.writeFileSync(path.join(tmpDir, 'readme.txt'), 'hello');
    fs.writeFileSync(path.join(tmpDir, 'recipe.yaml'), 'title: foo');
    expect(loadRecipesFromDirectory(tmpDir)).toEqual([]);
  });

  it('loads a valid recipe and returns all fields', () => {
    write('recipe.json', VALID_RECIPE);
    const recipes = loadRecipesFromDirectory(tmpDir);
    expect(recipes).toHaveLength(1);
    expect(recipes[0]).toEqual(VALID_RECIPE);
  });

  it('loads multiple valid recipes', () => {
    const alpha = { ...VALID_RECIPE, title: 'Alpha' };
    const beta = { ...VALID_RECIPE, title: 'Beta' };
    write('a.json', alpha);
    write('b.json', beta);
    const recipes = loadRecipesFromDirectory(tmpDir);
    expect(recipes).toHaveLength(2);
    const sorted = [...recipes].sort((a, b) => a.title.localeCompare(b.title));
    expect(sorted[0]).toEqual(alpha);
    expect(sorted[1]).toEqual(beta);
  });

  it('throws on invalid JSON', () => {
    writeRaw('bad.json', '{ this is not valid json }');
    expect(() => loadRecipesFromDirectory(tmpDir)).toThrow();
  });

  it('throws when a required string field is missing', () => {
    write('bad.json', without(VALID_RECIPE, 'title'));
    expect(() => loadRecipesFromDirectory(tmpDir)).toThrow(/Invalid recipe schema/);
  });

  it('throws when servings is the wrong type', () => {
    write('bad.json', { ...VALID_RECIPE, servings: 'four' });
    expect(() => loadRecipesFromDirectory(tmpDir)).toThrow(/Invalid recipe schema/);
  });

  it('throws when an array field contains non-strings', () => {
    write('bad.json', { ...VALID_RECIPE, ingredients: [1, 2, 3] });
    expect(() => loadRecipesFromDirectory(tmpDir)).toThrow(/Invalid recipe schema/);
  });

  it('throws when ingredients is empty', () => {
    write('bad.json', { ...VALID_RECIPE, ingredients: [] });
    expect(() => loadRecipesFromDirectory(tmpDir)).toThrow(/Invalid recipe schema/);
  });

  it('throws when instructions is empty', () => {
    write('bad.json', { ...VALID_RECIPE, instructions: [] });
    expect(() => loadRecipesFromDirectory(tmpDir)).toThrow(/Invalid recipe schema/);
  });

  it('throws when macros are missing', () => {
    write('bad.json', without(VALID_RECIPE, 'macros'));
    expect(() => loadRecipesFromDirectory(tmpDir)).toThrow(/Invalid recipe schema/);
  });

  it('throws when one valid and one malformed recipe are present', () => {
    write('good.json', VALID_RECIPE);
    write('bad.json', { title: 'Incomplete' });
    expect(() => loadRecipesFromDirectory(tmpDir)).toThrow(/Invalid recipe schema/);
  });
});
