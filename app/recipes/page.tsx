'use client';

import { useState, useEffect, useMemo, Suspense, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import type { Recipe } from './types';

type WakeLockSentinelLike = {
  addEventListener?: (type: 'release', listener: () => void) => void;
  onrelease?: (() => void) | null;
  release?: () => Promise<void>;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
};

function RecipesContent() {
  const searchParams = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Pinned recipes for cook mode
  const [pinnedRecipes, setPinnedRecipes] = useState<Recipe[]>([]);
  const touchStartX = useRef<number>(0);
  const [animPhase, setAnimPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const [animDir, setAnimDir] = useState<'left' | 'right'>('left');

  // Screen Wake Lock state
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  // wakeLockActive reflects the actual acquired state; stayOnEnabled is the user's intent
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [stayOnEnabled, setStayOnEnabled] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);

  const requestWakeLock = useCallback(async () => {
    if (!wakeLockSupported || wakeLockRef.current) return;
    try {
      // Wake Lock can only be acquired while the document is visible
      if (document.visibilityState !== 'visible') return;
      const sentinel = await (navigator as NavigatorWithWakeLock).wakeLock?.request('screen');
      if (!sentinel) {
        return;
      }
      wakeLockRef.current = sentinel;
      setWakeLockActive(true);
      // When released (by system or manual), update state
      const onRelease = () => {
        wakeLockRef.current = null;
        setWakeLockActive(false);
        // Do NOT change stayOnEnabled here; if user wanted it, we'll re-acquire on visibility
      };
      // Support both listener styles across browsers
      sentinel.addEventListener?.('release', onRelease);
      sentinel.onrelease = onRelease;
    } catch (err) {
      console.error('Failed to acquire wake lock:', err);
      // Keep state in sync
      wakeLockRef.current = null;
      setWakeLockActive(false);
      // Visible feedback for users if their browser blocks it
      // Avoid blocking alert as it may disrupt user gesture; fall back to subtle console error
    }
  }, [wakeLockSupported]);

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

  // Detect Wake Lock API support and set up listeners
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      try {
        // Some browsers require secure context; feature detect safely
        const supported = Boolean((navigator as NavigatorWithWakeLock).wakeLock?.request);
        setWakeLockSupported(supported);
      } catch {
        setWakeLockSupported(false);
      }
    }

    const onVisibility = () => {
      // Only (re)acquire when user asked to keep screen on and page is visible
      if (document.visibilityState === 'visible' && stayOnEnabled && !wakeLockRef.current) {
        void requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      // Ensure we release on unmount
      if (wakeLockRef.current) {
        wakeLockRef.current.release?.().catch(() => {}).finally(() => {
          wakeLockRef.current = null;
        });
      }
    };
  }, [requestWakeLock, stayOnEnabled]);

  // Handle URL parameters for direct recipe linking
  useEffect(() => {
    const recipeParam = searchParams.get('recipe');
    if (recipeParam && recipes.length > 0) {
      // Find recipe by the same slug format used for share links
      const recipe = recipes.find(r =>
        recipeParam === generateRecipeSlug(r.title)
      );
      if (recipe) {
        setSelectedRecipe(recipe);
      }
    }
  }, [searchParams, recipes]);

  // Derived pinned-view state
  const currentPinnedIndex = selectedRecipe
    ? pinnedRecipes.findIndex(r => r.title === selectedRecipe.title)
    : -1;
  const isInPinnedView = currentPinnedIndex !== -1 && pinnedRecipes.length > 1;

  const navigatePinned = useCallback((dir: 'prev' | 'next') => {
    if (animPhase !== 'idle') return;
    const idx = pinnedRecipes.findIndex(r => r.title === selectedRecipe!.title);
    const nextIdx = dir === 'next'
      ? (idx + 1) % pinnedRecipes.length
      : (idx - 1 + pinnedRecipes.length) % pinnedRecipes.length;
    const nextRecipe = pinnedRecipes[nextIdx];
    const swipeDir = dir === 'next' ? 'left' : 'right';
    setAnimDir(swipeDir);
    setAnimPhase('exit');
    setTimeout(() => {
      setSelectedRecipe(nextRecipe);
      setAnimPhase('enter');
      setTimeout(() => setAnimPhase('idle'), 220);
    }, 160);
  }, [selectedRecipe, pinnedRecipes, animPhase]);

  // Handle escape key to close modal and arrow keys for pinned navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedRecipe(null);
      }
      if (isInPinnedView) {
        if (e.key === 'ArrowRight') navigatePinned('next');
        if (e.key === 'ArrowLeft') navigatePinned('prev');
      }
    };

    if (selectedRecipe) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedRecipe, isInPinnedView, navigatePinned]);

  // Release wake lock when modal closes
  useEffect(() => {
    if (!selectedRecipe && (wakeLockActive || stayOnEnabled)) {
      // When closing the modal, disable the user's intent and release if needed
      setStayOnEnabled(false);
      if (wakeLockRef.current) {
        wakeLockRef.current.release?.().catch(() => {}).finally(() => {
          wakeLockRef.current = null;
          setWakeLockActive(false);
        });
      } else {
        setWakeLockActive(false);
      }
    }
  }, [selectedRecipe, wakeLockActive, stayOnEnabled]);

  const releaseWakeLock = async () => {
    try {
      await wakeLockRef.current?.release?.();
    } catch {}
    finally {
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  };

  const toggleWakeLock = async () => {
    if (!wakeLockSupported) {
      return; // Button is disabled when unsupported
    }
    // Toggle user's intent first
    const next = !stayOnEnabled;
    setStayOnEnabled(next);
    if (next) {
      await requestWakeLock();
    } else {
      await releaseWakeLock();
    }
  };

  const togglePin = useCallback((recipe: Recipe) => {
    setPinnedRecipes(prev => {
      const already = prev.some(r => r.title === recipe.title);
      return already ? prev.filter(r => r.title !== recipe.title) : [...prev, recipe];
    });
  }, []);

  const isPinned = useCallback((recipe: Recipe) =>
    pinnedRecipes.some(r => r.title === recipe.title), [pinnedRecipes]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (isInPinnedView && Math.abs(delta) > 50) {
      navigatePinned(delta < 0 ? 'next' : 'prev');
    }
  };

  const getSwipeStyle = (): React.CSSProperties => {
    if (animPhase === 'exit') {
      return {
        transform: animDir === 'left' ? 'translateX(-48px)' : 'translateX(48px)',
        opacity: 0,
        transition: 'transform 160ms ease, opacity 160ms ease',
      };
    }
    if (animPhase === 'enter') {
      return {
        animation: animDir === 'left'
          ? 'recipe-slide-in-from-right 220ms ease forwards'
          : 'recipe-slide-in-from-left 220ms ease forwards',
      };
    }
    return {};
  };

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
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return recipes.filter(recipe => {
      const matchesSearch = normalizedSearchTerm === '' ||
                           recipe.title.toLowerCase().includes(normalizedSearchTerm) ||
                           recipe.description.toLowerCase().includes(normalizedSearchTerm) ||
                           recipe.tags.some(tag => tag.toLowerCase().includes(normalizedSearchTerm));
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

  // Generate URL-friendly slug from recipe title
  const generateRecipeSlug = (title: string) => {
    return title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Generate shareable URL for a recipe
  const getRecipeUrl = (recipe: Recipe) => {
    const slug = generateRecipeSlug(recipe.title);
    return `${window.location.origin}/recipes?recipe=${slug}`;
  };

  const formatRecipeMarkdown = (recipe: Recipe) => {
    const tags = recipe.tags.map((tag) => `\`${tag}\``).join(', ');

    return [
      `# ${recipe.title}`,
      '',
      recipe.description,
      '',
      `- Prep: ${recipe.prepTime}`,
      `- Cook: ${recipe.cookTime}`,
      `- Serves: ${recipe.servings}`,
      `- Difficulty: ${recipe.difficulty}`,
      '',
      '## Macros (per serving)',
      '',
      `- Calories: ${recipe.macros.calories}`,
      `- Protein: ${recipe.macros.protein}g`,
      `- Carbs: ${recipe.macros.carbs}g`,
      `- Fat: ${recipe.macros.fat}g`,
      '',
      '## Tags',
      '',
      tags,
      '',
      '## Ingredients',
      '',
      ...recipe.ingredients.map((ingredient) => `- ${ingredient}`),
      '',
      '## Instructions',
      '',
      ...recipe.instructions.map((instruction, index) => `${index + 1}. ${instruction}`),
      ...(recipe.notes
        ? [
            '',
            '## Notes',
            '',
            recipe.notes,
          ]
        : []),
    ].join('\n');
  };

  // Copy recipe URL to clipboard
  const copyRecipeUrl = async (recipe: Recipe) => {
    try {
      const url = getRecipeUrl(recipe);
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
      alert('Recipe link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const copyRecipeMarkdown = async (recipe: Recipe) => {
    try {
      await navigator.clipboard.writeText(formatRecipeMarkdown(recipe));
      alert('Recipe copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy recipe:', err);
    }
  };

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
    <div className={`min-h-screen p-8 sm:p-12 max-w-6xl mx-auto${pinnedRecipes.length > 0 ? ' pb-24' : ''}`}>
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
          <div
            className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl p-8 border border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
            onClick={() => setSelectedRecipe(randomRecipe)}
          >
            <div className="text-center mb-6">
              <h3 className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                {randomRecipe.title}
              </h3>
              <p className="text-lg text-blue-700 dark:text-blue-300 mb-4">
                {randomRecipe.description}
              </p>
              <div className="flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                <span>Click to view full recipe</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
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
              <RecipeCard
                key={index}
                recipe={recipe}
                onClick={() => setSelectedRecipe(recipe)}
                onShare={copyRecipeUrl}
                isPinned={isPinned(recipe)}
                onPin={togglePin}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />

      {/* Pinned recipes sticky bar */}
      {pinnedRecipes.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between shadow-lg z-40">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-amber-500 shrink-0">📌</span>
            <span className="font-medium text-sm shrink-0">
              {pinnedRecipes.length} pinned
            </span>
            <span className="hidden sm:inline text-gray-500 dark:text-gray-400 text-xs truncate">
              {pinnedRecipes.map(r => r.title).join(' · ')}
            </span>
          </div>
          <div className="flex gap-2 shrink-0 ml-3">
            <button
              onClick={() => setPinnedRecipes([])}
              className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setSelectedRecipe(pinnedRecipes[0])}
              className="px-4 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
            >
              Start Cooking →
            </button>
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {selectedRecipe && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedRecipe(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Pinned navigation strip — outside animated div so it stays stable */}
            {isInPinnedView && (
              <div className="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                <button
                  onClick={() => navigatePinned('prev')}
                  disabled={animPhase !== 'idle'}
                  className="px-3 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span className="font-medium">
                  {currentPinnedIndex + 1} / {pinnedRecipes.length}
                </span>
                <button
                  onClick={() => navigatePinned('next')}
                  disabled={animPhase !== 'idle'}
                  className="px-3 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-40"
                >
                  Next →
                </button>
                <span className="hidden sm:inline text-xs opacity-60">swipe or ←→ keys</span>
              </div>
            )}
            <div className="p-6 overflow-hidden">
            <div style={getSwipeStyle()}>

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedRecipe.title}
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                    {selectedRecipe.description}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>⏱️ Prep: {selectedRecipe.prepTime}</span>
                    <span>🔥 Cook: {selectedRecipe.cookTime}</span>
                    <span>👥 Serves: {selectedRecipe.servings}</span>
                    <span>📊 {selectedRecipe.difficulty}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <button
                    onClick={() => togglePin(selectedRecipe)}
                    className={`px-3 py-1 rounded-lg transition-colors text-sm flex items-center gap-1 border font-medium ${
                      isPinned(selectedRecipe)
                        ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                        : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                    title={isPinned(selectedRecipe) ? 'Remove from cook list' : 'Add to cook list'}
                  >
                    📌 {isPinned(selectedRecipe) ? 'Pinned' : 'Pin'}
                  </button>
                  <button
                    onClick={toggleWakeLock}
                    disabled={!wakeLockSupported}
                    aria-pressed={stayOnEnabled}
                    className={`px-3 py-1 rounded-lg transition-colors text-sm flex items-center gap-2 border font-medium ${stayOnEnabled ? 'bg-green-600 text-white border-green-700 hover:bg-green-700' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'} ${!wakeLockSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={wakeLockSupported ? (stayOnEnabled ? 'Screen will attempt to stay on. Click to turn off.' : 'Prevent screen from sleeping while viewing this recipe') : 'Not supported on this device/browser'}
                  >
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${stayOnEnabled ? 'bg-white' : 'bg-gray-400 dark:bg-gray-300'}`} aria-hidden="true"></span>
                    <span className="text-sm tracking-wide">{wakeLockSupported ? (stayOnEnabled ? 'Stay On: ON' : 'Stay On: OFF') : 'Stay On: N/A'}</span>
                  </button>
                  <button
                    onClick={() => copyRecipeUrl(selectedRecipe)}
                    className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center gap-1"
                    title="Copy recipe link"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    Copy Link
                  </button>
                  <button
                    onClick={() => copyRecipeMarkdown(selectedRecipe)}
                    className="px-3 py-1 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm"
                    title="Copy recipe as Markdown"
                  >
                    Copy Recipe
                  </button>
                  <button
                    onClick={() => setSelectedRecipe(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="mb-6 border-t border-gray-200 pt-4 dark:border-gray-700">
                <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                  Macros (per serving)
                </h3>
                <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-gray-900 dark:text-white">Calories:</span> {selectedRecipe.macros.calories}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-gray-900 dark:text-white">Protein:</span> {selectedRecipe.macros.protein}g
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-gray-900 dark:text-white">Carbs:</span> {selectedRecipe.macros.carbs}g
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-gray-900 dark:text-white">Fat:</span> {selectedRecipe.macros.fat}g
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {selectedRecipe.tags.map(tag => (
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
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Ingredients</h3>
                  <ul className="space-y-2">
                    {selectedRecipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-start text-gray-700 dark:text-gray-300">
                        <span className="mr-2 text-blue-500">•</span>
                        <span>{ingredient}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Instructions</h3>
                  <ol className="space-y-3">
                    {selectedRecipe.instructions.map((instruction, index) => (
                      <li key={index} className="flex text-gray-700 dark:text-gray-300">
                        <span className="mr-3 font-semibold text-blue-500 min-w-[2rem]">{index + 1}.</span>
                        <span>{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {selectedRecipe.notes && (
                <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Notes</h4>
                  <p className="text-yellow-700 dark:text-yellow-300">{selectedRecipe.notes}</p>
                </div>
              )}
            </div>{/* end swipe-animated div */}
            </div>{/* end p-6 overflow-hidden */}
          </div>
        </div>
      )}
    </div>
  );
}

function RecipeCard({ recipe, onClick, onShare, isPinned, onPin }: {
  recipe: Recipe;
  onClick: () => void;
  onShare: (recipe: Recipe) => void;
  isPinned: boolean;
  onPin: (recipe: Recipe) => void;
}) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200 dark:border-gray-700 overflow-hidden hover:scale-105"
      onClick={onClick}
    >
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

        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          <p className="mb-2">
            <strong>Ingredients:</strong> {recipe.ingredients.length} items
          </p>
          <p>
            <strong>Instructions:</strong> {recipe.instructions.length} steps
          </p>
        </div>

        <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-sm font-medium">
          <span>View Full Recipe</span>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPin(recipe);
              }}
              className={`p-1 rounded transition-colors ${isPinned ? 'text-amber-500 hover:text-amber-600' : 'text-gray-400 hover:text-amber-400'}`}
              title={isPinned ? 'Unpin recipe' : 'Pin recipe for cooking'}
            >
              📌
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(recipe);
              }}
              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
              title="Share recipe"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecipesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen p-8 sm:p-12 max-w-6xl mx-auto">
        <Header title="Recipes" subtitle="Discover delicious recipes" />
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading recipes...</p>
        </div>
        <Footer />
      </div>
    }>
      <RecipesContent />
    </Suspense>
  );
}
