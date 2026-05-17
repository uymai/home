import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isValidRecipe, loadRecipesFromDirectory } from '../lib/recipes';

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

describe('isValidRecipe', () => {
  it('accepts a complete valid recipe', () => {
    expect(isValidRecipe(VALID_RECIPE)).toBe(true);
  });

  it('accepts a valid recipe with optional notes', () => {
    expect(isValidRecipe({ ...VALID_RECIPE, notes: 'Some notes' })).toBe(true);
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
    const recipe = { ...VALID_RECIPE, [field]: undefined };
    expect(isValidRecipe(recipe)).toBe(false);
  });

  it('rejects missing servings', () => {
    expect(isValidRecipe({ ...VALID_RECIPE, servings: undefined })).toBe(false);
  });

  it('rejects servings as a string', () => {
    expect(isValidRecipe({ ...VALID_RECIPE, servings: '4' })).toBe(false);
  });

  it.each(['tags', 'ingredients', 'instructions'])('rejects missing array field: %s', (field) => {
    expect(isValidRecipe({ ...VALID_RECIPE, [field]: undefined })).toBe(false);
  });

  it.each(['tags', 'ingredients', 'instructions'])('rejects array with non-string elements: %s', (field) => {
    expect(isValidRecipe({ ...VALID_RECIPE, [field]: [42] })).toBe(false);
  });

  it('rejects missing macros', () => {
    expect(isValidRecipe({ ...VALID_RECIPE, macros: undefined })).toBe(false);
  });

  it.each(['calories', 'protein', 'carbs', 'fat'])('rejects missing macro field: %s', (field) => {
    expect(isValidRecipe({ ...VALID_RECIPE, macros: { ...VALID_RECIPE.macros, [field]: undefined } })).toBe(false);
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

  it('loads a valid recipe', () => {
    write('recipe.json', VALID_RECIPE);
    const recipes = loadRecipesFromDirectory(tmpDir);
    expect(recipes).toHaveLength(1);
    expect(recipes[0].title).toBe('Test Recipe');
  });

  it('loads multiple valid recipes', () => {
    write('a.json', { ...VALID_RECIPE, title: 'Alpha' });
    write('b.json', { ...VALID_RECIPE, title: 'Beta' });
    const recipes = loadRecipesFromDirectory(tmpDir);
    expect(recipes).toHaveLength(2);
    const titles = recipes.map((r) => r.title).sort();
    expect(titles).toEqual(['Alpha', 'Beta']);
  });

  it('throws on invalid JSON', () => {
    writeRaw('bad.json', '{ this is not valid json }');
    expect(() => loadRecipesFromDirectory(tmpDir)).toThrow();
  });

  it('throws when a required string field is missing', () => {
    write('bad.json', { ...VALID_RECIPE, title: undefined });
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

  it('throws when macros are missing', () => {
    write('bad.json', { ...VALID_RECIPE, macros: undefined });
    expect(() => loadRecipesFromDirectory(tmpDir)).toThrow(/Invalid recipe schema/);
  });

  it('throws when one valid and one malformed recipe are present', () => {
    write('good.json', VALID_RECIPE);
    write('bad.json', { title: 'Incomplete' });
    expect(() => loadRecipesFromDirectory(tmpDir)).toThrow(/Invalid recipe schema/);
  });
});
