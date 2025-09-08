'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface Recipe {
  title: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  difficulty: string;
  tags: string[];
  ingredients: string[];
  instructions: string[];
  notes?: string;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load recipes from the data directory
    const loadRecipes = async () => {
      try {
        const response = await fetch('/api/recipes');
        if (response.ok) {
          const data = await response.json();
          setRecipes(data);
        }
      } catch (error) {
        console.error('Error loading recipes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecipes();
  }, []);

  // Get all unique tags for filtering
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    recipes.forEach(recipe => {
      recipe.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [recipes]);

  // Filter recipes based on search term and selected tag
  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      const matchesSearch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           recipe.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesTag = !selectedTag || recipe.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [recipes, searchTerm, selectedTag]);

  // Get random recipe for featured display
  const randomRecipe = useMemo(() => {
    if (filteredRecipes.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * filteredRecipes.length);
    return filteredRecipes[randomIndex];
  }, [filteredRecipes]);

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 sm:p-12 max-w-6xl mx-auto">
        <Header title="Recipes" subtitle="Discover delicious recipes" />
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading recipes...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 sm:p-12 max-w-6xl mx-auto">
      <Header title="Recipes" subtitle="Discover delicious recipes from my collection" />
      
      {/* Search and Filter Controls */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search recipes, ingredients, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>
                  {tag.charAt(0).toUpperCase() + tag.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag('')}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedTag === '' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {allTags.slice(0, 8).map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedTag === tag 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {tag.charAt(0).toUpperCase() + tag.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Random Recipe Feature */}
      {randomRecipe && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Recipe of the Moment</h2>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl p-8 border border-blue-200 dark:border-blue-800">
            <div className="text-center mb-6">
              <h3 className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                {randomRecipe.title}
              </h3>
              <p className="text-lg text-blue-700 dark:text-blue-300 mb-4">
                {randomRecipe.description}
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-blue-600 dark:text-blue-400">
                <span>⏱️ {randomRecipe.prepTime}</span>
                <span>🔥 {randomRecipe.cookTime}</span>
                <span>👥 {randomRecipe.servings} servings</span>
                <span>📊 {randomRecipe.difficulty}</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {randomRecipe.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                >
                  {tag.charAt(0).toUpperCase() + tag.slice(1).replace('-', ' ')}
                </span>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Ingredients</h4>
                <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                  {randomRecipe.ingredients.slice(0, 6).map((ingredient, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{ingredient}</span>
                    </li>
                  ))}
                  {randomRecipe.ingredients.length > 6 && (
                    <li className="text-blue-600 dark:text-blue-400 italic">
                      +{randomRecipe.ingredients.length - 6} more ingredients
                    </li>
                  )}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Instructions</h4>
                <ol className="space-y-2 text-blue-800 dark:text-blue-200">
                  {randomRecipe.instructions.slice(0, 4).map((instruction, index) => (
                    <li key={index} className="flex">
                      <span className="mr-2 font-semibold">{index + 1}.</span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                  {randomRecipe.instructions.length > 4 && (
                    <li className="text-blue-600 dark:text-blue-400 italic">
                      +{randomRecipe.instructions.length - 4} more steps
                    </li>
                  )}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">
          {filteredRecipes.length === recipes.length 
            ? `All Recipes (${recipes.length})` 
            : `Search Results (${filteredRecipes.length} of ${recipes.length})`
          }
        </h2>
        
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No recipes found matching your search criteria.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedTag('');
              }}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe, index) => (
              <RecipeCard key={index} recipe={recipe} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
          {recipe.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
          {recipe.description}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {recipe.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs"
            >
              {tag.charAt(0).toUpperCase() + tag.slice(1).replace('-', ' ')}
            </span>
          ))}
          {recipe.tags.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs">
              +{recipe.tags.length - 3}
            </span>
          )}
        </div>
        
        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <span>⏱️ {recipe.prepTime}</span>
          <span>🔥 {recipe.cookTime}</span>
          <span>👥 {recipe.servings}</span>
          <span>📊 {recipe.difficulty}</span>
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-2">
            <strong>Ingredients:</strong> {recipe.ingredients.length} items
          </p>
          <p>
            <strong>Instructions:</strong> {recipe.instructions.length} steps
          </p>
        </div>
      </div>
    </div>
  );
}
